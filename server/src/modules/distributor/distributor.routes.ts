import { Router } from "express";
import { DistributorController } from "./distributor.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import {
  resolveDistributorContext,
  requireDistributorRole,
} from "../../middlewares/distributorContext.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  applyDistributorSchema,
  reviewDistributorSchema,
  provisionClientSchema,
  updateClientStatusSchema,
  generatePartnerLicensesSchema,
  requestPayoutSchema,
} from "./distributor.schema.js";
import { updateBrandingSchema } from "./branding.schema.js";

// Public White-Label Branding Router: /api/v1/public
export const publicBrandingRoutes = Router();
publicBrandingRoutes.get("/branding", DistributorController.getPublicBranding);

// Partner Portal Router: /api/v1/distributor
export const distributorRoutes = Router();
distributorRoutes.use(requireAuth);

// Onboarding application (before distributor context exists)
distributorRoutes.post(
  "/apply",
  validateRequest({ body: applyDistributorSchema }),
  DistributorController.apply
);

// Protected Partner Routes (verified active Distributor membership + RLS)
distributorRoutes.use(resolveDistributorContext);

distributorRoutes.get("/dashboard", DistributorController.getDashboard);
distributorRoutes.get("/clients", DistributorController.listClients);
distributorRoutes.post(
  "/clients",
  requireDistributorRole("PARTNER_OWNER", "PARTNER_ADMIN", "SALES_AGENT"),
  validateRequest({ body: provisionClientSchema }),
  DistributorController.provisionClient
);
distributorRoutes.patch(
  "/clients/:clientOrgId/status",
  requireDistributorRole("PARTNER_OWNER", "PARTNER_ADMIN"),
  validateRequest({ body: updateClientStatusSchema }),
  DistributorController.updateClientStatus
);
distributorRoutes.post(
  "/licenses/generate",
  requireDistributorRole("PARTNER_OWNER", "PARTNER_ADMIN"),
  validateRequest({ body: generatePartnerLicensesSchema }),
  DistributorController.generateLicenses
);
distributorRoutes.get("/commissions", DistributorController.listCommissions);
distributorRoutes.post(
  "/payouts",
  requireDistributorRole("PARTNER_OWNER"),
  validateRequest({ body: requestPayoutSchema }),
  DistributorController.requestPayout
);
distributorRoutes.get("/branding", DistributorController.getPartnerBranding);
distributorRoutes.patch(
  "/branding",
  requireDistributorRole("PARTNER_OWNER", "PARTNER_ADMIN"),
  validateRequest({ body: updateBrandingSchema }),
  DistributorController.updatePartnerBranding
);
distributorRoutes.post(
  "/branding/verify-domain",
  requireDistributorRole("PARTNER_OWNER", "PARTNER_ADMIN"),
  DistributorController.verifyPartnerDomain
);

// Super Admin Governance Router: /api/v1/admin/distributors
export const adminDistributorRoutes = Router();
adminDistributorRoutes.use(requireAuth);
adminDistributorRoutes.get("/", DistributorController.adminListDistributors);
adminDistributorRoutes.get("/overview", DistributorController.adminPlatformOverview);
adminDistributorRoutes.patch(
  "/:distributorId/review",
  validateRequest({ body: reviewDistributorSchema }),
  DistributorController.adminReviewDistributor
);
adminDistributorRoutes.patch("/payouts/:payoutId", DistributorController.adminProcessPayout);
