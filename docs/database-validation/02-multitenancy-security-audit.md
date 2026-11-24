# 02 - Multi-Tenancy Security & Data Isolation Audit

**Project:** SCORM & H5P Authoring Studio  
**Audit Phase:** 02.1 — Database Architecture Validation & Production Readiness Audit  
**Scope:** Multi-Tenant Boundaries, Row-Level Security (RLS), and Connection Pooling  

---

## 1. Executive Summary

The platform uses a shared database with row-level tenancy. An in-depth security analysis was conducted to verify whether data isolation is mathematically and architecturally guaranteed across all models, especially across nested relations, high-throughput SCORM commits, and connection-pooled environments.

---

## 2. Direct vs. Indirect Tenant Ownership Audit

Models in the schema fall into two distinct tenancy categories:

### 2.1 Direct Tenant Models (Explicit `organizationId` foreign key)
- `Workspace`, `OrganizationMember`, `Course`, `ContentProject`, `MediaAsset`, `MediaFolder`, `SCORMPackage`, `SCORMExportJob`, `LMSConnection`, `Learner`, `BackgroundJob`, `AuditLog`, `StorageUsage`, `H5PPackageImport`.
- **Verdict:** **SECURE.** These tables support direct, fast, single-column equality checks: `WHERE organization_id = :tenantId`.

### 2.2 Indirect Tenant Models (Subordinate / Child Entities)
- `CourseModule` (via `courseId -> Course`)
- `Lesson` (via `moduleId -> CourseModule -> Course`)
- `ContentDocument`, `ContentVersion`, `ContentElement`, `ContentRevision`, `H5PContent` (via `contentProjectId -> ContentProject`)
- `SCORMManifest`, `SCORMRuntimeConfiguration`, `SCORMContentMapping` (via `scormPackageId -> SCORMPackage`)
- `LearningAttempt` (via `learnerId -> Learner` and `contentProjectId -> ContentProject`)
- `LearningSession`, `AssessmentResult`, `SCORMRuntimeRecord` (via `attemptId -> LearningAttempt`)

### Security Finding: The High-Throughput Join Vulnerability
- **Problem:** For `LearningAttempt`, `AssessmentResult`, and `SCORMRuntimeRecord`, every SCORM API commit (`LMSSetValue` / `LMSCommit`) must be authorized to ensure the submitting learner belongs to the active tenant.
- **Current Relationship:** `SCORMRuntimeRecord -> LearningAttempt -> Learner -> Organization`. An RLS check on `SCORMRuntimeRecord` requires a 3-table join (`JOIN learning_attempts ... JOIN learners ...`).
- **Performance Impact:** Under high learner concurrency (e.g. 10,000 students taking exams simultaneously), multi-table joins on every single CMI commit degrade database throughput.
- **Recommended Schema Refinement:** Adding `organizationId` directly on `LearningAttempt` creates a fast single-level lookup for all tracking telemetry.
- **Severity:** High. Requires Schema Change.

---

## 3. Deprecated Middleware vs. Modern Prisma Client Extensions

### Critical Architecture Flaw in Phase 02 Report
The Phase 02 security document (`docs/database/05-multitenancy-security.md`) recommended using:
```typescript
prisma.$use(async (params, next) => { ... });
```
### Technical Vulnerability:
1. `prisma.$use` was officially **deprecated in Prisma 5** and is **completely removed in Prisma 6+**.
2. Legacy middleware cannot inspect or type-safe enforce nested writes (`createMany`, `connectOrCreate`, `upsert`).
3. Raw queries (`$queryRaw`, `$executeRaw`) completely bypass legacy middleware, leaving raw SQL vulnerable to cross-tenant exposure.

### Recommended Correction:
Adopt **Prisma Client Extensions** with query extensions and a scoped tenant context:
```typescript
// Modern, type-safe tenant extension for Prisma 6+
export const tenantPrisma = (orgId: string) =>
  prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (isTenantModel(model)) {
            // Automatically bind tenant filter to all read and mutation queries
            args.where = { ...args.where, organizationId: orgId };
          }
          return query(args);
        },
      },
    },
  });
```
- **Severity:** Critical. Implementation-level update required before Phase 03.

---

## 4. Connection Pooling & Transaction-Scoped Tenant Safety

### Critical Risk: Connection Context Contamination in PgBouncer / RDS Proxy
When using connection poolers operating in **Transaction Mode**:
- Executing `SET app.current_organization_id = 'org-123';` sets the parameter on the underlying physical connection.
- If the connection is subsequently handed to a query for `org-456` without an explicit reset, data leakage can occur!

### Mandated Architectural Fix:
1. All RLS-enabled tenant queries must execute with `SET LOCAL`:
   ```sql
   SET LOCAL app.current_organization_id = 'org-123';
   ```
2. `SET LOCAL` is valid **only within an explicit transaction block** (`BEGIN ... COMMIT`). Once the transaction completes, the setting is guaranteed to be discarded by PostgreSQL, ensuring zero connection pollution across pooled connections.
3. In Prisma:
   ```typescript
   await prisma.$transaction(async (tx) => {
     await tx.$executeRaw`SET LOCAL app.current_organization_id = ${orgId}::uuid`;
     return tx.contentProject.findMany({ ... });
   });
   ```

---

## 5. PostgreSQL Role Privileges & RLS Bypass Defense

- **Vulnerability:** By default, PostgreSQL database superusers and table owners automatically bypass Row-Level Security (`BYPASSRLS` attribute).
- **Enforcement Rule:**
  - The application backend must connect as an unprivileged application user:
    ```sql
    CREATE ROLE app_user WITH LOGIN PASSWORD '...';
    GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
    -- Explicitly ensure role does NOT have BYPASSRLS
    ALTER ROLE app_user NOBYPASSRLS;
    ```
  - Enable `FORCE ROW LEVEL SECURITY` on all tenant tables so that even table owners cannot accidentally query data without setting the tenant context:
    ```sql
    ALTER TABLE content_projects FORCE ROW LEVEL SECURITY;
    ```
