import { Router } from "express";
import { WorkspaceController } from "./workspace.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveTenantContext } from "../../middlewares/tenantContext.js";
import { requirePermission } from "../../middlewares/rbac.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { createWorkspaceSchema } from "./workspace.schema.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(resolveTenantContext);

router.get("/workspaces", WorkspaceController.list);
router.post(
  "/workspaces",
  requirePermission("workspace:create"),
  validateRequest({ body: createWorkspaceSchema }),
  WorkspaceController.create
);

export const organizationWorkspaceRoutes = router;
