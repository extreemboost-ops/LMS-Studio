import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/appError.js";
import { prisma } from "../../database/prisma.js";

export interface SignedDownloadTokenPayload {
  storageKey: string;
  organizationId: string;
  filename: string;
  exp: number; // Unix timestamp in seconds
}

export interface StorageWriteResult {
  storageKey: string;
  sizeBytes: number;
  checksumSha256: string;
  absolutePath: string;
}

export class StorageService {
  private static rootDir = path.resolve(process.cwd(), "storage", "packages");

  /**
   * Ensure storage root directory exists
   */
  private static ensureDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  /**
   * Sanitizes storage key to prevent directory traversal attacks
   */
  public static sanitizeStorageKey(rawKey: string): string {
    if (!rawKey || typeof rawKey !== "string") {
      throw AppError.badRequest("Invalid storage key");
    }

    // Reject null bytes, backslashes, or control characters
    if (rawKey.includes("\0") || /[\x00-\x1f]/.test(rawKey)) {
      throw AppError.badRequest("Storage key contains forbidden characters");
    }

    // Normalize slashes
    const normalized = rawKey.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/+/, "");

    // Prohibit directory traversal patterns like '..' or '.'
    const parts = normalized.split("/");
    for (const part of parts) {
      if (part === ".." || part === "." || part.trim() === "") {
        throw AppError.badRequest("Directory traversal detected in storage key");
      }
    }

    return normalized;
  }

  /**
   * Resolve safe absolute filesystem path for a storage key
   */
  public static getAbsolutePath(storageKey: string): string {
    const safeKey = this.sanitizeStorageKey(storageKey);
    const resolved = path.resolve(this.rootDir, safeKey);

    // Verify resolved path is strictly within rootDir
    if (!resolved.startsWith(this.rootDir)) {
      throw AppError.badRequest("Path traversal violation");
    }

    return resolved;
  }

  /**
   * Write binary package to storage with checksum and usage tracking
   */
  public static async writePackage(
    organizationId: string,
    storageKey: string,
    data: Buffer
  ): Promise<StorageWriteResult> {
    const absolutePath = this.getAbsolutePath(storageKey);
    this.ensureDir(path.dirname(absolutePath));

    fs.writeFileSync(absolutePath, data);

    const sizeBytes = data.length;
    const checksumSha256 = crypto.createHash("sha256").update(data).digest("hex");

    // Track storage quota usage in database if connected
    try {
      await prisma.storageUsage.create({
        data: {
          organizationId,
          totalBytesUsed: BigInt(sizeBytes),
          packageBytes: BigInt(sizeBytes),
          filesCount: 1,
        },
      });
    } catch {
      // In-memory or fallback mode: non-blocking
    }

    return {
      storageKey,
      sizeBytes,
      checksumSha256,
      absolutePath,
    };
  }

  /**
   * Read binary package from storage
   */
  public static readPackage(storageKey: string): Buffer {
    const absolutePath = this.getAbsolutePath(storageKey);
    if (!fs.existsSync(absolutePath)) {
      throw AppError.notFound("Storage package file");
    }
    return fs.readFileSync(absolutePath);
  }

  /**
   * Check if package exists in storage
   */
  public static packageExists(storageKey: string): boolean {
    try {
      const absolutePath = this.getAbsolutePath(storageKey);
      return fs.existsSync(absolutePath);
    } catch {
      return false;
    }
  }

  /**
   * Delete package file from storage
   */
  public static deletePackage(storageKey: string): boolean {
    try {
      const absolutePath = this.getAbsolutePath(storageKey);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Generate an HMAC-SHA256 signed, time-limited download token
   */
  public static generateSignedDownloadToken(
    storageKey: string,
    organizationId: string,
    filename: string,
    expiresInSeconds = 900 // 15 minutes default
  ): string {
    const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const payload: SignedDownloadTokenPayload = {
      storageKey: this.sanitizeStorageKey(storageKey),
      organizationId,
      filename: filename.replace(/[^a-zA-Z0-9._-]/g, "_"),
      exp,
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadJson, "utf-8").toString("base64url");

    const secret = env.JWT_SECRET || "studio-storage-download-signing-key-secret";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("base64url");

    return `${payloadB64}.${signature}`;
  }

  /**
   * Verify and decode a signed download token
   */
  public static verifySignedDownloadToken(token: string): SignedDownloadTokenPayload {
    if (!token || typeof token !== "string" || !token.includes(".")) {
      throw AppError.unauthorized("Invalid download token format");
    }

    const [payloadB64, signature] = token.split(".");
    if (!payloadB64 || !signature) {
      throw AppError.unauthorized("Malformed download token");
    }

    const secret = env.JWT_SECRET || "studio-storage-download-signing-key-secret";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payloadB64)
      .digest("base64url");

    // Timing-safe comparison to prevent timing attacks
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      throw AppError.unauthorized("Tampered or forged download token signature");
    }

    let payload: SignedDownloadTokenPayload;
    try {
      const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
      payload = JSON.parse(payloadJson);
    } catch {
      throw AppError.unauthorized("Unparseable download token payload");
    }

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      throw AppError.unauthorized("Download token has expired");
    }

    return payload;
  }
}
