import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { attendance } from "../../db/schema/attendance.js";
import { companies } from "../../db/schema/companies.js";
import { users } from "../../db/schema/users.js";
import { staffDevices } from "../../db/schema/staff-devices.js";
import { AppError } from "../../utils/app-error.js";
import { hashPassword, validatePassword, } from "../../utils/password.js";
import { getDateInTimeZone, getMonthBoundaries, validateMonthFormat, validateDateFormat, validateYearFormat, getWeekBoundaries, getYearBoundaries, } from "../../utils/date.js";
import { generateCSVRow } from "../../utils/csv.js";
export async function getPendingStaff(authUser) {
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
            .where(and(eq(users.companyId, authUser.companyId), eq(users.departmentId, authUser.departmentId), eq(users.role, "STAFF"), eq(users.status, "PENDING")));
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
            .where(and(eq(users.companyId, authUser.companyId), eq(users.role, "STAFF"), eq(users.status, "PENDING")));
    }
    throw new AppError(403, "Access denied");
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
            .where(and(eq(users.companyId, authUser.companyId), eq(users.departmentId, authUser.departmentId), eq(users.role, "STAFF")));
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
            .where(and(eq(users.companyId, authUser.companyId), eq(users.role, "STAFF")));
    }
    throw new AppError(403, "Access denied");
}
export async function getAdminAttendance(authUser, reportType, date, month, year, employeeId, page, limit) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    if (authUser.role !== "ADMIN") {
        throw new AppError(403, "Access denied");
    }
    if (!authUser.departmentId) {
        throw new AppError(403, "Department context is required");
    }
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
    let dateStart;
    let dateEnd;
    let reportLabel;
    if (reportType === "daily") {
        if (!date) {
            throw new AppError(400, "Date is required for daily report");
        }
        if (!validateDateFormat(date)) {
            throw new AppError(400, "Invalid date format. Use YYYY-MM-DD");
        }
        dateStart = date;
        dateEnd = date;
        reportLabel = date;
    }
    else if (reportType === "weekly") {
        if (!date) {
            throw new AppError(400, "Date is required for weekly report");
        }
        if (!validateDateFormat(date)) {
            throw new AppError(400, "Invalid date format. Use YYYY-MM-DD");
        }
        const boundaries = getWeekBoundaries(date);
        dateStart = boundaries.start;
        dateEnd = boundaries.end;
        reportLabel = date;
    }
    else if (reportType === "monthly") {
        if (month) {
            if (!validateMonthFormat(month)) {
                throw new AppError(400, "Invalid month format. Use YYYY-MM");
            }
            const boundaries = getMonthBoundaries(month);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = month;
        }
        else {
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
            const currentMonth = currentDate.slice(0, 7);
            const boundaries = getMonthBoundaries(currentMonth);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = currentMonth;
        }
    }
    else if (reportType === "yearly") {
        if (year) {
            if (!validateYearFormat(year)) {
                throw new AppError(400, "Invalid year format. Use YYYY");
            }
            const boundaries = getYearBoundaries(year);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = year;
        }
        else {
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
            const currentYear = currentDate.slice(0, 4);
            const boundaries = getYearBoundaries(currentYear);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = currentYear;
        }
    }
    else {
        // Default to monthly for backward compatibility
        if (month) {
            if (!validateMonthFormat(month)) {
                throw new AppError(400, "Invalid month format. Use YYYY-MM");
            }
            const boundaries = getMonthBoundaries(month);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = month;
        }
        else {
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
            const currentMonth = currentDate.slice(0, 7);
            const boundaries = getMonthBoundaries(currentMonth);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = currentMonth;
        }
    }
    let employeeUuid;
    if (employeeId) {
        const [staff] = await db
            .select({
            id: users.id,
        })
            .from(users)
            .where(and(eq(users.employeeId, employeeId), eq(users.companyId, authUser.companyId), eq(users.departmentId, authUser.departmentId), eq(users.role, "STAFF")))
            .limit(1);
        if (!staff) {
            throw new AppError(404, "Staff member not found");
        }
        employeeUuid = staff.id;
    }
    const conditions = [
        eq(attendance.companyId, authUser.companyId),
        eq(attendance.departmentId, authUser.departmentId),
        gte(attendance.attendanceDate, dateStart),
        lte(attendance.attendanceDate, dateEnd),
    ];
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
export async function getAdminAttendanceExport(authUser, reportType, date, month, year, employeeId) {
    if (!authUser.companyId) {
        throw new AppError(403, "Company context is required");
    }
    if (authUser.role !== "ADMIN") {
        throw new AppError(403, "Access denied");
    }
    if (!authUser.departmentId) {
        throw new AppError(403, "Department context is required");
    }
    // Determine date range based on report type
    let dateStart;
    let dateEnd;
    let reportLabel;
    if (reportType === "daily") {
        if (!date) {
            throw new AppError(400, "Date is required for daily report");
        }
        if (!validateDateFormat(date)) {
            throw new AppError(400, "Invalid date format. Use YYYY-MM-DD");
        }
        dateStart = date;
        dateEnd = date;
        reportLabel = date;
    }
    else if (reportType === "weekly") {
        if (!date) {
            throw new AppError(400, "Date is required for weekly report");
        }
        if (!validateDateFormat(date)) {
            throw new AppError(400, "Invalid date format. Use YYYY-MM-DD");
        }
        const boundaries = getWeekBoundaries(date);
        dateStart = boundaries.start;
        dateEnd = boundaries.end;
        reportLabel = date;
    }
    else if (reportType === "monthly") {
        if (month) {
            if (!validateMonthFormat(month)) {
                throw new AppError(400, "Invalid month format. Use YYYY-MM");
            }
            const boundaries = getMonthBoundaries(month);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = month;
        }
        else {
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
            const currentMonth = currentDate.slice(0, 7);
            const boundaries = getMonthBoundaries(currentMonth);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = currentMonth;
        }
    }
    else if (reportType === "yearly") {
        if (year) {
            if (!validateYearFormat(year)) {
                throw new AppError(400, "Invalid year format. Use YYYY");
            }
            const boundaries = getYearBoundaries(year);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = year;
        }
        else {
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
            const currentYear = currentDate.slice(0, 4);
            const boundaries = getYearBoundaries(currentYear);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = currentYear;
        }
    }
    else {
        // Default to monthly for backward compatibility
        if (month) {
            if (!validateMonthFormat(month)) {
                throw new AppError(400, "Invalid month format. Use YYYY-MM");
            }
            const boundaries = getMonthBoundaries(month);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = month;
        }
        else {
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
            const currentMonth = currentDate.slice(0, 7);
            const boundaries = getMonthBoundaries(currentMonth);
            dateStart = boundaries.start;
            dateEnd = boundaries.end;
            reportLabel = currentMonth;
        }
    }
    let employeeUuid;
    if (employeeId) {
        const [staff] = await db
            .select({
            id: users.id,
        })
            .from(users)
            .where(and(eq(users.employeeId, employeeId), eq(users.companyId, authUser.companyId), eq(users.departmentId, authUser.departmentId), eq(users.role, "STAFF")))
            .limit(1);
        if (!staff) {
            throw new AppError(404, "Staff member not found");
        }
        employeeUuid = staff.id;
    }
    const conditions = [
        eq(attendance.companyId, authUser.companyId),
        eq(attendance.departmentId, authUser.departmentId),
        gte(attendance.attendanceDate, dateStart),
        lte(attendance.attendanceDate, dateEnd),
    ];
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
        record.clockInTime?.toISOString(),
        record.clockInLocationName || "Not available",
        getLocationUrl(record.clockInLatitude, record.clockInLongitude),
        record.clockInMethod || "Not recorded",
        record.clockOutTime?.toISOString(),
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
    const conditions = [
        eq(users.id, staffId),
        eq(users.companyId, authUser.companyId),
        eq(users.role, "STAFF"),
        eq(users.status, "PENDING"),
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
        .select({ id: users.id })
        .from(users)
        .where(and(...conditions))
        .limit(1);
    if (!staff) {
        throw new AppError(404, "Staff member not found");
    }
    await db
        .update(staffDevices)
        .set({
        status: "REVOKED",
        revokedAt: new Date(),
    })
        .where(and(eq(staffDevices.userId, staffId), eq(staffDevices.status, "ACTIVE")));
    const [pendingDevice] = await db
        .select({ id: staffDevices.id })
        .from(staffDevices)
        .where(and(eq(staffDevices.userId, staffId), eq(staffDevices.status, "PENDING")))
        .orderBy(desc(staffDevices.createdAt))
        .limit(1);
    if (pendingDevice) {
        await db
            .update(staffDevices)
            .set({
            status: "ACTIVE",
            approvedAt: new Date(),
            revokedAt: null,
        })
            .where(eq(staffDevices.id, pendingDevice.id));
    }
    return { success: true, message: "Registered device reset successfully" };
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
    ];
    if (authUser.role === "ADMIN") {
        if (!authUser.departmentId) {
            throw new AppError(403, "Department context is required");
        }
        conditions.push(eq(users.departmentId, authUser.departmentId));
    }
    try {
        const [deletedUser] = await db
            .delete(users)
            .where(and(...conditions))
            .returning({
            id: users.id,
            employeeId: users.employeeId,
            name: users.name,
        });
        if (!deletedUser) {
            throw new AppError(404, "Staff member not found");
        }
        return { success: true };
    }
    catch (error) {
        if (error?.code === '23503' ||
            error?.cause?.code === '23503') {
            throw new AppError(409, "This staff member cannot be deleted because attendance records exist");
        }
        throw error;
    }
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
//# sourceMappingURL=admin.service.js.map