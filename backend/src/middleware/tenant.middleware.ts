import type {
  NextFunction,
  Response,
} from "express";

import type { AuthRequest } from "./auth.middleware.js";

export function requireCompanyContext(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (!req.user.companyId && req.user.role !== "PROGRAM_OWNER") {
    return res.status(403).json({
      success: false,
      message: "Company context is required",
    });
  }

  next();
}

export function requireDepartmentContext(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (
    req.user.role === "ADMIN" &&
    !req.user.departmentId
  ) {
    return res.status(403).json({
      success: false,
      message: "Department access is not available",
    });
  }

  next();
}