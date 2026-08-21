import "dotenv/config";
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
const rpId = process.env.WEBAUTHN_RP_ID || "localhost";
const rpOrigin = process.env.WEBAUTHN_ORIGIN || "http://localhost:5173";
const rpName = process.env.WEBAUTHN_RP_NAME || "Staff Tracker Geo";
// Optional WebAuthn authenticator selection overrides for device compatibility testing
const webauthnAuthenticatorAttachment = process.env.WEBAUTHN_AUTHENTICATOR_ATTACHMENT;
const webauthnResidentKey = process.env.WEBAUTHN_RESIDENT_KEY;
const webauthnUserVerification = process.env.WEBAUTHN_USER_VERIFICATION;
if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured");
}
if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured");
}
export const env = {
    databaseUrl,
    jwtSecret,
    rpId,
    rpOrigin,
    rpName,
    webauthnAuthenticatorAttachment,
    webauthnResidentKey,
    webauthnUserVerification,
};
//# sourceMappingURL=env.js.map