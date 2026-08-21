import { Router, } from "express";
import { authenticateToken, } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import { requireCompanyContext, requireDepartmentContext, } from "../middleware/tenant.middleware.js";
import { AppError } from "../utils/app-error.js";
import { activateStaff, approveStaff, deactivateStaff, deleteStaff, getAdminAttendance, getAdminAttendanceExport, getAdminAttendanceSummary, getPendingStaff, getStaffList, rejectStaff, resetStaffDevice, resetStaffPassword, } from "../modules/admin/admin.service.js";
const router = Router();
const adminAccess = [
    authenticateToken,
    allowRoles("ADMIN", "MASTER_ADMIN"),
    requireCompanyContext,
    requireDepartmentContext,
];
/**
 * GET /api/admin/staff
 */
router.get("/staff", authenticateToken, allowRoles("ADMIN", "MASTER_ADMIN"), requireCompanyContext, async (req, res, next) => {
    try {
        const data = await getStaffList(req.user);
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
 * GET /api/admin/attendance
 */
router.get("/attendance", authenticateToken, allowRoles("ADMIN"), requireCompanyContext, async (req, res, next) => {
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
        const employeeId = req.query.employeeId
            ? String(req.query.employeeId)
            : undefined;
        const page = req.query.page
            ? Number(req.query.page)
            : undefined;
        const limit = req.query.limit
            ? Number(req.query.limit)
            : undefined;
        const data = await getAdminAttendance(req.user, reportType, date, month, year, employeeId, page, limit);
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
 * GET /api/admin/attendance/export
 */
router.get("/attendance/export", authenticateToken, allowRoles("ADMIN"), requireCompanyContext, async (req, res, next) => {
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
        const employeeId = req.query.employeeId
            ? String(req.query.employeeId)
            : undefined;
        const { csv, filename } = await getAdminAttendanceExport(req.user, reportType, date, month, year, employeeId);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.send(csv);
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/admin/pending-staff
 */
router.get("/pending-staff", ...adminAccess, async (req, res, next) => {
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
 * PATCH /api/admin/staff/:id/approve
 */
router.patch("/staff/:id/approve", ...adminAccess, async (req, res, next) => {
    try {
        const staffId = String(req.params.id);
        const data = await approveStaff(req.user, staffId);
        res.status(200).json({
            success: true,
            message: "Staff approved successfully.",
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/admin/staff/:id/reject
 */
router.patch("/staff/:id/reject", ...adminAccess, async (req, res, next) => {
    try {
        const staffId = String(req.params.id);
        const data = await rejectStaff(req.user, staffId);
        res.status(200).json({
            success: true,
            message: "Staff rejected successfully.",
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/admin/staff/:id/activate
 */
router.patch("/staff/:id/activate", ...adminAccess, async (req, res, next) => {
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
 * PATCH /api/admin/staff/:id/deactivate
 */
router.patch("/staff/:id/deactivate", ...adminAccess, async (req, res, next) => {
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
 * DELETE /api/admin/staff/:id
 */
router.delete("/staff/:id", ...adminAccess, async (req, res, next) => {
    try {
        const staffId = String(req.params.id);
        await deleteStaff(req.user, staffId);
        res.status(200).json({
            success: true,
            message: "Staff deleted successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/admin/staff/:id/reset-password
 */
router.patch("/staff/:id/reset-password", ...adminAccess, async (req, res, next) => {
    try {
        const staffId = String(req.params.id);
        const { temporaryPassword } = req.body;
        if (!temporaryPassword ||
            typeof temporaryPassword !== "string") {
            throw new AppError(400, "Temporary password is required");
        }
        await resetStaffPassword(req.user, staffId, temporaryPassword);
        res.status(200).json({
            success: true,
            message: "Temporary password created successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/admin/staff/:id/reset-device
 */
router.patch("/staff/:id/reset-device", ...adminAccess, async (req, res, next) => {
    try {
        const staffId = String(req.params.id);
        await resetStaffDevice(req.user, staffId);
        res.status(200).json({
            success: true,
            message: "Registered device reset successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * GET /api/admin/attendance/summary
 */
router.get("/attendance/summary", authenticateToken, allowRoles("ADMIN"), requireCompanyContext, async (req, res, next) => {
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
export default router;
//# sourceMappingURL=admin.routes.js.map