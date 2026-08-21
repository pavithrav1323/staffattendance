import { eq, and, isNull } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { refreshTokens } from "../../db/schema/refresh-tokens.js";
import { AppError } from "../../utils/app-error.js";
const REFRESH_TOKEN_DAYS = 7;
export async function saveRefreshToken(userId, token) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);
    await db.insert(refreshTokens).values({
        userId,
        token,
        expiresAt,
    });
    return expiresAt;
}
export async function getValidRefreshToken(token) {
    const [storedToken] = await db
        .select()
        .from(refreshTokens)
        .where(and(eq(refreshTokens.token, token), isNull(refreshTokens.revokedAt)))
        .limit(1);
    if (!storedToken) {
        throw new AppError(401, "Invalid refresh token");
    }
    if (storedToken.expiresAt < new Date()) {
        throw new AppError(401, "Refresh token expired");
    }
    return storedToken;
}
export async function revokeRefreshToken(token) {
    const [storedToken] = await db
        .update(refreshTokens)
        .set({
        revokedAt: new Date(),
    })
        .where(and(eq(refreshTokens.token, token), isNull(refreshTokens.revokedAt)))
        .returning({
        id: refreshTokens.id,
    });
    if (!storedToken) {
        throw new AppError(401, "Invalid refresh token");
    }
}
export async function revokeAllUserRefreshTokens(userId) {
    await db
        .update(refreshTokens)
        .set({
        revokedAt: new Date(),
    })
        .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
}
//# sourceMappingURL=refresh-token.service.js.map