import { and, count, desc, eq, gte, lte, sql, } from "drizzle-orm";
import { db } from "../db/connection.js";
import { attendance } from "../db/schema/attendance.js";
import { companies } from "../db/schema/companies.js";
import { users } from "../db/schema/users.js";
import { getDateInTimeZone, getMonthBoundaries, validateMonthFormat, } from "../utils/date.js";
import { reverseGeocode } from "../utils/geocoding.js";
/**
 * CLOCK IN
 */
export const clockIn = async (req, res) => {
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
        let month;
        if (req.query.month) {
            const monthParam = String(req.query.month);
            if (!validateMonthFormat(monthParam)) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid month format. Use YYYY-MM",
                });
            }
            month = monthParam;
        }
        else {
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
            month = currentDate.slice(0, 7);
        }
        const { start: monthStart, end: monthEnd } = getMonthBoundaries(month);
        const conditions = [
            eq(attendance.employeeId, userId),
            eq(attendance.companyId, companyId),
            gte(attendance.attendanceDate, monthStart),
            lte(attendance.attendanceDate, monthEnd),
        ];
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
            .orderBy(desc(attendance.attendanceDate), desc(attendance.clockInTime));
        return res.status(200).json({
            success: true,
            data: {
                month,
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