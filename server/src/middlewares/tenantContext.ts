import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";
import { prisma } from "../database/prisma.js";

export interface TenantContext {
  organizationId: string;
  userId: string;
  membershipId: string;
  role: string;
  permissions: string[];
  workspaceId?: string;
}

/**
 * Resolves and verifies tenant context for protected organization routes
 *
 * CRITICAL TENANT INVARIANT:
 * - organizationId in query or body is NEVER trusted.
 * - The organizationId MUST come from the validated URL route param (:organizationId)
 *   or an explicitly verified X-Organization-Id header.
 * - The authenticated user's active membership is strictly verified against the database.
 * - If user does not belong to the target organization, access is categorically denied (403).
 */
export async function resolveTenantContext(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  // Strip unverified query and body injections
  if (req.query && "organizationId" in req.query) {
    delete (req.query as Record<string, unknown>).organizationId;
  }

  if (!req.user) {
    return next(AppError.unauthorized("Authentication required to resolve tenant context"));
  }

  // Extract target organization ID from route param or header
  const rawOrgParam = req.params.organizationId;
  const paramOrgId = Array.isArray(rawOrgParam) ? rawOrgParam[0] : rawOrgParam;
  const rawWsParam = req.params.workspaceId;
  const paramWsId = Array.isArray(rawWsParam) ? rawWsParam[0] : rawWsParam;

  const targetOrgId =
    paramOrgId ||
    (typeof req.headers["x-organization-id"] === "string" ? req.headers["x-organization-id"] : undefined) ||
    req.tenantContext?.organizationId;

  if (!targetOrgId) {
    return next(
      AppError.badRequest("Organization context required for this operation", undefined, "TENANT_CONTEXT_MISSING")
    );
  }

  try {
    // Query membership with role and permissions
    const member = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: targetOrgId,
          userId: req.user.id,
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
        organization: true,
      },
    });

    if (!member || !member.organization.isActive || member.status !== "ACTIVE") {
      return next(
        AppError.forbidden(
          "Access denied: You are not an active member of the specified organization",
          "TENANT_ACCESS_DENIED"
        )
      );
    }

    const permissionCodes = member.role.permissions.map((rp: { permission: { code: string } }) => rp.permission.code);

    req.tenantContext = {
      organizationId: member.organizationId,
      userId: req.user.id,
      membershipId: member.id,
      role: member.role.name,
      permissions: permissionCodes,
      workspaceId: paramWsId || (typeof req.headers["x-workspace-id"] === "string" ? req.headers["x-workspace-id"] : undefined),
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Guard requiring that verified tenant context has been established
 */
export function requireTenantContext(req: Request, _res: Response, next: NextFunction): void {
  if (!req.tenantContext || !req.tenantContext.organizationId) {
    return next(AppError.unauthorized("Verified tenant context required"));
  }
  next();
}
