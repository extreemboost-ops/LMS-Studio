import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";
import {
  EntitlementsService,
  type FeatureKey,
} from "../modules/billing/entitlements.service.js";

function extractOrgId(req: Request): string {
  const orgId = req.tenantContext?.organizationId || (req.params.organizationId as string);
  if (!orgId) {
    throw AppError.forbidden("Verified organization context required for entitlement check");
  }
  return orgId;
}

/**
 * Middleware factory verifying that a specific plan feature is enabled for the active organization.
 */
export function requireFeature(feature: FeatureKey) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const orgId = extractOrgId(req);
      await EntitlementsService.assertFeatureEnabled(orgId, feature);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware enforcing organization seat limit before member invitations.
 */
export async function enforceSeatQuota(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = extractOrgId(req);
    await EntitlementsService.assertSeatQuota(orgId);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware enforcing organization workspace limit before workspace creation.
 */
export async function enforceWorkspaceQuota(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = extractOrgId(req);
    await EntitlementsService.assertWorkspaceQuota(orgId);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware enforcing monthly export limit before packaging/exporting.
 */
export async function enforceExportQuota(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const orgId = extractOrgId(req);
    await EntitlementsService.assertExportQuota(orgId);
    next();
  } catch (error) {
    next(error);
  }
}
