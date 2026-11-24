import crypto from "crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";

export interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

/**
 * High-grade cryptographic protection for LMS credentials and LTI 1.3 key sets
 */
export class LMSCryptoService {
  private static ALGORITHM = "aes-256-gcm";
  private static IV_LENGTH = 12; // 96 bits for AES-GCM
  private static cachedRsaKeyPair: { publicKey: string; privateKey: string; keyId: string } | null = null;

  /**
   * Derive a 32-byte master encryption key from environment configuration
   */
  private static getMasterKey(customKey?: string): Buffer {
    const secret = customKey || env.JWT_SECRET || "default-scorm-lms-secure-encryption-key-32b";
    return crypto.createHash("sha256").update(secret).digest();
  }

  /**
   * Encrypt arbitrary credentials using AES-256-GCM
   */
  static encrypt(plainData: Record<string, unknown>, customKey?: string): EncryptedPayload {
    try {
      const key = this.getMasterKey(customKey);
      const iv = crypto.randomBytes(this.IV_LENGTH);
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

      const jsonStr = JSON.stringify(plainData);
      let encrypted = cipher.update(jsonStr, "utf8", "hex");
      encrypted += cipher.final("hex");

      const tag = (cipher as any).getAuthTag().toString("hex");

      return {
        iv: iv.toString("hex"),
        tag,
        data: encrypted,
      };
    } catch (err: any) {
      throw new AppError(500, "ENCRYPTION_FAILED", `Failed to encrypt credentials: ${err.message}`);
    }
  }

  /**
   * Decrypt AES-256-GCM encrypted credentials and verify auth tag
   */
  static decrypt(payload: EncryptedPayload, customKey?: string): Record<string, unknown> {
    try {
      if (!payload || !payload.iv || !payload.tag || !payload.data) {
        throw new Error("Invalid encrypted payload structure");
      }

      const key = this.getMasterKey(customKey);
      const iv = Buffer.from(payload.iv, "hex");
      const tag = Buffer.from(payload.tag, "hex");

      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
      (decipher as any).setAuthTag(tag);

      let decrypted = decipher.update(payload.data, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return JSON.parse(decrypted);
    } catch (err: any) {
      throw new AppError(400, "DECRYPTION_FAILED", `Failed to decrypt LMS credentials: ${err.message}`);
    }
  }

  /**
   * Redact sensitive fields from LMS credentials for safe logging and client inspection
   */
  static sanitizeCredentials(creds: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ["clientSecret", "apiKey", "accessToken", "refreshToken", "password", "privateKey"];

    for (const [key, val] of Object.entries(creds)) {
      if (sensitiveKeys.includes(key) && typeof val === "string") {
        sanitized[key] = val.length > 8 ? `${val.slice(0, 4)}...${val.slice(-4)}` : "********";
      } else {
        sanitized[key] = val;
      }
    }
    return sanitized;
  }

  /**
   * Generate or retrieve active RSA 2048-bit keypair for LTI 1.3
   */
  static getLtiRsaKeyPair(): { publicKey: string; privateKey: string; keyId: string } {
    if (!this.cachedRsaKeyPair) {
      const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      });
      const keyId = `key-${Date.now().toString(36)}`;
      this.cachedRsaKeyPair = { publicKey, privateKey, keyId };
    }
    return this.cachedRsaKeyPair;
  }

  /**
   * Export public JWKS (JSON Web Key Set) for LTI 1.3 tool consumer verification
   */
  static getPublicJWKS() {
    const { publicKey, keyId } = this.getLtiRsaKeyPair();
    const pubKeyObj = crypto.createPublicKey(publicKey);
    const jwk = pubKeyObj.export({ format: "jwk" });

    return {
      keys: [
        {
          kty: "RSA",
          use: "sig",
          alg: "RS256",
          kid: keyId,
          n: jwk.n,
          e: jwk.e,
        },
      ],
    };
  }
}
