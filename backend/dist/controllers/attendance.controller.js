import { and, count, desc, eq, gte, lte, sql, } from "drizzle-orm";
import { db } from "../db/connection.js";
import { attendance } from "../db/schema/attendance.js";
import { companies } from "../db/schema/companies.js";
import { users } from "../db/schema/users.js";
import { getDateInTimeZone, getMonthBoundaries, getWeekBoundaries, getYearBoundaries, validateDateFormat, validateMonthFormat, validateYearFormat, formatTimeOnly, } from "../utils/date.js";
import { reverseGeocode } from "../utils/geocoding.js";
import { generateCSVRow } from "../utils/csv.js";
/**
 * CLOCK IN
 */
export const clockIn = async (req, res) => {
    try {
        const { latitude, longitude, accuracy, method, assignedTask, } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID not found",
            });
        }
        if (latitude === undefined ||
            longitude === undefined ||
            accuracy === undefined) {
            return res.status(400).json({
                success: false,
                message: "Latitude, longitude, and accuracy are required",
            });
        }
        const trimmedTask = (assignedTask || "").trim();
        if (!trimmedTask) {
            return res.status(400).json({
                success: false,
                message: "Assigned task is required.",
            });
        }
        if (trimmedTask.length > 500) {
            return res.status(400).json({
                success: false,
                message: "Assigned task must not exceed 500 characters.",
            });
        }
        const userResult = await db
            .select({
            userId: users.id,
            companyId: users.companyId,
            departmentId: users.departmentId,
            companyTimezone: companies.timezone,
        })
            .from(users)
            .leftJoin(companies, eq(users.companyId, companies.id))
            .where(eq(users.id, userId))
            .limit(1);
        if (!userResult.length) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userResult[0];
        if (!userData.companyTimezone) {
            return res.status(500).json({
                success: false,
                message: "Company timezone not configured",
            });
        }
        const todayString = getDateInTimeZone(userData.companyTimezone);
        const existingAttendance = await db
            .select()
            .from(attendance)
            .where(and(eq(attendance.employeeId, userId), eq(attendance.attendanceDate, todayString), eq(attendance.sessionStatus, "CLOCKED_IN")))
            .limit(1);
        if (existingAttendance.length > 0) {
            return res.status(400).json({
                success: false,
                message: "User already has an active clock-in session",
            });
        }
        const now = new Date();
        const locationName = await reverseGeocode(latitude, longitude);
        console.log("[ClockIn] locationName from geocoder:", locationName);
        const insertData = {
            companyId: userData.companyId,
            employeeId: userData.userId,
            departmentId: userData.departmentId,
            workLocationId: null,
            attendanceDate: todayString,
            clockInTime: now,
            clockInLatitude: latitude.toString(),
            clockInLongitude: longitude.toString(),
            clockInAccuracy: accuracy.toString(),
            clockInDistanceMeters: null,
            clockInLocationStatus: null,
            clockInLocationName: locationName.displayName,
            clockInMethod: method === "MANUAL" ? "MANUAL" : "BIOMETRIC",
            assignedTask: trimmedTask,
            sessionStatus: "CLOCKED_IN",
            attendanceStatus: "PRESENT",
        };
        console.log("[ClockIn] insertData.clockInLocationName:", insertData.clockInLocationName);
        const [newAttendance] = await db
            .insert(attendance)
            .values(insertData)
            .returning();
        console.log("[ClockIn] saved newAttendance.clockInLocationName:", newAttendance.clockInLocationName);
        return res.status(201).json({
            success: true,
            message: "Clock in successful",
            data: {
                attendanceId: newAttendance.id,
                clockInTime: newAttendance.clockInTime,
                clockInMethod: newAttendance.clockInMethod,
                latitude,
                longitude,
            },
        });
    }
    catch (error) {
        console.error("Clock in error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during clock in",
        });
    }
};
/**
 * CLOCK OUT
 */
export const clockOut = async (req, res) => {
    try {
        const { latitude, longitude, accuracy, method, } = req.body;
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID not found",
            });
        }
        if (latitude === undefined ||
            longitude === undefined ||
            accuracy === undefined) {
            return res.status(400).json({
                success: false,
                message: "Latitude, longitude, and accuracy are required",
            });
        }
        const userResult = await db
            .select({
            userId: users.id,
            companyTimezone: companies.timezone,
        })
            .from(users)
            .leftJoin(companies, eq(users.companyId, companies.id))
            .where(eq(users.id, userId))
            .limit(1);
        if (!userResult.length) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }
        const userData = userResult[0];
        if (!userData.companyTimezone) {
            return res.status(500).json({
                success: false,
                message: "Company timezone not configured",
            });
        }
        const todayString = getDateInTimeZone(userData.companyTimezone);
        const activeAttendance = await db
            .select()
            .from(attendance)
            .where(and(eq(attendance.employeeId, userId), eq(attendance.attendanceDate, todayString), eq(attendance.sessionStatus, "CLOCKED_IN")))
            .limit(1);
        if (!activeAttendance.length) {
            return res.status(400).json({
                success: false,
                message: "No active clock-in session found",
            });
        }
        const attendanceRecord = activeAttendance[0];
        const now = new Date();
        const clockInTime = new Date(attendanceRecord.clockInTime);
        const workingMinutes = Math.floor((now.getTime() - clockInTime.getTime()) /
            (1000 * 60));
        const locationName = await reverseGeocode(latitude, longitude);
        console.log("[ClockOut] locationName from geocoder:", locationName);
        const [updatedAttendance] = await db
            .update(attendance)
            .set({
            clockOutTime: now,
            clockOutLatitude: latitude.toString(),
            clockOutLongitude: longitude.toString(),
            clockOutAccuracy: accuracy.toString(),
            clockOutDistanceMeters: null,
            clockOutLocationStatus: null,
            clockOutLocationName: locationName.displayName,
            clockOutMethod: method === "MANUAL" ? "MANUAL" : "BIOMETRIC",
            sessionStatus: "COMPLETED",
            workingMinutes,
            updatedAt: now,
        })
            .where(eq(attendance.id, attendanceRecord.id))
            .returning();
        console.log("[ClockOut] saved updatedAttendance.clockOutLocationName:", updatedAttendance.clockOutLocationName);
        return res.status(200).json({
            success: true,
            message: "Clock out successful",
            data: {
                attendanceId: updatedAttendance.id,
                clockOutTime: updatedAttendance.clockOutTime,
                clockOutMethod: updatedAttendance.clockOutMethod,
                latitude,
                longitude,
                workingMinutes,
            },
        });
    }
    catch (error) {
        console.error("Clock out error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during clock out",
        });
    }
};
/**
 * CURRENT ACTIVE SESSION
 */
export const getCurrentSession = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const companyId = req.user?.companyId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID not found",
            });
        }
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: "Company context is required",
            });
        }
        const [company] = await db
            .select({
            timezone: companies.timezone,
        })
            .from(companies)
            .where(eq(companies.id, companyId))
            .limit(1);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: "Company not found",
            });
        }
        if (!company.timezone) {
            return res.status(500).json({
                success: false,
                message: "Company timezone not configured",
            });
        }
        const todayString = getDateInTimeZone(company.timezone);
        const activeAttendance = await db
            .select()
            .from(attendance)
            .where(and(eq(attendance.employeeId, userId), eq(attendance.attendanceDate, todayString), eq(attendance.sessionStatus, "CLOCKED_IN")))
            .limit(1);
        if (!activeAttendance.length) {
            return res.status(200).json({
                success: true,
                data: null,
            });
        }
        return res.status(200).json({
            success: true,
            data: {
                attendanceId: activeAttendance[0].id,
                clockInTime: activeAttendance[0].clockInTime,
                clockInLocationStatus: activeAttendance[0]
                    .clockInLocationStatus,
                clockInDistanceMeters: activeAttendance[0]
                    .clockInDistanceMeters,
                clockInMethod: activeAttendance[0].clockInMethod,
                assignedTask: activeAttendance[0].assignedTask,
            },
        });
    }
    catch (error) {
        console.error("Get current session error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
/**
 * STAFF ATTENDANCE HISTORY
 */
export const getAttendanceHistory = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const companyId = req.user?.companyId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID not found",
            });
        }
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: "Company context is required",
            });
        }
        const reportType = req.query.reportType
            ? String(req.query.reportType)
            : undefined;
        const date = req.query.date
            ? String(req.query.date)
            : undefined;
        const month = req.query.month
            ? String(req.query.month)
            : undefined;
        const year = req.query.year
            ? String(req.query.year)
            : undefined;
        const startDate = req.query.startDate
            ? String(req.query.startDate)
            : undefined;
        const endDate = req.query.endDate
            ? String(req.query.endDate)
            : undefined;
        const page = req.query.page
            ? Number(req.query.page)
            : undefined;
        const limit = req.query.limit
            ? Number(req.query.limit)
            : undefined;
        const currentPage = page ?? 1;
        const currentLimit = limit ?? 20;
        if (!Number.isInteger(currentPage) || currentPage < 1) {
            return res.status(400).json({
                success: false,
                message: "Invalid page",
            });
        }
        if (!Number.isInteger(currentLimit) ||
            currentLimit < 1 ||
            currentLimit > 100) {
            return res.status(400).json({
                success: false,
                message: "Invalid limit",
            });
        }
        const rangeResult = await resolveStaffDateRange(companyId, reportType, date, month, year, startDate, endDate);
        if (!rangeResult.ok) {
            return res.status(400).json({
                success: false,
                message: rangeResult.message,
            });
        }
        const { dateStart, dateEnd, reportLabel } = rangeResult;
        const conditions = [
            eq(attendance.employeeId, userId),
            eq(attendance.companyId, companyId),
            gte(attendance.attendanceDate, dateStart),
            lte(attendance.attendanceDate, dateEnd),
        ];
        const [totalCount] = await db
            .select({ count: sql `count(*)` })
            .from(attendance)
            .where(and(...conditions));
        const total = Number(totalCount?.count ?? 0);
        const totalPages = Math.ceil(total / currentLimit);
        const offset = (currentPage - 1) * currentLimit;
        const history = await db
            .select({
            id: attendance.id,
            attendanceDate: attendance.attendanceDate,
            clockInTime: attendance.clockInTime,
            clockInLatitude: attendance.clockInLatitude,
            clockInLongitude: attendance.clockInLongitude,
            clockInLocationName: attendance.clockInLocationName,
            clockInLocationStatus: attendance.clockInLocationStatus,
            clockInMethod: attendance.clockInMethod,
            assignedTask: attendance.assignedTask,
            clockOutTime: attendance.clockOutTime,
            clockOutLatitude: attendance.clockOutLatitude,
            clockOutLongitude: attendance.clockOutLongitude,
            clockOutLocationName: attendance.clockOutLocationName,
            clockOutLocationStatus: attendance.clockOutLocationStatus,
            clockOutMethod: attendance.clockOutMethod,
            workingMinutes: attendance.workingMinutes,
            attendanceStatus: attendance.attendanceStatus,
            sessionStatus: attendance.sessionStatus,
        })
            .from(attendance)
            .where(and(...conditions))
            .orderBy(desc(attendance.attendanceDate), desc(attendance.clockInTime))
            .limit(currentLimit)
            .offset(offset);
        return res.status(200).json({
            success: true,
            data: {
                period: reportLabel,
                page: currentPage,
                limit: currentLimit,
                total,
                totalPages,
                records: history,
            },
        });
    }
    catch (error) {
        console.error("Get attendance history error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
/**
 * STAFF ATTENDANCE HISTORY EXPORT (CSV)
 */
export const exportAttendanceHistory = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const companyId = req.user?.companyId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID not found",
            });
        }
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: "Company context is required",
            });
        }
        const reportType = req.query.reportType
            ? String(req.query.reportType)
            : undefined;
        const date = req.query.date
            ? String(req.query.date)
            : undefined;
        const month = req.query.month
            ? String(req.query.month)
            : undefined;
        const year = req.query.year
            ? String(req.query.year)
            : undefined;
        const startDate = req.query.startDate
            ? String(req.query.startDate)
            : undefined;
        const endDate = req.query.endDate
            ? String(req.query.endDate)
            : undefined;
        const rangeResult = await resolveStaffDateRange(companyId, reportType, date, month, year, startDate, endDate);
        if (!rangeResult.ok) {
            return res.status(400).json({
                success: false,
                message: rangeResult.message,
            });
        }
        const { dateStart, dateEnd, reportLabel } = rangeResult;
        const conditions = [
            eq(attendance.employeeId, userId),
            eq(attendance.companyId, companyId),
            gte(attendance.attendanceDate, dateStart),
            lte(attendance.attendanceDate, dateEnd),
        ];
        const records = await db
            .select({
            attendanceDate: attendance.attendanceDate,
            clockInTime: attendance.clockInTime,
            clockInLatitude: attendance.clockInLatitude,
            clockInLongitude: attendance.clockOutLongitude,
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
            .where(and(...conditions))
            .orderBy(desc(attendance.attendanceDate), desc(attendance.clockInTime));
        // Use browser timezone from query param, fall back to company timezone
        const browserTimezone = req.query.timezone
            ? String(req.query.timezone)
            : undefined;
        // Fetch company timezone as fallback
        const [company] = await db
            .select({ timezone: companies.timezone })
            .from(companies)
            .where(eq(companies.id, companyId))
            .limit(1);
        const timezone = browserTimezone || company?.timezone;
        const header = generateCSVRow([
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
        const filename = `attendance-${reportType || "monthly"}-${reportLabel}.csv`;
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(csv);
    }
    catch (error) {
        console.error("Export attendance history error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
/**
 * Resolves a date range for the Staff attendance history based on the
 * report type. Reuses the same boundary helpers as Admin/Master Admin.
 */
async function resolveStaffDateRange(companyId, reportType, date, month, year, startDate, endDate) {
    if (reportType === "daily") {
        if (!date) {
            return { ok: false, message: "Date is required for daily report" };
        }
        if (!validateDateFormat(date)) {
            return { ok: false, message: "Invalid date format. Use YYYY-MM-DD" };
        }
        return { ok: true, dateStart: date, dateEnd: date, reportLabel: date };
    }
    if (reportType === "weekly") {
        if (!date) {
            return { ok: false, message: "Date is required for weekly report" };
        }
        if (!validateDateFormat(date)) {
            return { ok: false, message: "Invalid date format. Use YYYY-MM-DD" };
        }
        const { start, end } = getWeekBoundaries(date);
        return { ok: true, dateStart: start, dateEnd: end, reportLabel: `${start}-to-${end}` };
    }
    if (reportType === "yearly") {
        if (year) {
            if (!validateYearFormat(year)) {
                return { ok: false, message: "Invalid year format. Use YYYY" };
            }
            const { start, end } = getYearBoundaries(year);
            return { ok: true, dateStart: start, dateEnd: end, reportLabel: year };
        }
        const currentYear = await getCurrentDatePartForCompany(companyId, "year");
        const { start, end } = getYearBoundaries(currentYear);
        return { ok: true, dateStart: start, dateEnd: end, reportLabel: currentYear };
    }
    if (reportType === "custom") {
        if (!startDate) {
            return { ok: false, message: "Start date is required for custom date range report" };
        }
        if (!endDate) {
            return { ok: false, message: "End date is required for custom date range report" };
        }
        if (!validateDateFormat(startDate)) {
            return { ok: false, message: "Invalid start date format. Use YYYY-MM-DD" };
        }
        if (!validateDateFormat(endDate)) {
            return { ok: false, message: "Invalid end date format. Use YYYY-MM-DD" };
        }
        if (endDate < startDate) {
            return { ok: false, message: "End date cannot be earlier than start date" };
        }
        return {
            ok: true,
            dateStart: startDate,
            dateEnd: endDate,
            reportLabel: `${startDate}-to-${endDate}`,
        };
    }
    // Default: monthly (preserves existing behavior)
    if (month) {
        if (!validateMonthFormat(month)) {
            return { ok: false, message: "Invalid month format. Use YYYY-MM" };
        }
        const { start, end } = getMonthBoundaries(month);
        return { ok: true, dateStart: start, dateEnd: end, reportLabel: month };
    }
    const currentMonth = await getCurrentDatePartForCompany(companyId, "month");
    const { start, end } = getMonthBoundaries(currentMonth);
    return { ok: true, dateStart: start, dateEnd: end, reportLabel: currentMonth };
}
async function getCurrentDatePartForCompany(companyId, part) {
    const [company] = await db
        .select({ timezone: companies.timezone })
        .from(companies)
        .where(eq(companies.id, companyId))
        .limit(1);
    if (!company?.timezone) {
        throw new Error("Company timezone not configured");
    }
    const currentDate = getDateInTimeZone(company.timezone);
    if (part === "year")
        return currentDate.slice(0, 4);
    if (part === "month")
        return currentDate.slice(0, 7);
    return currentDate;
}
/**
 * ATTENDANCE SUMMARY
 */
export const getAttendanceSummary = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const companyId = req.user?.companyId;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: User ID not found",
            });
        }
        if (!companyId) {
            return res.status(403).json({
                success: false,
                message: "Company context is required",
            });
        }
        const [company] = await db
            .select({
            timezone: companies.timezone,
        })
            .from(companies)
            .where(eq(companies.id, companyId))
            .limit(1);
        if (!company?.timezone) {
            return res.status(500).json({
                success: false,
                message: "Company timezone not configured",
            });
        }
        const currentDate = getDateInTimeZone(company.timezone);
        const month = currentDate.slice(0, 7);
        const monthStart = `${month}-01`;
        const monthEnd = `${month}-31`;
        const [attendanceSummary] = await db
            .select({
            presentDays: count(attendance.id),
            totalWorkingMinutes: sql `
          coalesce(sum(${attendance.workingMinutes}), 0)
        `,
        })
            .from(attendance)
            .where(and(eq(attendance.employeeId, userId), eq(attendance.companyId, companyId), eq(attendance.attendanceStatus, "PRESENT"), gte(attendance.attendanceDate, monthStart), lte(attendance.attendanceDate, monthEnd)));
        return res.status(200).json({
            success: true,
            data: {
                month,
                presentDays: Number(attendanceSummary?.presentDays ?? 0),
                totalWorkingMinutes: Number(attendanceSummary?.totalWorkingMinutes ?? 0),
            },
        });
    }
    catch (error) {
        console.error("Get attendance summary error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
};
//# sourceMappingURL=attendance.controller.js.map