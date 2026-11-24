import jwt, { type SignOptions, type VerifyOptions } from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "./appError.js";

export interface AccessTokenPayload {
  sub: string;               // userId
  email: string;
  isSuperAdmin: boolean;
  orgId?: string;            // Active organization ID
  workspaceId?: string;      // Active workspace ID
  role?: string;             // Active role name in organization
  permissions?: string[];    // Array of permission codes
}

export interface DecodedAccessToken extends AccessTokenPayload {
  iss: string;
  aud: string;
  iat: number;
  exp: number;
  jti: string;
}

/**
 * Signs a short-lived access token with strict claims
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    algorithm: "HS256",
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };

  return jwt.sign(payload, env.JWT_SECRET, options);
}

/**
 * Verifies an access token enforcing signature, algorithm allowlist, issuer, audience, and expiry
 */
export function verifyAccessToken(token: string): DecodedAccessToken {
  const options: VerifyOptions = {
    algorithms: ["HS256"], // Strict allowlist: reject 'none', asymmetric or unexpected algorithms
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
  };

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, options);
    return decoded as DecodedAccessToken;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw AppError.unauthorized("Access token has expired", "TOKEN_EXPIRED");
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw AppError.unauthorized("Invalid access token signature or claims", "INVALID_TOKEN");
    }
    throw AppError.unauthorized("Access token verification failed", "UNAUTHORIZED");
  }
}
