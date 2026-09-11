import {
  Router,
  type NextFunction,
  type Request,
  type Response,
} from "express";

import {
  authenticateToken,
  type AuthRequest,
} from "../middleware/auth.middleware.js";

import {
  changePassword,
  getMyProfile,
  getPublicCompanies,
  getPublicDepartments,
  login,
  logout,
  refreshAccessToken,
  registerStaff,
  registerProgramOwner,
} from "../modules/auth/auth.service.js";

import {
  loginSchema,
  refreshSchema,
  registerSchema,
  registerProgramOwnerSchema,
} from "../modules/auth/auth.schema.js";

import { allowRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  loginRateLimiter,
  refreshRateLimiter,
  passwordResetRateLimiter,
} from "../middleware/rate-limit.middleware.js";
import { AppError } from "../utils/app-error.js";

const router = Router();

router.post(
  "/register",
  validateBody(registerSchema),
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await registerStaff(req.body);

      res.status(201).json({
        success: true,
        message:
          "Staff registration submitted successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/departments",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const companyCode = String(req.query.companyCode || "");

      if (!companyCode) {
        throw new AppError(400, "Company code is required");
      }

      const data = await getPublicDepartments(companyCode);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/companies",
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await getPublicCompanies();

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.get(
  "/me",
  authenticateToken,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const data = await getMyProfile(req.user!);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/login",
  loginRateLimiter,
  validateBody(loginSchema),
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await login(req.body);

      res.status(200).json({
        success: true,
        message: "Login successful.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/refresh",
  refreshRateLimiter,
  validateBody(refreshSchema),
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await refreshAccessToken(
        req.body
      );

      res.status(200).json({
        success: true,
        message: "Access token refreshed successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/logout",
  validateBody(refreshSchema),
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await logout(req.body.refreshToken);

      res.status(200).json({
        success: true,
        message: "Logout successful.",
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Creating a PROGRAM_OWNER is a privileged operation.
 * The first PROGRAM_OWNER must be created with the
 * `npm run bootstrap:program-admin` script; afterwards only an
 * authenticated PROGRAM_OWNER may create additional Program Owners.
 */
router.post(
  "/program-owner/register",
  authenticateToken,
  allowRoles("PROGRAM_OWNER"),
  validateBody(registerProgramOwnerSchema),
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await registerProgramOwner(req.body);

      res.status(201).json({
        success: true,
        message: "Program Owner created successfully.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/change-password",
  passwordResetRateLimiter,
  authenticateToken,
  async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { newPassword } = req.body;

      if (!newPassword || typeof newPassword !== "string") {
        throw new AppError(400, "New password is required");
      }

      await changePassword(req.user!, newPassword);

      res.status(200).json({
        success: true,
        message: "Password changed successfully.",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;