import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { attendance } from "../../db/schema/attendance.js";
import { companies } from "../../db/schema/companies.js";
import { departments } from "../../db/schema/departments.js";
import { users } from "../../db/schema/users.js";
import { staffDevices } from "../../db/schema/staff-devices.js";
import { AppError } from "../../utils/app-error.js";
import { hashPassword, validatePassword, } from "../../utils/password.js";
import { getDateInTimeZone, getMonthBoundaries, validateMonthFormat, validateDateFormat, validateYearFormat, getWeekBoundaries, getYearBoundaries, formatTimeOnly, } from "../../utils/date.js";
import { generateCSVRow } from "../../utils/csv.js";
export async function getPendingStaff(authUser) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    // Restrict pending staff access to MASTER_ADMIN only
    if (authUser.role !== "MASTER_ADMIN") {
        throw new AppError(403, "Only Master Admin can view pending Staff registrations.");
    }
    return db
        .select({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        designation: users.designation,
        departmentId: users.departmentId,
        departmentName: departments.name,
        departmentCode: departments.code,
        status: users.status,
        createdAt: users.createdAt,
    })
        .from(users)
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(and(eq(users.companyId, authUser.companyId), eq(users.role, "STAFF"), eq(users.status, "PENDING"), eq(users.isDeleted, false)));
}
export async function getStaffList(authUser) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        return db
            .select({
            id: users.id,
            employeeId: users.employeeId,
            name: users.name,
            email: users.email,
            phone: users.phone,
            designation: users.designation,
            departmentId: users.departmentId,
            status: users.status,
        })
            .from(users)
            .where(and(eq(users.companyId, authUser.companyId), eq(users.departmentId, authUser.departmentId), eq(users.role, "STAFF"), inArray(users.status, ["APPROVED", "DISABLED"]), eq(users.isDeleted, false)));
    }
    if (authUser.role === "MASTER_ADMIN") {
        return db
            .select({
            id: users.id,
            employeeId: users.employeeId,
            name: users.name,
            email: users.email,
            phone: users.phone,
            designation: users.designation,
            departmentId: users.departmentId,
            status: users.status,
        })
            .from(users)
            .where(and(eq(users.companyId, authUser.companyId), eq(users.role, "STAFF"), eq(users.isDeleted, false)));
    }
    throw new AppError(403, "Access denied");
}
export async function getApprovedStaff(authUser) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    if (authUser.role !== "MASTER_ADMIN") {
        throw new AppError(403, "Only Master Admin can view approved staff list");
    }
    return db
        .select({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
        email: users.email,
        phone: users.phone,
        designation: users.designation,
        departmentId: users.departmentId,
        departmentName: departments.name,
        departmentCode: departments.code,
        status: users.status,
        createdAt: users.createdAt,
    })
        .from(users)
        .leftJoin(departments, eq(users.departmentId, departments.id))
        .where(and(eq(users.companyId, authUser.companyId), eq(users.role, "STAFF"), inArray(users.status, ["APPROVED", "DISABLED"]), eq(users.isDeleted, false)));
}
export async function getAdminAttendance(authUser, reportType, date, month, year, startDate, endDate, employeeId, page, limit) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    if (authUser.role !== "ADMIN" && authUser.role !== "MASTER_ADMIN") {
        throw new AppError(403, "Access denied");
    }
    if (authUser.role === "ADMIN" && !authUser.departmentId) {
        throw new AppError(403, "Department context is required");
    }
    const adminDepartmentId = authUser.departmentId;
    // Pagination validation
    const currentPage = page ?? 1;
    const currentLimit = limit ?? 20;
    if (!Number.isInteger(currentPage) || currentPage < 1) {
        throw new AppError(400, "Invalid page");
    }
    if (!Number.isInteger(currentLimit) ||
        currentLimit < 1 ||
        currentLimit > 100) {
        throw new AppError(400, "Invalid limit");
    }
    // Determine date range based on report type
    const { dateStart, dateEnd, reportLabel } = await resolveAdminDateRange(authUser, reportType, date, month, year, startDate, endDate);
    let employeeUuid;
    if (employeeId) {
        const employeeConditions = [
            eq(users.employeeId, employeeId),
            eq(users.companyId, authUser.companyId),
            eq(users.role, "STAFF"),
        ];
        if (adminDepartmentId) {
            employeeConditions.push(eq(users.departmentId, adminDepartmentId));
        }
        const [staff] = await db
            .select({
            id: users.id,
        })
            .from(users)
            .where(and(...employeeConditions))
            .limit(1);
        if (!staff) {
            throw new AppError(404, "Staff member not found");
        }
        employeeUuid = staff.id;
    }
    const conditions = [
        eq(attendance.companyId, authUser.companyId),
        gte(attendance.attendanceDate, dateStart),
        lte(attendance.attendanceDate, dateEnd),
    ];
    if (adminDepartmentId) {
        conditions.push(eq(attendance.departmentId, adminDepartmentId));
    }
    if (employeeUuid) {
        conditions.push(eq(attendance.employeeId, employeeUuid));
    }
    // Count total records
    const [totalCount] = await db
        .select({
        count: sql `count(*)`,
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
        .leftJoin(users, eq(attendance.employeeId, users.id))
        .where(and(...conditions))
        .orderBy(desc(attendance.attendanceDate), desc(attendance.clockInTime))
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
export async function getAdminAttendanceExport(authUser, reportType, date, month, year, startDate, endDate, employeeId, browserTimezone) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    if (authUser.role !== "ADMIN" && authUser.role !== "MASTER_ADMIN") {
        throw new AppError(403, "Access denied");
    }
    if (authUser.role === "ADMIN" && !authUser.departmentId) {
        throw new AppError(403, "Department context is required");
    }
    const adminDepartmentId = authUser.departmentId;
    // Use browser timezone from request, fall back to company timezone
    const [company] = await db
        .select({ timezone: companies.timezone })
        .from(companies)
        .where(eq(companies.id, authUser.companyId))
        .limit(1);
    const timezone = browserTimezone || company?.timezone;
    // Determine date range based on report type
    const { dateStart, dateEnd, reportLabel } = await resolveAdminDateRange(authUser, reportType, date, month, year, startDate, endDate);
    let employeeUuid;
    if (employeeId) {
        const employeeConditions = [
            eq(users.employeeId, employeeId),
            eq(users.companyId, authUser.companyId),
            eq(users.role, "STAFF"),
        ];
        if (adminDepartmentId) {
            employeeConditions.push(eq(users.departmentId, adminDepartmentId));
        }
        const [staff] = await db
            .select({
            id: users.id,
        })
            .from(users)
            .where(and(...employeeConditions))
            .limit(1);
        if (!staff) {
            throw new AppError(404, "Staff member not found");
        }
        employeeUuid = staff.id;
    }
    const conditions = [
        eq(attendance.companyId, authUser.companyId),
        gte(attendance.attendanceDate, dateStart),
        lte(attendance.attendanceDate, dateEnd),
    ];
    if (adminDepartmentId) {
        conditions.push(eq(attendance.departmentId, adminDepartmentId));
    }
    if (employeeUuid) {
        conditions.push(eq(attendance.employeeId, employeeUuid));
    }
    const records = await db
        .select({
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
    })
        .from(attendance)
        .innerJoin(users, eq(attendance.employeeId, users.id))
        .where(and(...conditions))
        .orderBy(desc(attendance.attendanceDate), desc(attendance.clockInTime));
    // Generate CSV
    const header = generateCSVRow([
        "Employee ID",
        "Employee Name",
        "Department ID",
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
    const getLocationUrl = (lat, lng) => {
        if (!lat || !lng)
            return "Not available";
        return `https://www.google.com/maps?q=${lat},${lng}`;
    };
    const rows = records.map((record) => generateCSVRow([
        record.employeeId,
        record.employeeName,
        record.departmentId,
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
    ]));
    const csv = [header, ...rows].join("\n");
    const filename = `attendance-${reportType || 'monthly'}-${reportLabel}.csv`;
    return {
        csv,
        filename,
    };
}
/**
 * Resolves the date range (start/end) and a human-readable label
 * for an Admin attendance report based on the report type.
 * Reuses the same boundary helpers as the Master Admin service.
 */
async function resolveAdminDateRange(authUser, reportType, date, month, year, startDate, endDate) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
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
        const currentYear = await getCurrentDatePartForAdmin(authUser, "year");
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
    const currentMonth = await getCurrentDatePartForAdmin(authUser, "month");
    const { start, end } = getMonthBoundaries(currentMonth);
    return { dateStart: start, dateEnd: end, reportLabel: currentMonth };
}
async function getCurrentDatePartForAdmin(authUser, part) {
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
    if (part === "year")
        return currentDate.slice(0, 4);
    if (part === "month")
        return currentDate.slice(0, 7);
    return currentDate;
}
export async function getAdminAttendanceSummary(authUser) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    const [company] = await db
        .select({
        timezone: companies.timezone,
    })
        .from(companies)
        .where(eq(companies.id, authUser.companyId))
        .limit(1);
    if (!company?.timezone) {
        throw new AppError(500, "Company timezone not configured");
    }
    const currentDate = getDateInTimeZone(company.timezone);
    const conditions = [
        eq(attendance.companyId, authUser.companyId),
        eq(attendance.attendanceDate, currentDate),
    ];
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        conditions.push(eq(attendance.departmentId, authUser.departmentId));
    }
    const [summary] = await db
        .select({
        presentRecords: sql `
        count(*) filter (where ${attendance.attendanceStatus} = 'PRESENT')
      `,
        activeSessions: sql `
        count(*) filter (where ${attendance.sessionStatus} = 'CLOCKED_IN')
      `,
        totalWorkingMinutes: sql `
        coalesce(sum(${attendance.workingMinutes}), 0)
      `,
    })
        .from(attendance)
        .where(and(...conditions));
    return {
        date: currentDate,
        presentRecords: Number(summary?.presentRecords ?? 0),
        activeSessions: Number(summary?.activeSessions ?? 0),
        totalWorkingMinutes: Number(summary?.totalWorkingMinutes ?? 0),
    };
}
export async function getAdminDashboardStats(authUser) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    // Build shared base conditions
    const staffConditions = [
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
        eq(users.isDeleted, false),
    ];
    const pendingStaffConditions = [
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
        eq(users.status, "PENDING"),
        eq(users.isDeleted, false),
    ];
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        staffConditions.push(eq(users.departmentId, authUser.departmentId));
        pendingStaffConditions.push(eq(users.departmentId, authUser.departmentId));
    }
    const [company] = await db
        .select({
        timezone: companies.timezone,
    })
        .from(companies)
        .where(eq(companies.id, authUser.companyId))
        .limit(1);
    if (!company?.timezone) {
        throw new AppError(500, "Company timezone not configured");
    }
    const currentDate = getDateInTimeZone(company.timezone);
    const attendanceConditions = [
        eq(attendance.companyId, authUser.companyId),
        eq(attendance.attendanceDate, currentDate),
    ];
    if (authUser.role === "ADMIN") {
        attendanceConditions.push(eq(attendance.departmentId, authUser.departmentId));
    }
    const [staffCountResult] = await db
        .select({
        count: sql `count(*)`,
    })
        .from(users)
        .where(and(...staffConditions));
    const [pendingStaffCountResult] = await db
        .select({
        count: sql `count(*)`,
    })
        .from(users)
        .where(and(...pendingStaffConditions));
    const [attendanceSummary] = await db
        .select({
        presentRecords: sql `
        count(*) filter (where ${attendance.attendanceStatus} = 'PRESENT')
      `,
    })
        .from(attendance)
        .where(and(...attendanceConditions));
    return {
        totalStaff: Number(staffCountResult?.count ?? 0),
        pendingStaff: Number(pendingStaffCountResult?.count ?? 0),
        presentRecords: Number(attendanceSummary?.presentRecords ?? 0),
        presentDate: currentDate,
    };
}
export async function getMasterAdminDashboardStats(authUser) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    if (authUser.role !== "MASTER_ADMIN") {
        throw new AppError(403, "Only Master Admin can view dashboard stats");
    }
    const [totalStaffResult] = await db
        .select({
        count: sql `count(*)`,
    })
        .from(users)
        .where(and(eq(users.companyId, authUser.companyId), eq(users.role, "STAFF"), eq(users.isDeleted, false)));
    const [pendingStaffResult] = await db
        .select({
        count: sql `count(*)`,
    })
        .from(users)
        .where(and(eq(users.companyId, authUser.companyId), eq(users.role, "STAFF"), eq(users.status, "PENDING"), eq(users.isDeleted, false)));
    const [approvedStaffResult] = await db
        .select({
        count: sql `count(*)`,
    })
        .from(users)
        .where(and(eq(users.companyId, authUser.companyId), eq(users.role, "STAFF"), eq(users.status, "APPROVED"), eq(users.isDeleted, false)));
    const [rejectedStaffResult] = await db
        .select({
        count: sql `count(*)`,
    })
        .from(users)
        .where(and(eq(users.companyId, authUser.companyId), eq(users.role, "STAFF"), eq(users.status, "REJECTED"), eq(users.isDeleted, false)));
    return {
        totalRegistered: Number(totalStaffResult?.count ?? 0),
        pendingApproval: Number(pendingStaffResult?.count ?? 0),
        approved: Number(approvedStaffResult?.count ?? 0),
        rejected: Number(rejectedStaffResult?.count ?? 0),
    };
}
export async function approveStaff(authUser, staffId) {
    return updateStaffStatus(authUser, staffId, "APPROVED");
}
export async function rejectStaff(authUser, staffId) {
    return updateStaffStatus(authUser, staffId, "REJECTED");
}
async function updateStaffStatus(authUser, staffId, status) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    // Restrict approval/rejection to MASTER_ADMIN only
    if (authUser.role !== "MASTER_ADMIN") {
        throw new AppError(403, "Only Master Admin can approve or reject Staff registrations.");
    }
    const conditions = [
        eq(users.id, staffId),
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
        eq(users.status, "PENDING"),
    ];
    const [updatedUser] = await db
        .update(users)
        .set({
        status,
        updatedAt: new Date(),
    })
        .where(and(...conditions))
        .returning({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
        status: users.status,
    });
    if (!updatedUser) {
        throw new AppError(404, "Pending staff member not found");
    }
    if (status === "APPROVED") {
        await db
            .update(staffDevices)
            .set({
            status: "ACTIVE",
            approvedAt: new Date(),
            revokedAt: null,
        })
            .where(and(eq(staffDevices.userId, staffId), eq(staffDevices.status, "PENDING")));
    }
    if (status === "REJECTED") {
        await db
            .update(staffDevices)
            .set({
            status: "REVOKED",
            revokedAt: new Date(),
        })
            .where(and(eq(staffDevices.userId, staffId), eq(staffDevices.status, "PENDING")));
    }
    return updatedUser;
}
export async function activateStaff(authUser, staffId) {
    return updateExistingStaffStatus(authUser, staffId, "APPROVED");
}
export async function deactivateStaff(authUser, staffId) {
    return updateExistingStaffStatus(authUser, staffId, "DISABLED");
}
export async function resetStaffDevice(authUser, staffId) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    const conditions = [
        eq(users.id, staffId),
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
    ];
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        conditions.push(eq(users.departmentId, authUser.departmentId));
    }
    const [staff] = await db
        .select({ id: users.id, employeeId: users.employeeId })
        .from(users)
        .where(and(...conditions))
        .limit(1);
    if (!staff) {
        throw new AppError(404, "Staff member not found");
    }
    // Revoke all active staff devices for this user
    await db
        .update(staffDevices)
        .set({
        status: "REVOKED",
        revokedAt: new Date(),
    })
        .where(and(eq(staffDevices.userId, staffId), eq(staffDevices.status, "ACTIVE")));
    const now = new Date();
    const expiry = new Date(now.getTime() + 5 * 60 * 1000);
    await db
        .update(users)
        .set({
        deviceResetAllowed: true,
        deviceResetExpiry: expiry,
        updatedAt: now,
    })
        .where(eq(users.id, staffId));
    return {
        success: true,
        message: "Device access allowed for 5 minutes",
        data: {
            employeeId: staff.employeeId,
            expiresAt: expiry,
        },
    };
}
async function updateExistingStaffStatus(authUser, staffId, status) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    const conditions = [
        eq(users.id, staffId),
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
    ];
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        conditions.push(eq(users.departmentId, authUser.departmentId));
    }
    const [updatedUser] = await db
        .update(users)
        .set({
        status,
        updatedAt: new Date(),
    })
        .where(and(...conditions))
        .returning({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
        status: users.status,
    });
    if (!updatedUser) {
        throw new AppError(404, "Staff member not found");
    }
    return updatedUser;
}
export async function deleteStaff(authUser, staffId) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    const conditions = [
        eq(users.id, staffId),
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
        eq(users.isDeleted, false),
    ];
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        conditions.push(eq(users.departmentId, authUser.departmentId));
    }
    // Soft-delete the staff user
    const [deletedUser] = await db
        .update(users)
        .set({
        isDeleted: true,
        deletedAt: new Date(),
        status: "DISABLED",
        updatedAt: new Date(),
    })
        .where(and(...conditions))
        .returning({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
    });
    if (!deletedUser) {
        throw new AppError(404, "Staff member not found");
    }
    // Bulk soft-delete all attendance records for this staff member
    await db
        .update(attendance)
        .set({
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: authUser.userId,
        updatedAt: new Date(),
    })
        .where(and(eq(attendance.employeeId, staffId), eq(attendance.isDeleted, false)));
    return { success: true };
}
export async function resetStaffPassword(authUser, staffId, temporaryPassword) {
    if (!validatePassword(temporaryPassword)) {
        throw new AppError(400, "Temporary password must be at least 8 characters and include uppercase, lowercase, number, and special character");
    }
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    const conditions = [
        eq(users.id, staffId),
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
    ];
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        conditions.push(eq(users.departmentId, authUser.departmentId));
    }
    const [staff] = await db
        .select({
        id: users.id,
    })
        .from(users)
        .where(and(...conditions))
        .limit(1);
    if (!staff) {
        throw new AppError(404, "Staff member not found");
    }
    const passwordHash = await hashPassword(temporaryPassword);
    await db
        .update(users)
        .set({
        passwordHash,
        mustChangePassword: true,
        updatedAt: new Date(),
    })
        .where(eq(users.id, staff.id));
    return { success: true };
}
export async function getDeletedStaff(authUser) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    const conditions = [
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
        eq(users.isDeleted, true),
    ];
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        conditions.push(eq(users.departmentId, authUser.departmentId));
    }
    return db
        .select({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
    })
        .from(users)
        .innerJoin(attendance, eq(attendance.employeeId, users.id))
        .where(and(...conditions))
        .groupBy(users.id, users.employeeId, users.name)
        .orderBy(users.name);
}
export async function getDeletedStaffAttendance(authUser, employeeId) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    // Find the deleted staff user by employeeId
    const userConditions = [
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
        eq(users.isDeleted, true),
        eq(users.employeeId, employeeId),
    ];
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        userConditions.push(eq(users.departmentId, authUser.departmentId));
    }
    const [staffUser] = await db
        .select({
        id: users.id,
        employeeId: users.employeeId,
        name: users.name,
    })
        .from(users)
        .where(and(...userConditions))
        .limit(1);
    if (!staffUser) {
        throw new AppError(404, "Deleted staff member not found");
    }
    const attendanceConditions = [
        eq(attendance.companyId, authUser.companyId),
        eq(attendance.employeeId, staffUser.id),
        eq(attendance.isDeleted, true),
    ];
    if (authUser.role === "ADMIN") {
        attendanceConditions.push(eq(attendance.departmentId, authUser.departmentId));
    }
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
        .leftJoin(users, eq(attendance.employeeId, users.id))
        .where(and(...attendanceConditions))
        .orderBy(desc(attendance.attendanceDate), desc(attendance.clockInTime));
    return {
        staff: staffUser,
        records,
    };
}
export async function deleteDeletedStaffAttendance(authUser, employeeId) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    // Find the deleted staff user by employeeId
    const userConditions = [
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
        eq(users.isDeleted, true),
        eq(users.employeeId, employeeId),
    ];
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        userConditions.push(eq(users.departmentId, authUser.departmentId));
    }
    const [staffUser] = await db
        .select({
        id: users.id,
    })
        .from(users)
        .where(and(...userConditions))
        .limit(1);
    if (!staffUser) {
        throw new AppError(404, "Deleted staff member not found");
    }
    const attendanceConditions = [
        eq(attendance.companyId, authUser.companyId),
        eq(attendance.employeeId, staffUser.id),
        eq(attendance.isDeleted, true),
    ];
    if (authUser.role === "ADMIN") {
        attendanceConditions.push(eq(attendance.departmentId, authUser.departmentId));
    }
    await db
        .delete(attendance)
        .where(and(...attendanceConditions));
    return { success: true };
}
//# sourceMappingURL=admin.service.js.map