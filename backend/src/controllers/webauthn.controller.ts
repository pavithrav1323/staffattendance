import type { Request, Response, NextFunction } from "express";

import type { AuthRequest } from "../middleware/auth.middleware.js";
import {
  generateAuthenticationOptionsService,
  generateRegistrationOptionsService,
  hasBiometricCredentials,
  verifyAuthenticationService,
  verifyRegistrationService,
} from "../modules/webauthn/webauthn.service.js";

/**
 * Check if user has biometric credentials
 */
export const checkBiometricCredentials = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const hasCredentials = await hasBiometricCredentials(req.user.userId);

    res.status(200).json({
      success: true,
      data: { hasCredentials },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate registration options
 */
export const generateRegistrationOptions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const result = await generateRegistrationOptionsService(req.user, req.user.userId);

    res.status(200).json({
      success: true,
      data: result.options,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify registration response
 */
export const verifyRegistration = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    console.log('[WEBAUTHN][BACKEND] REGISTER VERIFY REQUEST RECEIVED');

    const result = await verifyRegistrationService(req.user, req.user.userId, req.body);

    res.status(200).json({
      success: true,
      message: "Biometric registration successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate authentication options
 */
export const generateAuthenticationOptions = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const result = await generateAuthenticationOptionsService(req.user, req.user.userId);

    res.status(200).json({
      success: true,
      data: result.options,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify authentication response
 */
export const verifyAuthentication = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    const result = await verifyAuthenticationService(req.user, req.user.userId, req.body);

    res.status(200).json({
      success: true,
      message: "Biometric verification successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};