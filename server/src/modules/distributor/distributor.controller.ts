import type { Request, Response, NextFunction } from "express";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";
import { DistributorService } from "./distributor.service.js";
import { BrandingService } from "./branding.service.js";
import type { UpdateBrandingInput } from "./branding.schema.js";
import type {
  ApplyDistributorInput,
  ReviewDistributorInput,
  ProvisionClientInput,
  UpdateClientStatusInput,
  GeneratePartnerLicensesInput,
  RequestPayoutInput,
} from "./distributor.schema.js";

export class DistributorController {
  /**
   * POST /api/v1/distributor/apply
   */
  static async apply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw AppError.unauthorized("Authentication required");
      }
      const distributor = await DistributorService.applyForPartnership(
        req.user.id,
        req.body as ApplyDistributorInput
      );
      ResponseHelper.sendSuccess(res, { distributor }, 201, "Distributor partnership application submitted");
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/distributor/dashboard
   */
  static async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.distributorContext!.distributorId;
      const data = await DistributorService.getDashboard(distributorId);
      ResponseHelper.sendSuccess(res, data, 200, "Distributor dashboard retrieved");
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/distributor/clients
   */
  static async listClients(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.distributorContext!.distributorId;
      const clients = await DistributorService.listClients(distributorId);
      ResponseHelper.sendSuccess(res, { clients }, 200, "Client organizations retrieved");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/distributor/clients
   */
  static async provisionClient(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.distributorContext!.distributorId;
      const userId = req.user!.id;
      const result = await DistributorService.provisionClient(
        distributorId,
        userId,
        req.body as ProvisionClientInput
      );
      ResponseHelper.sendSuccess(res, result, 201, "Client organization provisioned successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/distributor/clients/:clientOrgId/status
   */
  static async updateClientStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.distributorContext!.distributorId;
      const clientOrgId = Array.isArray(req.params.clientOrgId)
        ? req.params.clientOrgId[0]
        : req.params.clientOrgId;
      const { isActive } = req.body as UpdateClientStatusInput;

      const updated = await DistributorService.setClientStatus(distributorId, clientOrgId, isActive);
      ResponseHelper.sendSuccess(res, { organization: updated }, 200, "Client status updated");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/distributor/licenses/generate
   */
  static async generateLicenses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.distributorContext!.distributorId;
      const userId = req.user!.id;
      const keys = await DistributorService.generatePartnerLicenses(
        distributorId,
        userId,
        req.body as GeneratePartnerLicensesInput
      );
      ResponseHelper.sendSuccess(res, { keys }, 201, `${keys.length} partner license key(s) generated`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/distributor/commissions
   */
  static async listCommissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.distributorContext!.distributorId;
      const data = await DistributorService.listCommissionsAndPayouts(distributorId);
      ResponseHelper.sendSuccess(res, data, 200, "Commissions and payouts retrieved");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/distributor/payouts
   */
  static async requestPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.distributorContext!.distributorId;
      const userId = req.user!.id;
      const payout = await DistributorService.requestPayout(
        distributorId,
        userId,
        req.body as RequestPayoutInput
      );
      ResponseHelper.sendSuccess(res, { payout }, 201, "Payout request submitted");
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // SUPER ADMIN GOVERNANCE ENDPOINTS
  // =========================================================================

  static async adminListDistributors(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.isSuperAdmin) {
        throw AppError.forbidden("Super Admin privileges required");
      }
      const distributors = await DistributorService.listAllDistributors();
      ResponseHelper.sendSuccess(res, { distributors }, 200, "All distributors retrieved");
    } catch (error) {
      next(error);
    }
  }

  static async adminReviewDistributor(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.isSuperAdmin) {
        throw AppError.forbidden("Super Admin privileges required");
      }
      const distributorId = Array.isArray(req.params.distributorId)
        ? req.params.distributorId[0]
        : req.params.distributorId;
      const updated = await DistributorService.reviewPartnerApplication(
        distributorId,
        req.body as ReviewDistributorInput
      );
      ResponseHelper.sendSuccess(res, { distributor: updated }, 200, "Distributor status updated");
    } catch (error) {
      next(error);
    }
  }

  static async adminPlatformOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.isSuperAdmin) {
        throw AppError.forbidden("Super Admin privileges required");
      }
      const overview = await DistributorService.getAdminPlatformOverview();
      ResponseHelper.sendSuccess(res, overview, 200, "Platform command center overview retrieved");
    } catch (error) {
      next(error);
    }
  }

  static async adminProcessPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user?.isSuperAdmin) {
        throw AppError.forbidden("Super Admin privileges required");
      }
      const payoutId = Array.isArray(req.params.payoutId)
        ? req.params.payoutId[0]
        : req.params.payoutId;
      const { status, referenceNote } = req.body as {
        status: "APPROVED" | "PAID" | "REJECTED";
        referenceNote?: string;
      };
      const payout = await DistributorService.processPayoutRequest(payoutId, status, referenceNote);
      ResponseHelper.sendSuccess(res, { payout }, 200, "Payout request updated");
    } catch (error) {
      next(error);
    }
  }

  // =========================================================================
  // WHITE-LABEL BRANDING & CUSTOM DOMAIN ENDPOINTS (PHASE 08.4)
  // =========================================================================

  /**
   * GET /api/v1/public/branding
   */
  static async getPublicBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queryDomain = typeof req.query.domain === "string" ? req.query.domain : undefined;
      const querySlug = typeof req.query.slug === "string" ? req.query.slug : undefined;
      const forwardedHost =
        typeof req.headers["x-forwarded-host"] === "string"
          ? req.headers["x-forwarded-host"]
          : req.headers.host;

      const branding = await BrandingService.resolvePublicBranding({
        domain: queryDomain || forwardedHost,
        slug: querySlug,
      });

      ResponseHelper.sendSuccess(res, { branding }, 200, "Branding resolved");
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/distributor/branding
   */
  static async getPartnerBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.distributorContext!.distributorId;
      const result = await BrandingService.getPartnerBranding(distributorId);
      ResponseHelper.sendSuccess(res, result, 200, "Partner branding retrieved");
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/distributor/branding
   */
  static async updatePartnerBranding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.distributorContext!.distributorId;
      const updated = await BrandingService.updatePartnerBranding(
        distributorId,
        req.body as UpdateBrandingInput
      );
      ResponseHelper.sendSuccess(res, { distributor: updated }, 200, "White-label branding updated");
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/distributor/branding/verify-domain
   */
  static async verifyPartnerDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const distributorId = req.distributorContext!.distributorId;
      const verification = await BrandingService.verifyCustomDomain(distributorId);
      ResponseHelper.sendSuccess(res, { verification }, 200, "DNS verification check completed");
    } catch (error) {
      next(error);
    }
  }
}
