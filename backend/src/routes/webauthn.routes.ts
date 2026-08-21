import { Router } from "express";

import { authenticateToken } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import {
  checkBiometricCredentials,
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthentication,
  verifyRegistration,
} from "../controllers/webauthn.controller.js";

const router = Router();

const staffAccess = [authenticateToken, allowRoles("STAFF")];

/**
 * GET /api/webauthn/credentials - Check if user has biometric credentials
 */
router.get("/credentials", ...staffAccess, checkBiometricCredentials);

/**
 * POST /api/webauthn/register/options - Generate registration options
 */
router.post("/register/options", ...staffAccess, generateRegistrationOptions);

/**
 * POST /api/webauthn/register/verify - Verify registration
 */
router.post("/register/verify", ...staffAccess, verifyRegistration);

/**
 * POST /api/webauthn/authenticate/options - Generate authentication options
 */
router.post("/authenticate/options", ...staffAccess, generateAuthenticationOptions);

/**
 * POST /api/webauthn/authenticate/verify - Verify authentication
 */
router.post("/authenticate/verify", ...staffAccess, verifyAuthentication);

export default router;