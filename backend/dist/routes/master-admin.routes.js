import { Router, } from "express";
import { authenticateToken, } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import { requireCompanyContext } from "../middleware/tenant.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createAdminSchema, createDepartmentSchema, } from "../modules/master-admin/master-admin.schema.js";
import { activateAdmin, createAdmin, createDepartment, deactivateAdmin, deleteAdmin, deleteDepartment, getAdmins, getDepartments, getMasterAdminAttendance, getMasterAdminAttendanceExport, } from "../modules/master-admin/master-admin.service.js";
import { getAdminAttendanceSummary } from "../modules/admin/admin.service.js";
const router = Router();
const masterAdminAccess = [
    authenticateToken,
    allowRoles("MASTER_ADMIN"),
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
router.get("/attendance", ...masterAdminAccess, async (req, res, next) => {
    try {
        const month = req.query.month
            ? String(req.query.month)
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
        const data = await getMasterAdminAttendance(req.user, month, departmentId, employeeId, page, limit);
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
 * GET /api/master-admin/attendance/export
 */
router.get("/attendance/export", ...masterAdminAccess, async (req, res, next) => {
    try {
        const month = req.query.month
            ? String(req.query.month)
            : undefined;
        const departmentId = req.query.departmentId
            ? String(req.query.departmentId)
            : undefined;
        const employeeId = req.query.employeeId
            ? String(req.query.employeeId)
            : undefined;
        const { csv, filename } = await getMasterAdminAttendanceExport(req.user, month, departmentId, employeeId);
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
router.get("/attendance/summary", ...masterAdminAccess, async (req, res, next) => {
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
//# sourceMappingURL=master-admin.routes.js.map