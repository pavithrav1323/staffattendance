import { Router, } from "express";
import { authenticateToken, } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import { requireCompanyContext } from "../middleware/tenant.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createAdminSchema, createDepartmentSchema, deleteAttendanceRecordsSchema, deleteStaffDataSchema, updateAttendanceTimeSchema, } from "../modules/master-admin/master-admin.schema.js";
import { activateAdmin, createAdmin, createDepartment, deactivateAdmin, deleteAdmin, deleteDepartment, getAdmins, getDepartments, getMasterAdminAttendance, getMasterAdminAttendanceExport, getMasterAdminAttendanceRecordsPreview, getMasterAdminStaffDataPreview, updateMasterAdminAttendanceTime, deleteMasterAdminStaffData, deleteMasterAdminAttendanceRecords, } from "../modules/master-admin/master-admin.service.js";
import { getAdminAttendanceSummary, getApprovedStaff, getMasterAdminDashboardStats, getPendingStaff, approveStaff, rejectStaff, activateStaff, deactivateStaff, } from "../modules/admin/admin.service.js";
const router = Router();
const masterAdminAccess = [
    authenticateToken,
    allowRoles("MASTER_ADMIN"),
    requireCompanyContext,
];
const masterAdminAttendanceAccess = [
    authenticateToken,
    allowRoles("ADMIN", "MASTER_ADMIN"),
    requireCompanyContext,
];
/**
 * GET /api/master-admin/departments
 */
router.get("/departments", ...masterAdminAccess, async (req, res, next) => {
    try {
        const data = await getDepartments(req.user);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/master-admin/departments
 */
router.post("/departments", ...masterAdminAccess, validateBody(createDepartmentSchema), async (req, res, next) => {
    try {
        const data = await createDepartment(req.user, req.body);
        res.status(201).json({
            success: true,
            message: "Department created successfully.",
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/master-admin/admins
 */
router.get("/admins", ...masterAdminAccess, async (req, res, next) => {
    try {
        const data = await getAdmins(req.user);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * POST /api/master-admin/admins
 */
router.post("/admins", ...masterAdminAccess, validateBody(createAdminSchema), async (req, res, next) => {
    try {
        const data = await createAdmin(req.user, req.body);
        res.status(201).json({
            success: true,
            message: "Admin created successfully.",
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/master-admin/departments/:id
 */
router.delete("/departments/:id", ...masterAdminAccess, async (req, res, next) => {
    try {
        const departmentId = String(req.params.id);
        await deleteDepartment(req.user, departmentId);
        res.status(200).json({
            success: true,
            message: "Department deleted successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/master-admin/admins/:id
 */
router.delete("/admins/:id", ...masterAdminAccess, async (req, res, next) => {
    try {
        const adminId = String(req.params.id);
        await deleteAdmin(req.user, adminId);
        res.status(200).json({
            success: true,
            message: "Admin deleted successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/master-admin/admins/:id/activate
 */
router.patch("/admins/:id/activate", ...masterAdminAccess, async (req, res, next) => {
    try {
        const adminId = String(req.params.id);
        await activateAdmin(req.user, adminId);
        res.status(200).json({
            success: true,
            message: "Admin activated successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/master-admin/admins/:id/deactivate
 */
router.patch("/admins/:id/deactivate", ...masterAdminAccess, async (req, res, next) => {
    try {
        const adminId = String(req.params.id);
        await deactivateAdmin(req.user, adminId);
        res.status(200).json({
            success: true,
            message: "Admin deactivated successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/master-admin/attendance
 */
router.get("/attendance", ...masterAdminAttendanceAccess, async (req, res, next) => {
    try {
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
        const departmentId = req.query.departmentId
            ? String(req.query.departmentId)
            : undefined;
        const employeeId = req.query.employeeId
            ? String(req.query.employeeId)
            : undefined;
        const page = req.query.page
            ? Number(req.query.page)
            : undefined;
        const limit = req.query.limit
            ? Number(req.query.limit)
            : undefined;
        const data = await getMasterAdminAttendance(req.user, reportType, date, month, year, startDate, endDate, departmentId, employeeId, page, limit);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PUT /api/master-admin/attendance/:attendanceId/time
 */
router.put("/attendance/:attendanceId/time", ...masterAdminAccess, validateBody(updateAttendanceTimeSchema), async (req, res, next) => {
    try {
        const attendanceId = String(req.params.attendanceId);
        const result = await updateMasterAdminAttendanceTime(req.user, attendanceId, req.body);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/master-admin/staff-data
 */
router.delete("/staff-data", ...masterAdminAccess, validateBody(deleteStaffDataSchema), async (req, res, next) => {
    try {
        const result = await deleteMasterAdminStaffData(req.user, req.body);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/master-admin/staff-data/preview
 */
router.get("/staff-data/preview", ...masterAdminAccess, async (req, res, next) => {
    try {
        const input = {
            companyId: String(req.query.companyId || req.user.companyId),
            departmentId: req.query.departmentId
                ? String(req.query.departmentId)
                : undefined,
            employeeId: req.query.employeeId
                ? String(req.query.employeeId)
                : undefined,
            dateStart: req.query.dateStart
                ? String(req.query.dateStart)
                : undefined,
            dateEnd: req.query.dateEnd
                ? String(req.query.dateEnd)
                : undefined,
        };
        const result = await getMasterAdminStaffDataPreview(req.user, input);
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/master-admin/attendance-records/preview
 */
router.get("/attendance-records/preview", ...masterAdminAccess, async (req, res, next) => {
    try {
        const input = {
            companyId: String(req.query.companyId || req.user.companyId),
            departmentId: req.query.departmentId
                ? String(req.query.departmentId)
                : undefined,
            employeeId: req.query.employeeId
                ? String(req.query.employeeId)
                : undefined,
            startDate: req.query.startDate
                ? String(req.query.startDate)
                : undefined,
            endDate: req.query.endDate
                ? String(req.query.endDate)
                : undefined,
        };
        const result = await getMasterAdminAttendanceRecordsPreview(req.user, input);
        res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.set("Pragma", "no-cache");
        res.set("Expires", "0");
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/master-admin/attendance-records
 */
router.delete("/attendance-records", ...masterAdminAccess, validateBody(deleteAttendanceRecordsSchema), async (req, res, next) => {
    try {
        const result = await deleteMasterAdminAttendanceRecords(req.user, req.body);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/master-admin/attendance/export
 */
router.get("/attendance/export", ...masterAdminAttendanceAccess, async (req, res, next) => {
    try {
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
        const departmentId = req.query.departmentId
            ? String(req.query.departmentId)
            : undefined;
        const employeeId = req.query.employeeId
            ? String(req.query.employeeId)
            : undefined;
        const timezone = req.query.timezone
            ? String(req.query.timezone)
            : undefined;
        const { csv, filename } = await getMasterAdminAttendanceExport(req.user, reportType, date, month, year, startDate, endDate, departmentId, employeeId, timezone);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(csv);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/master-admin/attendance/summary
 */
router.get("/attendance/summary", ...masterAdminAttendanceAccess, async (req, res, next) => {
    try {
        const data = await getAdminAttendanceSummary(req.user);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/master-admin/staff/pending
 */
router.get("/staff/pending", ...masterAdminAccess, async (req, res, next) => {
    try {
        const data = await getPendingStaff(req.user);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/master-admin/staff/approved
 */
router.get("/staff/approved", ...masterAdminAccess, async (req, res, next) => {
    try {
        const data = await getApprovedStaff(req.user);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/master-admin/staff/:id/approve
 */
router.patch("/staff/:id/approve", ...masterAdminAccess, async (req, res, next) => {
    try {
        const staffId = String(req.params.id);
        const data = await approveStaff(req.user, staffId);
        res.status(200).json({
            success: true,
            message: "Staff registration approved successfully.",
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/master-admin/staff/:id/reject
 */
router.patch("/staff/:id/reject", ...masterAdminAccess, async (req, res, next) => {
    try {
        const staffId = String(req.params.id);
        const data = await rejectStaff(req.user, staffId);
        res.status(200).json({
            success: true,
            message: "Staff registration rejected.",
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/master-admin/staff/:id/activate
 */
router.patch("/staff/:id/activate", ...masterAdminAccess, async (req, res, next) => {
    try {
        const staffId = String(req.params.id);
        const data = await activateStaff(req.user, staffId);
        res.status(200).json({
            success: true,
            message: "Staff activated successfully.",
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/master-admin/staff/:id/deactivate
 */
router.patch("/staff/:id/deactivate", ...masterAdminAccess, async (req, res, next) => {
    try {
        const staffId = String(req.params.id);
        const data = await deactivateStaff(req.user, staffId);
        res.status(200).json({
            success: true,
            message: "Staff deactivated successfully.",
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/master-admin/dashboard
 * Returns dashboard statistics for Master Admin
 */
router.get("/dashboard", ...masterAdminAccess, async (req, res, next) => {
    try {
        const data = await getMasterAdminDashboardStats(req.user);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=master-admin.routes.js.map