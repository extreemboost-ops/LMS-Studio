import { Router } from "express";
import { H5PController } from "./h5p.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveTenantContext } from "../../middlewares/tenantContext.js";
import { requirePermission } from "../../middlewares/rbac.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  registerLibrarySchema,
  saveH5PContentSchema,
  validateParametersSchema,
  createPackageImportSchema,
} from "./h5p.schema.js";

// Global Library Registry Router: /api/v1/h5p/libraries
export const h5pLibraryRoutes = Router();
h5pLibraryRoutes.get("/", H5PController.listLibraries);
h5pLibraryRoutes.get("/:libraryId", H5PController.getLibraryById);
h5pLibraryRoutes.get("/:libraryId/assets", H5PController.getLibraryAssets);
h5pLibraryRoutes.post(
  "/",
  requireAuth,
  validateRequest({ body: registerLibrarySchema }),
  H5PController.registerLibrary
);

// Project H5P Content Instance Router: /api/v1/organizations/:organizationId/projects/:projectId/h5p
export const projectH5PRoutes = Router({ mergeParams: true });
projectH5PRoutes.use(requireAuth);
projectH5PRoutes.use(resolveTenantContext);

projectH5PRoutes.get("/", requirePermission("content:view"), H5PController.getContentInstance);
projectH5PRoutes.put(
  "/",
  requirePermission("content:edit"),
  validateRequest({ body: saveH5PContentSchema }),
  H5PController.saveContentInstance
);
projectH5PRoutes.post(
  "/validate",
  requirePermission("content:edit"),
  validateRequest({ body: validateParametersSchema }),
  H5PController.validateParameters
);

// Package Import Router: /api/v1/organizations/:organizationId/h5p
export const organizationH5PRoutes = Router({ mergeParams: true });
organizationH5PRoutes.use(requireAuth);
organizationH5PRoutes.use(resolveTenantContext);

organizationH5PRoutes.post(
  "/import",
  requirePermission("content:create"),
  validateRequest({ body: createPackageImportSchema }),
  H5PController.importPackage
);
