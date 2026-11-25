import type { Request, Response, NextFunction } from "express";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { EntitlementsService } from "./entitlements.service.js";
import { LicenseService } from "./license.service.js";
import { StripeService } from "./stripe.service.js";
import { AppError } from "../../utils/appError.js";
import type {
  CreateCheckoutInput,
  GenerateLicenseKeysInput,
  RedeemLicenseKeyInput,
} from "./billing.schema.js";

export class BillingController {
  /**
   * GET /api/v1/billing/plans
   */
  static async listPublicPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const plans = await EntitlementsService.listPublicPlans();
      ResponseHelper.sendSuccess(res, { plans }, 200, "SaaS plans retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/organizations/:organizationId/billing/entitlements
   */
  static async getOrganizationEntitlements(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organizationId = req.tenantContext?.organizationId;
      if (!organizationId) {
        throw AppError.forbidden("Verified organization context required");
      }

      const entitlements = await EntitlementsService.getOrganizationEntitlements(organizationId);
      ResponseHelper.sendSuccess(res, { entitlements }, 200, "Organization entitlements retrieved");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/organizations/:organizationId/billing/checkout
   */
  static async createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenantContext?.organizationId;
      if (!organizationId || !req.user) {
        throw AppError.forbidden("Verified organization context required");
      }

      const input = req.body as CreateCheckoutInput;
      const session = await StripeService.createCheckoutSession(
        organizationId,
        req.user.email,
        input
      );
      ResponseHelper.sendSuccess(res, session, 200, "Stripe checkout session created");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/organizations/:organizationId/billing/portal
   */
  static async createPortal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenantContext?.organizationId;
      if (!organizationId) {
        throw AppError.forbidden("Verified organization context required");
      }

      const returnUrl = typeof req.body?.returnUrl === "string" ? req.body.returnUrl : undefined;
      const portal = await StripeService.createPortalSession(organizationId, returnUrl);
      ResponseHelper.sendSuccess(res, portal, 200, "Stripe billing portal session created");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/organizations/:organizationId/billing/redeem-license
   */
  static async redeemLicense(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const organizationId = req.tenantContext?.organizationId;
      if (!organizationId) {
        throw AppError.forbidden("Verified organization context required");
      }

      const { code } = req.body as RedeemLicenseKeyInput;
      const redeemed = await LicenseService.redeemLicenseKey(organizationId, code);
      ResponseHelper.sendSuccess(res, { subscription: redeemed }, 200, "License key redeemed successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/billing/licenses/generate (Super Admin Only)
   */
  static async generateLicenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.isSuperAdmin) {
        throw AppError.forbidden("Super Admin privileges required to issue platform license keys");
      }

      const input = req.body as GenerateLicenseKeysInput;
      const keys = await LicenseService.generateBatch(input, req.user.id);
      ResponseHelper.sendSuccess(res, { keys }, 201, `${keys.length} license key(s) generated`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/billing/licenses (Super Admin Only)
   */
  static async listLicenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.isSuperAdmin) {
        throw AppError.forbidden("Super Admin privileges required to view platform license keys");
      }

      const keys = await LicenseService.listIssuedKeys();
      ResponseHelper.sendSuccess(res, { keys }, 200, "License keys retrieved");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/billing/webhooks/stripe
   */
  static async handleStripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawBody = (req as Request & { rawBody?: Buffer }).rawBody || JSON.stringify(req.body);
      const signatureHeader = req.headers["stripe-signature"] as string | undefined;

      const event = StripeService.verifyWebhookSignature(rawBody, signatureHeader);
      const result = await StripeService.processWebhookEvent(event);

      ResponseHelper.sendSuccess(res, result, 200, "Webhook processed");
    } catch (error) {
      next(error);
    }
  }
}
