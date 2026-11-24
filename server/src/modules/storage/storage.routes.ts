import { Router } from "express";
import { StorageController } from "./storage.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveTenantContext } from "../../middlewares/tenantContext.js";

export const storageRoutes = Router();

// Public Tokenized Download Gateway (Signature and expiry verified cryptographically)
storageRoutes.get("/download/:token", StorageController.downloadPackage);

// Tenant Storage Usage & Quota
storageRoutes.get(
  "/usage",
  requireAuth,
  resolveTenantContext,
  StorageController.getStorageUsage
);
