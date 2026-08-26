import { and, desc, eq, gte, ilike, lte, sql } from "drizzle-orm";

import { db } from "../../db/connection.js";
import { attendance } from "../../db/schema/attendance.js";
import { companies } from "../../db/schema/companies.js";
import { departments } from "../../db/schema/departments.js";

import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { AppError } from "../../utils/app-error.js";
import { users } from "../../db/schema/users.js";
import { hashPassword } from "../../utils/password.js";
import {
  normalizeEmail,
  normalizeEmployeeId,
} from "../../utils/normalization.js";
import type { CreateAdminInput } from "./master-admin.schema.js";
import {
  getDateInTimeZone,
  getMonthBoundaries,
  getWeekBoundaries,
  getYearBoundaries,
  validateDateFormat,
  validateMonthFormat,
  validateYearFormat,
  formatTimeOnly,
} from "../../utils/date.js";
import { escapeCSVValue, generateCSVRow } from "../../utils/csv.js";
type AuthUser = NonNullable<AuthRequest["user"]>;

export async function createAdmin(
  authUser: AuthUser,
  input: CreateAdminInput
) {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  const normalizedEmail = normalizeEmail(input.email);
  const normalizedEmployeeId = normalizeEmployeeId(input.employeeId);

  const [department] = await db
    .select({
      id: departments.id,
    })
    .from(departments)
    .where(
      and(
        eq(departments.id, input.departmentId),
        eq(departments.companyId, authUser.companyId),
        eq(departments.isActive, true)
      )
    )
    .limit(1);

  if (!department) {
    throw new AppError(404, "Department not found");
  }

  // Check if an admin already exists for the same Company ID + Department
  const [existingAdmin] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(
      and(
        eq(users.companyId, authUser.companyId),
        eq(users.departmentId, input.departmentId),
        eq(users.role, "ADMIN")
      )
    )
    .limit(1);

  if (existingAdmin) {
    throw new AppError(409, "An Admin already exists for this Company ID and Department.");
  }

  const [existingUser] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUser) {
    throw new AppError(409, "Email already registered");
  }

  const [existingEmployee] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(
      and(
        eq(users.companyId, authUser.companyId),
        ilike(users.employeeId, normalizedEmployeeId)
      )
    )
    .limit(1);

  if (existingEmployee) {
    throw new AppError(409, "Admin ID already exists in this ILKKM.");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const [admin] = await db
      .insert(users)
      .values({
        companyId: authUser.companyId,
        employeeId: normalizedEmployeeId,
        name: input.name.trim(),
        email: normalizedEmail,
        phone: input.phone,
        passwordHash,
        role: "ADMIN",
        departmentId: input.departmentId,
        designation: input.designation,
        status: "APPROVED",
      })
      .returning({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
        email: users.email,
        role: users.role,
        departmentId: users.departmentId,
        status: users.status,
      });

    return admin;
  } catch (error: any) {
    if (
      error?.code === '23505' ||
      error?.cause?.code === '23505'
    ) {
      const constraint =
        error?.constraint_name ||
        error?.cause?.constraint_name ||
        '';

      if (constraint.includes('users_company_employee_unique')) {
        throw new AppError(409, "Admin ID already exists in this ILKKM.");
      }

      if (constraint.includes('users_email_unique')) {
        throw new AppError(409, "Email already registered");
      }

      throw new AppError(409, "Email or Admin ID already exists");
    }

    throw error;
  }
}

export async function getDepartments(
  authUser: AuthUser
) {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  return db
    .select({
      id: departments.id,
      name: departments.name,
      code: departments.code,
      isActive: departments.isActive,
    })
    .from(departments)
    .where(
      eq(departments.companyId, authUser.companyId)
    );
}

export async function getAdmins(
  authUser: AuthUser
) {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  return db
    .select({
      id: users.id,
      employeeId: users.employeeId,
      name: users.name,
      email: users.email,
      phone: users.phone,
      departmentId: users.departmentId,
      designation: users.designation,
      status: users.status,
    })
    .from(users)
    .where(
      and(
        eq(users.companyId, authUser.companyId),
        eq(users.role, "ADMIN")
      )
    );
}

export async function deleteDepartment(
  authUser: AuthUser,
  departmentId: string
) {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  try {
    const [deleted] = await db
      .delete(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          eq(departments.companyId, authUser.companyId)
        )
      )
      .returning({ id: departments.id });

    if (!deleted) {
      throw new AppError(404, "Department not found");
    }

    return { success: true };
  } catch (error: any) {
    if (error?.code === '23503' || error?.cause?.code === '23503') {
      throw new AppError(
        409,
        "This department cannot be deleted because it is currently assigned to users"
      );
    }
    throw error;
  }
}

export async function deleteAdmin(
  authUser: AuthUser,
  userId: string
) {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  const [admin] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.companyId, authUser.companyId)
      )
    )
    .limit(1);

  if (!admin) {
    throw new AppError(404, "Admin not found");
  }

  if (admin.role !== "ADMIN") {
    throw new AppError(403, "Only ADMIN users can be deleted");
  }

  try {
    const [deleted] = await db
      .delete(users)
      .where(
        and(
          eq(users.id, userId),
          eq(users.companyId, authUser.companyId),
          eq(users.role, "ADMIN")
        )
      )
      .returning({ id: users.id });

    if (!deleted) {
      throw new AppError(404, "Admin not found");
    }

    return { success: true };
  } catch (error: any) {
    if (error?.code === '23503' || error?.cause?.code === '23503') {
      throw new AppError(
        409,
        "This admin cannot be deleted because they have attendance or other records"
      );
    }
    throw error;
  }
}

export async function activateAdmin(
  authUser: AuthUser,
  userId: string
) {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  const [admin] = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.companyId, authUser.companyId)
      )
    )
    .limit(1);

  if (!admin) {
    throw new AppError(404, "Admin not found");
  }

  if (admin.role !== "ADMIN") {
    throw new AppError(403, "Only ADMIN users can be activated");
  }

  if (admin.status === "APPROVED") {
    throw new AppError(400, "Admin is already approved");
  }

  const [updated] = await db
    .update(users)
    .set({ status: "APPROVED", updatedAt: new Date() })
    .where(
      and(
        eq(users.id, userId),
        eq(users.companyId, authUser.companyId),
        eq(users.role, "ADMIN")
      )
    )
    .returning({ id: users.id });

  if (!updated) {
    throw new AppError(404, "Admin not found");
  }

  return { success: true, id: updated.id };
}

export async function deactivateAdmin(
  authUser: AuthUser,
  userId: string
) {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  const [admin] = await db
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(
      and(
        eq(users.id, userId),
        eq(users.companyId, authUser.companyId)
      )
    )
    .limit(1);

  if (!admin) {
    throw new AppError(404, "Admin not found");
  }

  if (admin.role !== "ADMIN") {
    throw new AppError(403, "Only ADMIN users can be deactivated");
  }

  if (admin.status === "DISABLED") {
    throw new AppError(400, "Admin is already disabled");
  }

  const [updated] = await db
    .update(users)
    .set({ status: "DISABLED", updatedAt: new Date() })
    .where(
      and(
        eq(users.id, userId),
        eq(users.companyId, authUser.companyId),
        eq(users.role, "ADMIN")
      )
    )
    .returning({ id: users.id });

  if (!updated) {
    throw new AppError(404, "Admin not found");
  }

  return { success: true, id: updated.id };
}

export async function createDepartment(
  authUser: AuthUser,
  input: {
    name: string;
    code: string;
  }
) {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  const [existingByCode] = await db
    .select({
      id: departments.id,
    })
    .from(departments)
    .where(
      and(
        eq(departments.companyId, authUser.companyId),
        ilike(departments.code, input.code)
      )
    )
    .limit(1);

  if (existingByCode) {
    throw new AppError(409, "This department already exists for the selected Company ID.");
  }

  const [existingByName] = await db
    .select({
      id: departments.id,
    })
    .from(departments)
    .where(
      and(
        eq(departments.companyId, authUser.companyId),
        ilike(departments.name, input.name)
      )
    )
    .limit(1);

  if (existingByName) {
    throw new AppError(409, "This department already exists for the selected Company ID.");
  }

  const [department] = await db
    .insert(departments)
    .values({
      companyId: authUser.companyId,
      name: input.name,
      code: input.code,
    })
    .returning({
      id: departments.id,
      name: departments.name,
      code: departments.code,
      isActive: departments.isActive,
    });

  return department;
}

export async function getMasterAdminAttendance(
  authUser: AuthUser,
  reportType?: string,
  date?: string,
  month?: string,
  year?: string,
  startDate?: string,
  endDate?: string,
  departmentId?: string,
  employeeId?: string,
  page?: number,
  limit?: number
) {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  // Pagination validation
  const currentPage = page ?? 1;
  const currentLimit = limit ?? 20;

  if (!Number.isInteger(currentPage) || currentPage < 1) {
    throw new AppError(400, "Invalid page");
  }

  if (
    !Number.isInteger(currentLimit) ||
    currentLimit < 1 ||
    currentLimit > 100
  ) {
    throw new AppError(400, "Invalid limit");
  }

  const { dateStart, dateEnd, reportLabel } =
    await resolveMasterAdminDateRange(
      authUser,
      reportType,
      date,
      month,
      year,
      startDate,
      endDate
    );

  let departmentUuid: string | undefined;

  if (departmentId) {
    const [department] = await db
      .select({
        id: departments.id,
      })
      .from(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          eq(departments.companyId, authUser.companyId),
          eq(departments.isActive, true)
        )
      )
      .limit(1);

    if (!department) {
      throw new AppError(404, "Department not found");
    }

    departmentUuid = department.id;
  }

  let employeeUuid: string | undefined;

  if (employeeId) {
    const userConditions = [
      eq(users.employeeId, employeeId),
      eq(users.companyId, authUser.companyId),
      eq(users.role, "STAFF"),
    ];

    if (departmentUuid) {
      userConditions.push(
        eq(users.departmentId, departmentUuid)
      );
    }

    const [staff] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(and(...userConditions))
      .limit(1);

    if (!staff) {
      throw new AppError(
        404,
        "Staff member not found"
      );
    }

    employeeUuid = staff.id;
  }

  const conditions = [
    eq(attendance.companyId, authUser.companyId),
    gte(attendance.attendanceDate, dateStart),
    lte(attendance.attendanceDate, dateEnd),
  ];

  if (departmentUuid) {
    conditions.push(
      eq(attendance.departmentId, departmentUuid)
    );
  }

  if (employeeUuid) {
    conditions.push(
      eq(attendance.employeeId, employeeUuid)
    );
  }

  // Count total records
  const [totalCount] = await db
    .select({
      count: sql<number>`count(*)`,
    })
    .from(attendance)
    .where(and(...conditions));

  const total = Number(totalCount?.count ?? 0);
  const totalPages = Math.ceil(total / currentLimit);
  const offset = (currentPage - 1) * currentLimit;

  const records = await db
    .select({
      id: attendance.id,
      employeeId: users.employeeId,
      employeeName: users.name,
      departmentId: attendance.departmentId,
      attendanceDate: attendance.attendanceDate,
      clockInTime: attendance.clockInTime,
      clockInLatitude: attendance.clockInLatitude,
      clockInLongitude: attendance.clockInLongitude,
      clockInLocationName: attendance.clockInLocationName,
      clockInMethod: attendance.clockInMethod,
      assignedTask: attendance.assignedTask,
      clockOutTime: attendance.clockOutTime,
      clockOutLatitude: attendance.clockOutLatitude,
      clockOutLongitude: attendance.clockOutLongitude,
      clockOutLocationName: attendance.clockOutLocationName,
      clockOutMethod: attendance.clockOutMethod,
      workingMinutes: attendance.workingMinutes,
      attendanceStatus: attendance.attendanceStatus,
      sessionStatus: attendance.sessionStatus,
      isDeleted: attendance.isDeleted,
    })
    .from(attendance)
    .leftJoin(
      users,
      eq(attendance.employeeId, users.id)
    )
    .where(and(...conditions))
    .orderBy(
      desc(attendance.attendanceDate),
      desc(attendance.clockInTime)
    )
    .limit(currentLimit)
    .offset(offset);

  return {
    period: reportLabel,
    page: currentPage,
    limit: currentLimit,
    total,
    totalPages,
    records,
  };
}

export async function getMasterAdminAttendanceExport(
  authUser: AuthUser,
  reportType?: string,
  date?: string,
  month?: string,
  year?: string,
  startDate?: string,
  endDate?: string,
  departmentId?: string,
  employeeId?: string,
  browserTimezone?: string
): Promise<{
  csv: string;
  filename: string;
}> {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  // Use browser timezone from request, fall back to company timezone
  const [company] = await db
    .select({ timezone: companies.timezone })
    .from(companies)
    .where(eq(companies.id, authUser.companyId))
    .limit(1);

  const timezone = browserTimezone || company?.timezone;

  const { dateStart, dateEnd, reportLabel } =
    await resolveMasterAdminDateRange(
      authUser,
      reportType,
      date,
      month,
      year,
      startDate,
      endDate
    );

  let departmentUuid: string | undefined;

  if (departmentId) {
    const [department] = await db
      .select({
        id: departments.id,
      })
      .from(departments)
      .where(
        and(
          eq(departments.id, departmentId),
          eq(departments.companyId, authUser.companyId),
          eq(departments.isActive, true)
        )
      )
      .limit(1);

    if (!department) {
      throw new AppError(404, "Department not found");
    }

    departmentUuid = department.id;
  }

  let employeeUuid: string | undefined;

  if (employeeId) {
    const userConditions = [
      eq(users.employeeId, employeeId),
      eq(users.companyId, authUser.companyId),
      eq(users.role, "STAFF"),
    ];

    if (departmentUuid) {
      userConditions.push(
        eq(users.departmentId, departmentUuid)
      );
    }

    const [staff] = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(and(...userConditions))
      .limit(1);

    if (!staff) {
      throw new AppError(
        404,
        "Staff member not found"
      );
    }

    employeeUuid = staff.id;
  }

  const conditions = [
    eq(attendance.companyId, authUser.companyId),
    gte(attendance.attendanceDate, dateStart),
    lte(attendance.attendanceDate, dateEnd),
  ];

  if (departmentUuid) {
    conditions.push(
      eq(attendance.departmentId, departmentUuid)
    );
  }

  if (employeeUuid) {
    conditions.push(
      eq(attendance.employeeId, employeeUuid)
    );
  }

  const records = await db
    .select({
      employeeId: users.employeeId,
      employeeName: users.name,
      departmentId: attendance.departmentId,
      departmentName: departments.name,
      attendanceDate: attendance.attendanceDate,
      clockInTime: attendance.clockInTime,
      clockInLatitude: attendance.clockInLatitude,
      clockInLongitude: attendance.clockInLongitude,
      clockInLocationName: attendance.clockInLocationName,
      clockInMethod: attendance.clockInMethod,
      assignedTask: attendance.assignedTask,
      clockOutTime: attendance.clockOutTime,
      clockOutLatitude: attendance.clockOutLatitude,
      clockOutLongitude: attendance.clockOutLongitude,
      clockOutLocationName: attendance.clockOutLocationName,
      clockOutMethod: attendance.clockOutMethod,
      workingMinutes: attendance.workingMinutes,
      attendanceStatus: attendance.attendanceStatus,
      sessionStatus: attendance.sessionStatus,
    })
    .from(attendance)
    .leftJoin(
      users,
      eq(attendance.employeeId, users.id)
    )
    .leftJoin(
      departments,
      eq(attendance.departmentId, departments.id)
    )
    .where(and(...conditions))
    .orderBy(
      desc(attendance.attendanceDate),
      desc(attendance.clockInTime)
    );

  // Generate CSV
  const header = generateCSVRow([
    "Employee ID",
    "Employee Name",
    "Department ID",
    "Department Name",
    "Attendance Date",
    "Clock In Time",
    "Assigned Task",
    "Clock In Location Name",
    "Clock In Map",
    "Clock In Method",
    "Clock Out Time",
    "Clock Out Location Name",
    "Clock Out Map",
    "Clock Out Method",
    "Working Minutes",
    "Attendance Status",
    "Session Status",
  ]);

  const getLocationUrl = (lat: string | null | undefined, lng: string | null | undefined): string => {
    if (!lat || !lng) return "Not available";
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  const rows = records.map((record) =>
    generateCSVRow([
      record.employeeId,
      record.employeeName,
      record.departmentId,
      record.departmentName || "Not available",
      record.attendanceDate,
      formatTimeOnly(record.clockInTime, timezone),
      record.assignedTask || "",
      record.clockInLocationName || "Not available",
      getLocationUrl(record.clockInLatitude, record.clockInLongitude),
      record.clockInMethod || "Not recorded",
      formatTimeOnly(record.clockOutTime, timezone),
      record.clockOutLocationName || "Not available",
      getLocationUrl(record.clockOutLatitude, record.clockOutLongitude),
      record.clockOutMethod || "Not recorded",
      record.workingMinutes?.toString(),
      record.attendanceStatus,
      record.sessionStatus,
    ])
  );

  const csv = [header, ...rows].join("\n");

  const filename = `attendance-${reportType || "monthly"}-${reportLabel}.csv`;

  return {
    csv,
    filename,
  };
}

/**
 * Resolves the date range (start/end) and a human-readable label
 * for a Master Admin attendance report based on the report type.
 * Reuses the same boundary logic as the Admin attendance service.
 */
async function resolveMasterAdminDateRange(
  authUser: AuthUser,
  reportType?: string,
  date?: string,
  month?: string,
  year?: string,
  startDate?: string,
  endDate?: string
): Promise<{
  dateStart: string;
  dateEnd: string;
  reportLabel: string;
}> {
  if (reportType === "daily") {
    if (!date) {
      throw new AppError(400, "Date is required for daily report");
    }
    if (!validateDateFormat(date)) {
      throw new AppError(400, "Invalid date format. Use YYYY-MM-DD");
    }
    return { dateStart: date, dateEnd: date, reportLabel: date };
  }

  if (reportType === "weekly") {
    if (!date) {
      throw new AppError(400, "Date is required for weekly report");
    }
    if (!validateDateFormat(date)) {
      throw new AppError(400, "Invalid date format. Use YYYY-MM-DD");
    }
    const { start, end } = getWeekBoundaries(date);
    return { dateStart: start, dateEnd: end, reportLabel: `${start}-to-${end}` };
  }

  if (reportType === "yearly") {
    if (year) {
      if (!validateYearFormat(year)) {
        throw new AppError(400, "Invalid year format. Use YYYY");
      }
      const { start, end } = getYearBoundaries(year);
      return { dateStart: start, dateEnd: end, reportLabel: year };
    }
    const currentYear = await getCurrentDatePart(authUser, "year");
    const { start, end } = getYearBoundaries(currentYear);
    return { dateStart: start, dateEnd: end, reportLabel: currentYear };
  }

  if (reportType === "custom") {
    if (!startDate) {
      throw new AppError(400, "Start date is required for custom date range report");
    }
    if (!endDate) {
      throw new AppError(400, "End date is required for custom date range report");
    }
    if (!validateDateFormat(startDate)) {
      throw new AppError(400, "Invalid start date format. Use YYYY-MM-DD");
    }
    if (!validateDateFormat(endDate)) {
      throw new AppError(400, "Invalid end date format. Use YYYY-MM-DD");
    }
    if (endDate < startDate) {
      throw new AppError(400, "End date cannot be earlier than start date");
    }
    return {
      dateStart: startDate,
      dateEnd: endDate,
      reportLabel: `${startDate}-to-${endDate}`,
    };
  }

  // Default: monthly (preserves existing behavior)
  if (month) {
    if (!validateMonthFormat(month)) {
      throw new AppError(400, "Invalid month format. Use YYYY-MM");
    }
    const { start, end } = getMonthBoundaries(month);
    return { dateStart: start, dateEnd: end, reportLabel: month };
  }

  const currentMonth = await getCurrentDatePart(authUser, "month");
  const { start, end } = getMonthBoundaries(currentMonth);
  return { dateStart: start, dateEnd: end, reportLabel: currentMonth };
}

/**
 * Returns the current date in the company's timezone.
 * `part` controls whether the full date, the YYYY-MM month, or YYYY year is returned.
 */
async function getCurrentDatePart(
  authUser: AuthUser,
  part: "date" | "month" | "year"
): Promise<string> {
  if (!authUser.companyId) {
    throw new AppError(403, "Company context is required");
  }

  const [company] = await db
    .select({ timezone: companies.timezone })
    .from(companies)
    .where(eq(companies.id, authUser.companyId))
    .limit(1);

  if (!company?.timezone) {
    throw new AppError(500, "Company timezone not configured");
  }

  const currentDate = getDateInTimeZone(company.timezone);
  if (part === "year") return currentDate.slice(0, 4);
  if (part === "month") return currentDate.slice(0, 7);
  return currentDate;
}