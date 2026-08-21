import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export function createAccessToken(payload) {
    return jwt.sign(payload, env.jwtSecret, {
        expiresIn: "1h",
    });
}
export function createRefreshToken(userId) {
    return jwt.sign({
        userId,
        tokenType: "refresh",
    }, env.jwtSecret, {
        expiresIn: "7d",
    });
}
export function verifyAccessToken(token) {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "string" ||
        typeof decoded.userId !== "string" ||
        !isNullableString(decoded.companyId) ||
        !isUserRole(decoded.role) ||
        !isNullableString(decoded.departmentId) ||
        !isNullableString(decoded.workLocationId)) {
        throw new Error("Invalid authentication token");
    }
    return {
        userId: decoded.userId,
        companyId: decoded.companyId,
        role: decoded.role,
        departmentId: decoded.departmentId,
        workLocationId: decoded.workLocationId,
    };
}
export function verifyRefreshToken(token) {
    const decoded = jwt.verify(token, env.jwtSecret);
    if (typeof decoded === "string" ||
        typeof decoded.userId !== "string" ||
        decoded.tokenType !== "refresh") {
        throw new Error("Invalid refresh token");
    }
    return {
        userId: decoded.userId,
    };
}
function isNullableString(value) {
    return typeof value === "string" || value === null;
}
function isUserRole(value) {
    return (value === "PROGRAM_OWNER" ||
        value === "MASTER_ADMIN" ||
        value === "ADMIN" ||
        value === "STAFF");
}
//# sourceMappingURL=jwt.js.map