import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { AppError } from "../utils/appError.js";

/**
 * Authentication Middleware
 * Validates cryptographically signed Bearer JWT access tokens
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return next();
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      isSuperAdmin: decoded.isSuperAdmin,
    };

    // If access token was bound to an active tenant context, attach it
    if (decoded.orgId) {
      req.tenantContext = {
        organizationId: decoded.orgId,
        userId: decoded.sub,
        membershipId: "",
        role: decoded.role || "VIEWER",
        permissions: decoded.permissions || [],
        workspaceId: decoded.workspaceId,
      };
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Guard requiring a valid authenticated user
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(AppError.unauthorized("Authentication required to access this resource"));
  }
  next();
}
