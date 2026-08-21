import type {
  NextFunction,
  Request,
  Response,
} from "express";

import {
  verifyAccessToken,
  type UserRole,
} from "../utils/jwt.js";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    companyId: string | null;
    role: UserRole;
    departmentId: string | null;
    workLocationId: string | null;
  };
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  const token =
    authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access token required",
    });
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};