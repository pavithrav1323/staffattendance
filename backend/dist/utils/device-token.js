import crypto from "node:crypto";
export function hashDeviceToken(token) {
    return crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");
}
//# sourceMappingURL=device-token.js.map