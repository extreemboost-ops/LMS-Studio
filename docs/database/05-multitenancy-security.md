# 05 - Multi-Tenancy Architecture & Security Isolation

**Project:** SCORM & H5P Authoring Studio  
**Phase:** 02 — Database Architecture & Schema Design  
**Model:** Multi-Tenant Shared Database with Partitioned Identity & Row Isolation  

---

## 1. Tenancy Model Overview

SCORM & H5P Studio operates as a B2B SaaS platform where customers are **Organizations** (e.g. *Acme Learning*, *Northstar Academy*).

### Tenancy Principles:
1. **Strict Data Boundary:** An organization must never access, view, or modify content, media assets, learners, or SCORM packages belonging to another organization.
2. **Flexible User Association:** A single `User` account can belong to multiple `Organization` entities with independent roles (e.g., an Administrator in Organization A, but a Viewer in Organization B).
3. **Workspace Sub-division:** Inside an Organization, members can create multiple `Workspace` units to segment courses (e.g., *Corporate Compliance*, *Sales Onboarding*).

---

## 2. Multi-Level Tenancy Entity Hierarchy

```
Organization (Root Tenant)
  │
  ├── OrganizationMember (User + Role assignment)
  │
  ├── StorageUsage (Quota accounting)
  │
  ├── Learner (Organization-scoped learner profiles)
  │
  └── Workspace (Organizational unit)
        │
        ├── Course (Curriculum)
        ├── ContentProject (H5P & SCORM Authoring)
        │     ├── ContentDocument
        │     ├── ContentVersion
        │     └── ContentElement
        ├── MediaAsset (Images, Videos, Audios, Docs)
        ├── SCORMPackage (Packaged exports)
        └── LMSConnection (Moodle, Canvas, Blackboard integrations)
```

---

## 3. Defense-in-Depth Security Implementation

### Layer 1: Application-Level Tenant Injection via Prisma Middleware
Every service request resolves the tenant from the verified JWT / session context:
```typescript
// Conceptual Prisma tenant enforcement middleware
prisma.$use(async (params, next) => {
  const currentOrgId = getCurrentOrganizationContext(); // Set via AsyncLocalStorage
  
  if (params.model && isTenantScopedModel(params.model)) {
    if (params.action === 'findMany' || params.action === 'findFirst') {
      params.args.where = {
        ...params.args.where,
        organizationId: currentOrgId,
      };
    }
    if (params.action === 'create') {
      params.args.data.organizationId = currentOrgId;
    }
  }
  return next(params);
});
```

### Layer 2: PostgreSQL Native Row-Level Security (RLS)
To guarantee database-level protection against accidental cross-tenant queries:
```sql
-- Enable RLS on core tables
ALTER TABLE content_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorm_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;

-- Create session variable policy
CREATE POLICY tenant_isolation_policy ON content_projects
FOR ALL
USING (organization_id = NULLIF(current_setting('app.current_organization_id', true), '')::uuid);
```

### Layer 3: Foreign Key Constraints & Composite Keys
High-risk tables employ composite unique constraints `[organization_id, id]` or `[organization_id, slug]`, ensuring foreign key references cannot cross tenant boundaries.

---

## 4. Role-Based Access Control (RBAC) System

The platform distinguishes **System Roles** from **Custom Tenant Roles**:

| Role Code | Type | Description | Permissions Granted |
| :--- | :--- | :--- | :--- |
| `ADMIN` | System | Organization owner / Lead administrator | Full permissions across all modules, billing, settings, and member management. |
| `CONTENT_CREATOR`| System | Instructional designer & author | `course:*`, `project:*`, `media:*`, `export:*`, `preview:*`. Cannot manage billing or tenant roles. |
| `REVIEWER` | System | Subject matter expert / QA | `project:read`, `preview:read`, `comments:write`, `review:status`. Cannot publish or delete. |
| `VIEWER` | System | Read-only auditor or stakeholder | Read access to library, course outlines, and analytics reports. |
| `CUSTOM` | Tenant | Organization-defined role | Configurable subset of granular permissions via `role_permissions` join table. |

---

## 5. Storage Quotas & Resource Enforcing

Each `Organization` record includes:
- `storageQuotaBytes`: Hard disk allocation (e.g. 100 GB for Business Plan).
- Periodically updated via `StorageUsage` snapshots calculated from `media_assets` and `scorm_packages`.
- File upload requests reject any transaction that pushes `totalBytesUsed > storageQuotaBytes`.
