import { Router, } from "express";
import { authenticateToken, } from "../middleware/auth.middleware.js";
import { allowRoles } from "../middleware/role.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createLeaveRequestSchema } from "../modules/leave/leave.schema.js";
import { createLeaveRequest, getMyLeaveRequests, } from "../modules/leave/leave.service.js";
const router = Router();
router.get("/my", authenticateToken, allowRoles("STAFF"), async (req, res, next) => {
    try {
        const data = await getMyLeaveRequests(req.user);
        res.status(200).json({
            success: true,
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post("/", authenticateToken, allowRoles("STAFF"), validateBody(createLeaveRequestSchema), async (req, res, next) => {
    try {
        const data = await createLeaveRequest(req.user, req.body);
        res.status(201).json({
            success: true,
            message: "Leave request submitted successfully.",
            data,
        });
    }
    catch (error) {
        next(error);
    }
});
export default router;
//# sourceMappingURL=leave.routes.js.map