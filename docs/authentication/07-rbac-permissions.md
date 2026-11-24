# Role-Based Access Control (RBAC) & Permissions Matrix

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/authentication/07-rbac-permissions.md`  
**Milestone:** Phase 03.2 — Production Authentication, Authorization & Multi-Tenant Provisioning  
**Status:** Implemented & Verified  
**Date:** November 2026  

---

## 1. System Roles Overview

The studio supports five canonical system roles stored in the database `roles` table:

| Role Name | Scope | Description |
|:---|:---|:---|
| **OWNER** | Organization | Full administrative control, billing, member deletion, organization settings. |
| **ADMIN** | Organization | Operational administration: manage members, workspaces, content, integrations. |
| **AUTHOR** | Organization / Workspace | Course authoring, interactive video, quiz builder, media upload, package export. |
| **REVIEWER** | Organization / Workspace | Preview content, review learner progress, verify quiz compliance, add feedback. |
| **VIEWER** | Organization / Workspace | Read-only inspection of published courses, previews, and basic reports. |

---

## 2. Granular Permissions Dictionary

All access is governed by structured permission codes (`category:action`):

| Category | Permission Code | Description | Permitted Roles |
|:---|:---|:---|:---|
| **Organization** | `org:admin` | Full organization administration | `OWNER`, `ADMIN` |
| **Organization** | `org:manage_members` | Edit member roles, suspend/remove | `OWNER`, `ADMIN` |
| **Organization** | `org:invite` | Invite new members | `OWNER`, `ADMIN` |
| **Organization** | `org:delete` | Permanently delete organization | `OWNER` |
| **Workspace** | `workspace:create` | Create new workspaces | `OWNER`, `ADMIN` |
| **Workspace** | `workspace:manage` | Edit workspace metadata | `OWNER`, `ADMIN` |
| **Workspace** | `workspace:delete` | Delete workspaces | `OWNER` |
| **Content** | `content:create` | Create courses, lessons, and content | `OWNER`, `ADMIN`, `AUTHOR` |
| **Content** | `content:edit` | Edit authoring workspace elements | `OWNER`, `ADMIN`, `AUTHOR` |
| **Content** | `content:publish` | Publish drafts to active status | `OWNER`, `ADMIN`, `AUTHOR` |
| **Content** | `content:review` | Review and approve content | `OWNER`, `ADMIN`, `AUTHOR`, `REVIEWER` |
| **Content** | `content:view` | View and preview content projects | `OWNER`, `ADMIN`, `AUTHOR`, `REVIEWER`, `VIEWER` |
| **Content** | `content:delete` | Delete content projects and courses | `OWNER`, `ADMIN` |
| **Export** | `scorm:export` | Export SCORM 1.2 and 2004 packages | `OWNER`, `ADMIN`, `AUTHOR` |
| **Export** | `h5p:export` | Export native H5P packages | `OWNER`, `ADMIN`, `AUTHOR` |
| **Media** | `media:upload` | Upload media files to library | `OWNER`, `ADMIN`, `AUTHOR` |
| **Media** | `media:delete` | Delete media assets from library | `OWNER`, `ADMIN` |
| **LMS** | `lms:manage` | Configure LTI 1.3 / OAuth2 connections| `OWNER`, `ADMIN` |
| **LMS** | `lms:deploy` | Deploy course packages to LMS | `OWNER`, `ADMIN` |

---

## 3. Reusable Middleware Guards

### 1. `requirePermission(...permissionCodes)`
Verifies that `req.tenantContext.permissions` includes all requested codes.
```typescript
router.post(
  "/workspaces",
  requirePermission("workspace:create"),
  WorkspaceController.create
);
```

### 2. `requireRole(...roleNames)`
Verifies that `req.tenantContext.role` matches one of the specified roles.
```typescript
router.delete(
  "/",
  requireRole("OWNER"),
  OrganizationController.delete
);
```

### Special Invariant:
- `req.user.isSuperAdmin` or `req.tenantContext.role === "OWNER"` automatically bypasses individual permission checks, guaranteeing that organizational owners are never locked out of administrative tasks.
