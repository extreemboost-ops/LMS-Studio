import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";
import { prisma } from "../database/prisma.js";

export interface DistributorContext {
  distributorId: string;
  userId: string;
  role: "PARTNER_OWNER" | "PARTNER_ADMIN" | "SALES_AGENT";
  status: string;
  billingMode: string;
}

/**
 * Resolves and verifies Distributor Partner context for /api/v1/distributor/* routes.
 * Never trusts distributorId from query/body alone; verifies active membership in PostgreSQL.
 */
export async function resolveDistributorContext(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  if (req.query && "distributorId" in req.query) {
    delete (req.query as Record<string, unknown>).distributorId;
  }

  if (!req.user) {
    return next(AppError.unauthorized("Authentication required for Distributor Hub"));
  }

  try {
    const headerDistId =
      typeof req.headers["x-distributor-id"] === "string"
        ? req.headers["x-distributor-id"]
        : undefined;

    const membership = await prisma.distributorMember.findFirst({
      where: {
        userId: req.user.id,
        status: "ACTIVE",
        ...(headerDistId ? { distributorId: headerDistId } : {}),
      },
      include: { distributor: true },
    });

    if (!membership || !membership.distributor) {
      return next(
        AppError.forbidden("No active Distributor membership found for this account", "NOT_A_DISTRIBUTOR")
      );
    }

    if (membership.distributor.status !== "ACTIVE") {
      return next(
        AppError.forbidden(
          `Distributor account is ${membership.distributor.status}. Contact platform support.`,
          "DISTRIBUTOR_INACTIVE"
        )
      );
    }

    req.distributorContext = {
      distributorId: membership.distributorId,
      userId: req.user.id,
      role: membership.role,
      status: membership.distributor.status,
      billingMode: membership.distributor.billingMode,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Enforces specific Distributor partner roles (e.g. PARTNER_OWNER, PARTNER_ADMIN).
 */
export function requireDistributorRole(
  ...allowedRoles: Array<"PARTNER_OWNER" | "PARTNER_ADMIN" | "SALES_AGENT">
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.distributorContext) {
      return next(AppError.unauthorized("Verified distributor context required"));
    }
    if (!allowedRoles.includes(req.distributorContext.role)) {
      return next(
        AppError.forbidden(
          `Distributor role '${req.distributorContext.role}' lacks permission for this action`
        )
      );
    }
    next();
  };
}
