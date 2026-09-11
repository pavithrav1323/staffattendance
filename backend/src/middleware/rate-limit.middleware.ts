import rateLimit, { ipKeyGenerator } from "express-rate-limit";

/**
 * Throttle login attempts per account (falling back to the client IP when no
 * email is supplied). Keying on the email keeps the limiter accurate when the
 * API runs behind a proxy or shared NAT, where many legitimate users share a
 * single IP address.
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 failed attempts per account in 15 minutes
  skipSuccessfulRequests: true,
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    return email
      ? `login:${email}`
      : `login-ip:${ipKeyGenerator(req.ip ?? "")}`;
  },
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
  max: 100, // standard protection against token flooding
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
