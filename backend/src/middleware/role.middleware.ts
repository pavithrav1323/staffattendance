import type {
  NextFunction,
  Response,
} from "express";

import type { UserRole } from "../utils/jwt.js";
import type { AuthRequest } from "./auth.middleware.js";

export function allowRoles(...roles: UserRole[]) {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
}