import { eq } from "drizzle-orm";
import { db } from "../../db/connection.js";
import { users } from "../../db/schema/users.js";
import { webauthnCredentials } from "../../db/schema/webauthn-credentials.js";
import { AppError } from "../../utils/app-error.js";
import { env } from "../../config/env.js";
import { generateAuthenticationOptions, generateRegistrationOptions, verifyAuthenticationResponse, verifyRegistrationResponse, } from "@simplewebauthn/server";
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const challengeStore = new Map();
function setChallenge(userId, challenge) {
    challengeStore.set(userId, {
        challenge,
        expiresAt: Date.now() + CHALLENGE_TTL_MS,
    });
}
function consumeChallenge(userId) {
    const stored = challengeStore.get(userId);
    if (!stored)
        return null;
    challengeStore.delete(userId);
    if (stored.expiresAt < Date.now())
        return null;
    return stored.challenge;
}
/**
 * Check if user has biometric credentials
 */
export async function hasBiometricCredentials(userId) {
    const [credential] = await db
        .select({ id: webauthnCredentials.id })
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, userId))
        .limit(1);
    return !!credential;
}
/**
 * Generate registration options for biometric enrollment
 */
export async function generateRegistrationOptionsService(_authUser, userId) {
    const [user] = await db
        .select({ id: users.id, email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    if (!user) {
        throw new AppError(404, "User not found");
    }
    const existingCredentials = await db
        .select({ credentialId: webauthnCredentials.credentialId })
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, userId));
    const authenticatorSelection = {};
    if (env.webauthnAuthenticatorAttachment) {
        authenticatorSelection.authenticatorAttachment = env.webauthnAuthenticatorAttachment;
    }
    if (env.webauthnResidentKey) {
        authenticatorSelection.residentKey = env.webauthnResidentKey;
    }
    if (env.webauthnUserVerification) {
        authenticatorSelection.userVerification = env.webauthnUserVerification;
    }
    const options = await generateRegistrationOptions({
        rpName: env.rpName,
        rpID: env.rpId,
        userID: Buffer.from(user.id, "utf8"),
        userName: user.email,
        excludeCredentials: existingCredentials.map((c) => ({
            id: c.credentialId,
            type: "public-key",
        })),
        authenticatorSelection: Object.keys(authenticatorSelection).length > 0
            ? authenticatorSelection
            : undefined,
    });
    console.log('[WEBAUTHN][BACKEND] register options:', {
        rp: { id: env.rpId, name: env.rpName },
        origin: env.rpOrigin,
        user: { name: user.email, idType: typeof user.id, idLength: user.id.length },
        challenge: options.challenge,
        timeout: options.timeout,
        attestation: options.attestation,
        authenticatorSelection: options.authenticatorSelection,
        excludeCredentialsCount: options.excludeCredentials?.length ?? 0,
        pubKeyCredParams: options.pubKeyCredParams,
    });
    setChallenge(userId, options.challenge);
    return { options };
}
/**
 * Verify registration response
 */
export async function verifyRegistrationService(_authUser, userId, response) {
    const [user] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
    if (!user) {
        throw new AppError(404, "User not found");
    }
    const expectedChallenge = consumeChallenge(userId);
    if (!expectedChallenge) {
        throw new AppError(400, "Challenge expired or not found");
    }
    const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge,
        expectedOrigin: env.rpOrigin,
        expectedRPID: env.rpId,
    });
    if (!verification.verified || !verification.registrationInfo) {
        throw new AppError(400, "Biometric registration failed");
    }
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await db.insert(webauthnCredentials).values({
        userId: user.id,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter.toString(),
        deviceType: credentialDeviceType,
        backedUp: credentialBackedUp,
    });
    return { verified: true };
}
/**
 * Generate authentication options for verification
 */
export async function generateAuthenticationOptionsService(_authUser, userId) {
    const credentials = await db
        .select({ credentialId: webauthnCredentials.credentialId })
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.userId, userId));
    if (credentials.length === 0) {
        throw new AppError(404, "No biometric credentials found");
    }
    const options = await generateAuthenticationOptions({
        rpID: env.rpId,
        userVerification: "preferred",
        allowCredentials: credentials.map((c) => ({
            id: c.credentialId,
            type: "public-key",
        })),
    });
    setChallenge(userId, options.challenge);
    return { options };
}
/**
 * Verify authentication response
 */
export async function verifyAuthenticationService(_authUser, userId, response) {
    const responseCredentialId = typeof response?.id === "string" ? response.id : null;
    if (!responseCredentialId) {
        throw new AppError(400, "Credential ID is required");
    }
    const [credential] = await db
        .select({
        credentialId: webauthnCredentials.credentialId,
        publicKey: webauthnCredentials.publicKey,
        counter: webauthnCredentials.counter,
    })
        .from(webauthnCredentials)
        .where(eq(webauthnCredentials.credentialId, responseCredentialId))
        .limit(1);
    if (!credential) {
        throw new AppError(404, "Biometric credential not found");
    }
    const expectedChallenge = consumeChallenge(userId);
    if (!expectedChallenge) {
        throw new AppError(400, "Challenge expired or not found");
    }
    const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: env.rpOrigin,
        expectedRPID: env.rpId,
        credential: {
            id: credential.credentialId,
            publicKey: Buffer.from(credential.publicKey, "base64url"),
            counter: parseInt(credential.counter, 10),
        },
    });
    if (!verification.verified) {
        throw new AppError(401, "Biometric verification failed");
    }
    await db
        .update(webauthnCredentials)
        .set({ counter: verification.authenticationInfo.newCounter.toString() })
        .where(eq(webauthnCredentials.credentialId, credential.credentialId));
    return { verified: true };
}
//# sourceMappingURL=webauthn.service.js.map