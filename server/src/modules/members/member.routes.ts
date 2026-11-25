import { Router } from "express";
import { MemberController } from "./member.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveTenantContext } from "../../middlewares/tenantContext.js";
import { requirePermission } from "../../middlewares/rbac.js";
import { enforceSeatQuota } from "../../middlewares/entitlements.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import { inviteMemberSchema, acceptInvitationSchema } from "./member.schema.js";

// Router mounted for organization-scoped member operations: /api/v1/organizations/:organizationId/
const memberRouter = Router({ mergeParams: true });

memberRouter.use(requireAuth);
memberRouter.use(resolveTenantContext);

memberRouter.get("/members", MemberController.list);
memberRouter.post(
  "/invitations",
  requirePermission("org:invite", "org:manage_members"),
  enforceSeatQuota,
  validateRequest({ body: inviteMemberSchema }),
  MemberController.invite
);

export const organizationMemberRoutes = memberRouter;

// Top-level invitation acceptance router: /api/v1/invitations/
const invitationRouter = Router();
invitationRouter.use(requireAuth);
invitationRouter.post("/accept", validateRequest({ body: acceptInvitationSchema }), MemberController.accept);

export const publicInvitationRoutes = invitationRouter;
