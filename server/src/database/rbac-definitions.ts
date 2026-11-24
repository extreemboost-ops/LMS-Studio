/**
 * Standard System Roles & RBAC Matrix
 * Fully backed by the PostgreSQL Role and Permission database models.
 */

export const SYSTEM_ROLES = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  AUTHOR: "AUTHOR",
  REVIEWER: "REVIEWER",
  VIEWER: "VIEWER",
} as const;

export type SystemRoleName = (typeof SYSTEM_ROLES)[keyof typeof SYSTEM_ROLES];

export const SYSTEM_PERMISSIONS = [
  // Organization management
  { code: "org:admin", name: "Organization Administrator", category: "organization", description: "Full organization administration" },
  { code: "org:manage_members", name: "Manage Members", category: "organization", description: "Manage members, update roles, suspend memberships" },
  { code: "org:invite", name: "Invite Members", category: "organization", description: "Send invitations to join organization" },
  { code: "org:delete", name: "Delete Organization", category: "organization", description: "Permanently delete the organization" },

  // Workspace management
  { code: "workspace:create", name: "Create Workspace", category: "workspace", description: "Create new workspaces within organization" },
  { code: "workspace:manage", name: "Manage Workspaces", category: "workspace", description: "Edit workspace settings and access" },
  { code: "workspace:delete", name: "Delete Workspace", category: "workspace", description: "Delete workspaces" },

  // Content Authoring
  { code: "content:create", name: "Create Content", category: "content", description: "Create courses, lessons, and content projects" },
  { code: "content:edit", name: "Edit Content", category: "content", description: "Edit courses and interactive elements" },
  { code: "content:publish", name: "Publish Content", category: "content", description: "Publish content projects and courses" },
  { code: "content:review", name: "Review Content", category: "content", description: "Review and approve draft content" },
  { code: "content:view", name: "View Content", category: "content", description: "View and preview content projects" },
  { code: "content:delete", name: "Delete Content", category: "content", description: "Delete content projects and courses" },

  // Export Packaging
  { code: "scorm:export", name: "Export SCORM", category: "export", description: "Generate SCORM 1.2 and 2004 zip packages" },
  { code: "h5p:export", name: "Export H5P", category: "export", description: "Generate native H5P zip packages" },

  // Media Library
  { code: "media:upload", name: "Upload Media", category: "media", description: "Upload images, videos, audio, and documents" },
  { code: "media:delete", name: "Delete Media", category: "media", description: "Delete assets from media storage" },

  // LMS Integration
  { code: "lms:manage", name: "Manage LMS Connections", category: "lms", description: "Configure LTI 1.3 and OAuth2 LMS endpoints" },
  { code: "lms:deploy", name: "Deploy to LMS", category: "lms", description: "Deploy course packages directly to LMS platforms" },
] as const;

export const ROLE_PERMISSION_MATRIX: Record<SystemRoleName, string[]> = {
  OWNER: SYSTEM_PERMISSIONS.map((p) => p.code), // Full access
  ADMIN: [
    "org:admin",
    "org:manage_members",
    "org:invite",
    "workspace:create",
    "workspace:manage",
    "content:create",
    "content:edit",
    "content:publish",
    "content:review",
    "content:view",
    "content:delete",
    "scorm:export",
    "h5p:export",
    "media:upload",
    "media:delete",
    "lms:manage",
    "lms:deploy",
  ],
  AUTHOR: [
    "content:create",
    "content:edit",
    "content:publish",
    "content:review",
    "content:view",
    "scorm:export",
    "h5p:export",
    "media:upload",
  ],
  REVIEWER: [
    "content:review",
    "content:view",
  ],
  VIEWER: [
    "content:view",
  ],
};
