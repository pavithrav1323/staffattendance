import { Router, } from "express";
import { authenticateToken, } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createMasterAdmin, getMasterAdmins, activateMasterAdmin, deactivateMasterAdmin, deleteMasterAdmin, } from "../modules/program-owner/program-owner.service.js";
import { createMasterAdminSchema } from "../modules/program-owner/program-owner.schema.js";
const router = Router();
const programOwnerAccess = [
    authenticateToken,
    allowRoles("PROGRAM_OWNER"),
];
/**
 * GET /api/program-owner/master-admins
 */
router.get("/master-admins", ...programOwnerAccess, async (req, res, next) => {
    try {
        const data = await getMasterAdmins(req.user);
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
 * POST /api/program-owner/master-admins
 */
router.post("/master-admins", ...programOwnerAccess, validateBody(createMasterAdminSchema), async (req, res, next) => {
    try {
        const data = await createMasterAdmin(req.user, req.body);
        res.status(201).json({
            success: true,
            message: "Master Admin created successfully.",
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/program-owner/master-admins/:id/activate
 */
router.patch("/master-admins/:id/activate", ...programOwnerAccess, async (req, res, next) => {
    try {
        const userId = String(req.params.id);
        await activateMasterAdmin(req.user, userId);
        res.status(200).json({
            success: true,
            message: "Master Admin activated successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * PATCH /api/program-owner/master-admins/:id/deactivate
 */
router.patch("/master-admins/:id/deactivate", ...programOwnerAccess, async (req, res, next) => {
    try {
        const userId = String(req.params.id);
        await deactivateMasterAdmin(req.user, userId);
        res.status(200).json({
            success: true,
            message: "Master Admin deactivated successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
/**
 * DELETE /api/program-owner/master-admins/:id
 */
router.delete("/master-admins/:id", ...programOwnerAccess, async (req, res, next) => {
    try {
        const userId = String(req.params.id);
        await deleteMasterAdmin(req.user, userId);
        res.status(200).json({
            success: true,
            message: "Master Admin deleted successfully.",
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=program-owner.routes.js.map