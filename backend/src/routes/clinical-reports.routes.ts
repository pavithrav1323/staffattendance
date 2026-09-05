import { Router, type NextFunction, type Response } from "express";

import {
  authenticateToken,
  type AuthRequest,
} from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import { requireCompanyContext } from "../middleware/tenant.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  createClinicalReport,
  generateDocxForReport,
  generatePdfForReport,
  getClinicalReportById,
  getClinicalReports,
  updateClinicalReport,
} from "../modules/clinical-reports/clinical-reports.service.js";
import {
  createClinicalReportSchema,
  updateClinicalReportSchema,
} from "../modules/clinical-reports/clinical-reports.schema.js";

const router = Router();

const authenticatedAccess = [authenticateToken, requireCompanyContext];

/**
 * POST /api/clinical-reports
 */
router.post(
  "/",
  ...authenticatedAccess,
  allowRoles("STAFF"),
  validateBody(createClinicalReportSchema),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const report = await createClinicalReport(req.user!, req.body);

      res.status(201).json({
        success: true,
        message: "Clinical report submitted successfully",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/clinical-reports
 */
router.get(
  "/",
  ...authenticatedAccess,
  allowRoles("STAFF", "ADMIN", "MASTER_ADMIN"),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const reports = await getClinicalReports(req.user!);

      res.status(200).json({
        success: true,
        data: reports,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/clinical-reports/:id
 */
router.get(
  "/:id",
  ...authenticatedAccess,
  allowRoles("STAFF", "ADMIN", "MASTER_ADMIN"),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const reportId = req.params.id as string;
      const report = await getClinicalReportById(req.user!, reportId);

      res.status(200).json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/clinical-reports/:id
 */
router.put(
  "/:id",
  ...authenticatedAccess,
  allowRoles("STAFF"),
  validateBody(updateClinicalReportSchema),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const reportId = req.params.id as string;
      const report = await updateClinicalReport(
        req.user!,
        reportId,
        req.body
      );

      res.status(200).json({
        success: true,
        message: "Clinical report updated successfully",
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/clinical-reports/:id/pdf
 */
router.get(
  "/:id/pdf",
  ...authenticatedAccess,
  allowRoles("STAFF", "ADMIN", "MASTER_ADMIN"),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const reportId = req.params.id as string;
      const pdfBuffer = await generatePdfForReport(req.user!, reportId);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="clinical-report-${reportId}.pdf"`
      );
      res.setHeader("Content-Type", "application/pdf");
      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/clinical-reports/:id/docx
 */
router.get(
  "/:id/docx",
  ...authenticatedAccess,
  allowRoles("STAFF", "ADMIN", "MASTER_ADMIN"),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const reportId = req.params.id as string;
      const docxBuffer = await generateDocxForReport(req.user!, reportId);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="clinical-report-${reportId}.docx"`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.send(docxBuffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
