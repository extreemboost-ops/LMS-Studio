import { Router } from "express";
import { ContentController } from "./content.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveTenantContext } from "../../middlewares/tenantContext.js";
import { requirePermission } from "../../middlewares/rbac.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  createProjectSchema,
  updateProjectSchema,
  saveDocumentSchema,
  createElementSchema,
  updateElementSchema,
  reorderElementsSchema,
  createVersionSnapshotSchema,
} from "./content.schema.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(resolveTenantContext);

// Project level routes
router.get("/", requirePermission("content:view"), ContentController.list);
router.post(
  "/",
  requirePermission("content:create"),
  validateRequest({ body: createProjectSchema }),
  ContentController.create
);
router.get("/:projectId", requirePermission("content:view"), ContentController.getById);
router.patch(
  "/:projectId",
  requirePermission("content:edit"),
  validateRequest({ body: updateProjectSchema }),
  ContentController.update
);
router.post("/:projectId/duplicate", requirePermission("content:create"), ContentController.duplicate);
router.delete("/:projectId", requirePermission("content:delete"), ContentController.delete);

// Document settings and metadata
router.put(
  "/:projectId/document",
  requirePermission("content:edit"),
  validateRequest({ body: saveDocumentSchema }),
  ContentController.saveDocument
);

// Element hierarchy management
router.post(
  "/:projectId/elements",
  requirePermission("content:edit"),
  validateRequest({ body: createElementSchema }),
  ContentController.createElement
);
router.patch(
  "/:projectId/elements/:elementId",
  requirePermission("content:edit"),
  validateRequest({ body: updateElementSchema }),
  ContentController.updateElement
);
router.delete(
  "/:projectId/elements/:elementId",
  requirePermission("content:edit"),
  ContentController.deleteElement
);
router.post(
  "/:projectId/elements/reorder",
  requirePermission("content:edit"),
  validateRequest({ body: reorderElementsSchema }),
  ContentController.reorderElements
);

// Immutable version snapshots
router.post(
  "/:projectId/versions",
  requirePermission("content:publish"),
  validateRequest({ body: createVersionSnapshotSchema }),
  ContentController.createSnapshot
);
router.get("/:projectId/versions", requirePermission("content:view"), ContentController.listVersions);

export const contentRoutes = router;
