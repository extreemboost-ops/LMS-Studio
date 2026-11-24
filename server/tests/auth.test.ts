import { hashPassword, verifyPassword, generateSecureToken, hashToken } from "../src/utils/crypto.js";
import { signAccessToken, verifyAccessToken } from "../src/utils/jwt.js";
import jwt from "jsonwebtoken";

export async function runAuthUnitTests(): Promise<{ passed: boolean; message: string }> {
  try {
    // 1. Argon2id Password Hashing Test
    const password = "StrongPassword123!";
    const hashedPassword = await hashPassword(password);

    if (!hashedPassword.startsWith("$argon2id$")) {
      return { passed: false, message: "Expected Argon2id formatted hash" };
    }

    const matches = await verifyPassword(password, hashedPassword);
    if (!matches) {
      return { passed: false, message: "Expected valid password to verify against Argon2id hash" };
    }

    const fails = await verifyPassword("WrongPassword!", hashedPassword);
    if (fails) {
      return { passed: false, message: "Expected invalid password verification to return false" };
    }

    // 2. Token Generation and Hashing
    const token = generateSecureToken(32);
    if (token.length !== 64) {
      return { passed: false, message: `Expected 64 hex characters for 32 bytes, got ${token.length}` };
    }

    const hashedToken = hashToken(token);
    if (hashedToken.length !== 64) {
      return { passed: false, message: "Expected SHA-256 hash length 64" };
    }

    // 3. JWT Access Token Signing & Verification
    const payload = {
      sub: "user-12345",
      email: "test@example.com",
      isSuperAdmin: false,
      orgId: "org-12345",
      role: "OWNER",
      permissions: ["content:create", "scorm:export"],
    };

    const tokenJwt = signAccessToken(payload);
    const decoded = verifyAccessToken(tokenJwt);

    if (decoded.sub !== payload.sub || decoded.email !== payload.email || decoded.orgId !== payload.orgId) {
      return { passed: false, message: "Decoded JWT claims mismatch" };
    }

    // 4. Invalid Signature Rejection
    let caughtInvalidSig = false;
    try {
      const tampered = tokenJwt.slice(0, -6) + "abcdef";
      verifyAccessToken(tampered);
    } catch {
      caughtInvalidSig = true;
    }

    if (!caughtInvalidSig) {
      return { passed: false, message: "Expected tampered JWT signature to be rejected" };
    }

    // 5. Expired Token Rejection
    let caughtExpired = false;
    try {
      // Craft an already expired token
      const expiredToken = jwt.sign(payload, "dev-secret-key-scorm-h5p-studio-min32chars-for-safety", {
        algorithm: "HS256",
        expiresIn: "-1s",
        issuer: "scorm-h5p-studio",
        audience: "scorm-h5p-studio-api",
      });
      verifyAccessToken(expiredToken);
    } catch {
      caughtExpired = true;
    }

    if (!caughtExpired) {
      return { passed: false, message: "Expected expired JWT to be rejected" };
    }

    return {
      passed: true,
      message: "Argon2id hashing, secure token generation, JWT signing, signature verification, and expiry rejection passed",
    };
  } catch (err) {
    return { passed: false, message: err instanceof Error ? err.message : String(err) };
  }
}
