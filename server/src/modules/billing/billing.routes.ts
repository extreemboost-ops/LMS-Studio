import { Router } from "express";
import { BillingController } from "./billing.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveTenantContext } from "../../middlewares/tenantContext.js";
import { requirePermission } from "../../middlewares/rbac.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  createCheckoutSchema,
  generateLicenseKeysSchema,
  redeemLicenseKeySchema,
} from "./billing.schema.js";

// Public & Platform Billing Router: /api/v1/billing
export const publicBillingRoutes = Router();
publicBillingRoutes.get("/plans", BillingController.listPublicPlans);
publicBillingRoutes.post("/webhooks/stripe", BillingController.handleStripeWebhook);

// Super Admin License Management
publicBillingRoutes.get("/licenses", requireAuth, BillingController.listLicenses);
publicBillingRoutes.post(
  "/licenses/generate",
  requireAuth,
  validateRequest({ body: generateLicenseKeysSchema }),
  BillingController.generateLicenses
);

// Organization-scoped Billing Router: /api/v1/organizations/:organizationId/billing
export const organizationBillingRoutes = Router({ mergeParams: true });
organizationBillingRoutes.use(requireAuth);
organizationBillingRoutes.use(resolveTenantContext);

organizationBillingRoutes.get(
  "/entitlements",
  requirePermission("org:view", "settings:view"),
  BillingController.getOrganizationEntitlements
);

organizationBillingRoutes.post(
  "/checkout",
  requirePermission("org:manage_billing", "settings:edit"),
  validateRequest({ body: createCheckoutSchema }),
  BillingController.createCheckout
);

organizationBillingRoutes.post(
  "/portal",
  requirePermission("org:manage_billing", "settings:edit"),
  BillingController.createPortal
);

organizationBillingRoutes.post(
  "/redeem-license",
  requirePermission("org:manage_billing", "settings:edit"),
  validateRequest({ body: redeemLicenseKeySchema }),
  BillingController.redeemLicense
);
