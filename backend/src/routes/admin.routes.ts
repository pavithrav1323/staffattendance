import {
  Router,
  type NextFunction,
  type Response,
} from "express";

import {
  authenticateToken,
  type AuthRequest,
} from "../middleware/auth.middleware.js";

import { allowRoles } from "../middleware/role.middleware.js";

import {
  requireCompanyContext,
  requireDepartmentContext,
} from "../middleware/tenant.middleware.js";

import { AppError } from "../utils/app-error.js";

import {
  activateStaff,
  approveStaff,
  deactivateStaff,
  deleteDeletedStaffAttendance,
  deleteStaff,
  getAdminAttendance,
  getAdminAttendanceExport,
  getAdminAttendanceSummary,
  getAdminDashboardStats,
  getDeletedStaff,
  getDeletedStaffAttendance,
  getPendingStaff,
  getStaffList,
  rejectStaff,
  resetStaffDevice,
  resetStaffPassword,
} from "../modules/admin/admin.service.js";
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
router.get(
  "/staff",
  authenticateToken,
  allowRoles("ADMIN", "MASTER_ADMIN"),
  requireCompanyContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await getStaffList(req.user!);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/attendance
 */
router.get(
  "/attendance",
  authenticateToken,
  allowRoles("ADMIN", "MASTER_ADMIN"),
  requireCompanyContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
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

      const employeeId = req.query.employeeId
        ? String(req.query.employeeId)
        : undefined;

      const page = req.query.page
        ? Number(req.query.page)
        : undefined;

      const limit = req.query.limit
        ? Number(req.query.limit)
        : undefined;

      const data = await getAdminAttendance(
        req.user!,
        reportType,
        date,
        month,
        year,
        startDate,
        endDate,
        employeeId,
        page,
        limit
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/attendance/export
 */
router.get(
  "/attendance/export",
  authenticateToken,
  allowRoles("ADMIN", "MASTER_ADMIN"),
  requireCompanyContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
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

      const employeeId = req.query.employeeId
        ? String(req.query.employeeId)
        : undefined;

      const timezone = req.query.timezone
        ? String(req.query.timezone)
        : undefined;

      const { csv, filename } = await getAdminAttendanceExport(
        req.user!,
        reportType,
        date,
        month,
        year,
        startDate,
        endDate,
        employeeId,
        timezone
      );

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );

      return res.send(csv);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/deleted-staff
 * Returns list of soft-deleted staff members
 */
router.get(
  "/deleted-staff",
  authenticateToken,
  allowRoles("ADMIN", "MASTER_ADMIN"),
  requireCompanyContext,
  requireDepartmentContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await getDeletedStaff(req.user!);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/deleted-staff/:employeeId/attendance
 * Returns deleted attendance records for a specific deleted staff member
 */
router.get(
  "/deleted-staff/:employeeId/attendance",
  authenticateToken,
  allowRoles("ADMIN", "MASTER_ADMIN"),
  requireCompanyContext,
  requireDepartmentContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const employeeId = String(req.params.employeeId);

      const data = await getDeletedStaffAttendance(req.user!, employeeId);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/deleted-staff/:employeeId/attendance
 * Permanently deletes attendance records for a specific deleted staff member
 */
router.delete(
  "/deleted-staff/:employeeId/attendance",
  authenticateToken,
  allowRoles("ADMIN", "MASTER_ADMIN"),
  requireCompanyContext,
  requireDepartmentContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const employeeId = String(req.params.employeeId);

      await deleteDeletedStaffAttendance(req.user!, employeeId);

      res.status(200).json({
        success: true,
        message: "Deleted staff attendance records removed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/pending-staff
 * Restricted to MASTER_ADMIN only
 */
router.get(
  "/pending-staff",
  authenticateToken,
  allowRoles("MASTER_ADMIN"),
  requireCompanyContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await getPendingStaff(req.user!);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/admin/staff/:id/approve
 * Restricted to MASTER_ADMIN only
 */
router.patch(
  "/staff/:id/approve",
  authenticateToken,
  allowRoles("MASTER_ADMIN"),
  requireCompanyContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const staffId = String(req.params.id);

      const data = await approveStaff(
        req.user!,
        staffId
      );

      res.status(200).json({
        success: true,
        message: "Staff approved successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/admin/staff/:id/reject
 * Restricted to MASTER_ADMIN only
 */
router.patch(
  "/staff/:id/reject",
  authenticateToken,
  allowRoles("MASTER_ADMIN"),
  requireCompanyContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const staffId = String(req.params.id);

      const data = await rejectStaff(
        req.user!,
        staffId
      );

      res.status(200).json({
        success: true,
        message: "Staff rejected successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/admin/staff/:id/activate
 */
router.patch(
  "/staff/:id/activate",
  ...adminAccess,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const staffId = String(req.params.id);

      const data = await activateStaff(req.user!, staffId);

      res.status(200).json({
        success: true,
        message: "Staff activated successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/admin/staff/:id/deactivate
 */
router.patch(
  "/staff/:id/deactivate",
  ...adminAccess,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const staffId = String(req.params.id);

      const data = await deactivateStaff(req.user!, staffId);

      res.status(200).json({
        success: true,
        message: "Staff deactivated successfully.",
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/staff/:id
 */
router.delete(
  "/staff/:id",
  ...adminAccess,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const staffId = String(req.params.id);

      await deleteStaff(req.user!, staffId);

      res.status(200).json({
        success: true,
        message: "Staff deleted successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/admin/staff/:id/reset-password
 */
router.patch(
  "/staff/:id/reset-password",
  ...adminAccess,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const staffId = String(req.params.id);
      const { temporaryPassword } = req.body;

      if (
        !temporaryPassword ||
        typeof temporaryPassword !== "string"
      ) {
        throw new AppError(400, "Temporary password is required");
      }

      await resetStaffPassword(
        req.user!,
        staffId,
        temporaryPassword
      );

      res.status(200).json({
        success: true,
        message: "Temporary password created successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/admin/staff/:id/reset-device
 */
router.patch(
  "/staff/:id/reset-device",
  ...adminAccess,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const staffId = String(req.params.id);

      await resetStaffDevice(req.user!, staffId);

      res.status(200).json({
        success: true,
        message: "Registered device reset successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/attendance/summary
 */
router.get(
  "/attendance/summary",
  authenticateToken,
  allowRoles("ADMIN", "MASTER_ADMIN"),
  requireCompanyContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await getAdminAttendanceSummary(
        req.user!
      );

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/dashboard
 * Returns dashboard statistics for Admin / Master Admin
 */
router.get(
  "/dashboard",
  authenticateToken,
  allowRoles("ADMIN", "MASTER_ADMIN"),
  requireCompanyContext,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await getAdminDashboardStats(req.user!);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;