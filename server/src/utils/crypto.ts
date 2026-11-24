import { hash, verify, type Options } from "@node-rs/argon2";
import { randomBytes, createHash } from "node:crypto";

// OWASP recommended Argon2id configuration
const argon2Options: Options = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,       // 2 iterations
  outputLen: 32,
  parallelism: 1,
  algorithm: 2,      // Argon2id
};

/**
 * Hashes a plain-text password using Argon2id
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, argon2Options);
}

/**
 * Verifies a plain-text password against an Argon2id hash
 */
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/**
 * Generates a high-entropy, cryptographically secure random token string
 */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString("hex");
}

/**
 * Produces a SHA-256 hash of a raw token for secure database persistence
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
