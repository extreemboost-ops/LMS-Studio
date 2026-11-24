import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";

/**
 * Guard verifying that the active tenant member holds the required permission(s)
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenantContext) {
      return next(AppError.unauthorized("Tenant context required for authorization"));
    }

    // SuperAdmin or OWNER role bypasses individual permission checks
    if (req.user?.isSuperAdmin || req.tenantContext.role === "OWNER") {
      return next();
    }

    const userPermissions = new Set(req.tenantContext.permissions);
    const hasAll = requiredPermissions.every((perm) => userPermissions.has(perm));

    if (!hasAll) {
      return next(
        AppError.forbidden(
          `Insufficient permissions. Required: ${requiredPermissions.join(", ")}`,
          "PERMISSION_DENIED"
        )
      );
    }

    next();
  };
}

/**
 * Guard verifying that the active tenant member holds one of the permitted roles
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.tenantContext) {
      return next(AppError.unauthorized("Tenant context required for authorization"));
    }

    if (req.user?.isSuperAdmin || req.tenantContext.role === "OWNER") {
      return next();
    }

    if (!allowedRoles.includes(req.tenantContext.role)) {
      return next(
        AppError.forbidden(
          `Access denied for role '${req.tenantContext.role}'. Permitted roles: ${allowedRoles.join(", ")}`,
          "ROLE_UNAUTHORIZED"
        )
      );
    }

    next();
  };
}
