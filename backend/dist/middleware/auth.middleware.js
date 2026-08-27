import { eq } from "drizzle-orm";
import { db } from "../db/connection.js";
import { users } from "../db/schema/users.js";
import { verifyAccessToken, } from "../utils/jwt.js";
export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null;
    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access token required",
        });
    }
    let payload;
    try {
        payload = verifyAccessToken(token);
    }
    catch {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token",
        });
    }
    try {
        const [user] = await db
            .select({
            id: users.id,
            status: users.status,
            isDeleted: users.isDeleted,
        })
            .from(users)
            .where(eq(users.id, payload.userId))
            .limit(1);
        if (!user || user.isDeleted) {
            return res.status(401).json({
                success: false,
                message: "User account not found or removed",
            });
        }
        if (user.status === "DISABLED") {
            return res.status(403).json({
                success: false,
                message: "Your account has been deactivated. Please contact your administrator.",
                code: "ACCOUNT_DEACTIVATED",
            });
        }
        if (user.status !== "APPROVED") {
            return res.status(403).json({
                success: false,
                message: "Your account is not active.",
                code: "ACCOUNT_NOT_ACTIVE",
            });
        }
        req.user = payload;
        next();
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=auth.middleware.js.map