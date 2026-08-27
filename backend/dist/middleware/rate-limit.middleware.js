import rateLimit from "express-rate-limit";
export const loginRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Maximum 10 attempts per IP in 15 minutes
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        success: false,
        message: "Too many login attempts. Please try again later.",
    },
});
export const refreshRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30, // standard protection against token flooding
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        success: false,
        message: "Too many refresh attempts. Please try again later.",
    },
});
export const passwordResetRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
        success: false,
        message: "Too many password reset attempts. Please try again later.",
    },
});
//# sourceMappingURL=rate-limit.middleware.js.map