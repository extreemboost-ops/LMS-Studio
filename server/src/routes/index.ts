import { Router } from "express";
import { healthRoutes } from "../modules/health/health.routes.js";
import { authRoutes } from "../modules/auth/auth.routes.js";
import { userRoutes } from "../modules/users/user.routes.js";
import { organizationRoutes } from "../modules/organizations/organization.routes.js";
import {
  organizationMemberRoutes,
  publicInvitationRoutes,
} from "../modules/members/member.routes.js";
import { organizationWorkspaceRoutes } from "../modules/workspaces/workspace.routes.js";
import { courseRoutes } from "../modules/courses/course.routes.js";
import { contentRoutes } from "../modules/content/content.routes.js";
import {
  h5pLibraryRoutes,
  projectH5PRoutes,
  organizationH5PRoutes,
} from "../modules/h5p/h5p.routes.js";
import {
  projectSCORMExportRoutes,
  organizationSCORMRoutes,
  globalExportRoutes,
} from "../modules/scorm/scorm.routes.js";
import {
  publicLtiRoutes,
  organizationLMSRoutes,
  genericIntegrationRoutes,
} from "../modules/lms/lms.routes.js";
import { storageRoutes } from "../modules/storage/storage.routes.js";
import { analyticsRoutes } from "../modules/analytics/analytics.routes.js";
import {
  publicBillingRoutes,
  organizationBillingRoutes,
} from "../modules/billing/billing.routes.js";
import {
  distributorRoutes,
  adminDistributorRoutes,
  publicBrandingRoutes,
} from "../modules/distributor/distributor.routes.js";

const apiV1Router = Router();

// Mount modules
apiV1Router.use("/health", healthRoutes);
apiV1Router.use("/auth", authRoutes);
apiV1Router.use("/users", userRoutes);
apiV1Router.use("/public", publicBrandingRoutes);
apiV1Router.use("/billing", publicBillingRoutes);
apiV1Router.use("/distributor", distributorRoutes);
apiV1Router.use("/admin/distributors", adminDistributorRoutes);
apiV1Router.use("/organizations", organizationRoutes);
apiV1Router.use("/organizations/:organizationId/billing", organizationBillingRoutes);
apiV1Router.use("/organizations/:organizationId", organizationMemberRoutes);
apiV1Router.use("/organizations/:organizationId", organizationWorkspaceRoutes);
apiV1Router.use("/organizations/:organizationId/courses", courseRoutes);
apiV1Router.use("/organizations/:organizationId/projects", contentRoutes);
apiV1Router.use("/organizations/:organizationId/projects/:projectId/h5p", projectH5PRoutes);
apiV1Router.use("/organizations/:organizationId/projects/:projectId/scorm", projectSCORMExportRoutes);
apiV1Router.use("/organizations/:organizationId/h5p", organizationH5PRoutes);
apiV1Router.use("/organizations/:organizationId/scorm", organizationSCORMRoutes);
apiV1Router.use("/organizations/:organizationId/lms", organizationLMSRoutes);
apiV1Router.use("/h5p/libraries", h5pLibraryRoutes);
apiV1Router.use("/invitations", publicInvitationRoutes);
apiV1Router.use("/export", globalExportRoutes);
apiV1Router.use("/storage", storageRoutes);
apiV1Router.use("/analytics", analyticsRoutes);
apiV1Router.use("/lti/1.3", publicLtiRoutes);
apiV1Router.use("/integrations", genericIntegrationRoutes);

export const rootRouter = apiV1Router;
