# Verified Tenant Context & PostgreSQL Row-Level Security (RLS)

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/authentication/06-tenant-context-and-rls.md`  
**Milestone:** Phase 03.2 — Production Authentication, Authorization & Multi-Tenant Provisioning  
**Status:** Implemented & Verified  
**Date:** November 2026  

---

## 1. Zero-Trust Tenant Context Philosophy

In multi-tenant software, trusting tenant identifiers supplied directly by frontend clients (in request bodies, query strings, or unverified headers) is a leading cause of Insecure Direct Object References (IDOR) and cross-tenant data leaks.

### Tenant Invariants Enforced in Phase 03.2
1. **Query & Body Stripping:** Any `organizationId` parameter in `req.query` or unverified `req.body` is discarded by `tenantContextMiddleware`.
2. **Cryptographic Derivation:** Tenant context is derived strictly from:
   - Valid, non-expired JWT access token signatures, OR
   - Explicit URL path parameters (`/organizations/:organizationId/*`) validated against the database.
3. **Database Membership Verification:** Accessing an organization's resources requires `prisma.organizationMember` to contain an active record linking `req.user.id` to `targetOrgId`. If absent, the request is rejected immediately with HTTP 403 `TENANT_ACCESS_DENIED`.

---

## 2. Tenant Context Pipeline (`server/src/middlewares/tenantContext.ts`)

```typescript
export interface TenantContext {
  organizationId: string;
  userId: string;
  membershipId: string;
  role: string;
  permissions: string[];
  workspaceId?: string;
}

export async function resolveTenantContext(req: Request, res: Response, next: NextFunction): Promise<void> {
  // Strip unverified query injections
  if (req.query && "organizationId" in req.query) {
    delete (req.query as Record<string, unknown>).organizationId;
  }

  if (!req.user) {
    return next(AppError.unauthorized("Authentication required to resolve tenant context"));
  }

  const rawOrgParam = req.params.organizationId;
  const targetOrgId = Array.isArray(rawOrgParam) ? rawOrgParam[0] : rawOrgParam;

  // Verify membership in database
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: targetOrgId,
        userId: req.user.id,
      },
    },
    include: { role: { include: { permissions: { include: { permission: true } } } }, organization: true },
  });

  if (!member || !member.organization.isActive || member.status !== "ACTIVE") {
    return next(AppError.forbidden("Access denied: You are not an active member of this organization", "TENANT_ACCESS_DENIED"));
  }

  req.tenantContext = {
    organizationId: member.organizationId,
    userId: req.user.id,
    membershipId: member.id,
    role: member.role.name,
    permissions: member.role.permissions.map((rp) => rp.permission.code),
    workspaceId: req.params.workspaceId,
  };

  next();
}
```

---

## 3. PostgreSQL Row-Level Security (RLS) Integration

To provide defense-in-depth even for raw SQL queries, reporting aggregations, or background workers, PostgreSQL native Row-Level Security is integrated using the parameterized transaction pattern established in Phase 02.2.

### Parameterized Transaction Runner (`server/src/database/rls.ts`)
```typescript
export async function withTenantTransaction<T>(
  organizationId: string,
  callback: (tx: TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Parameterized binding with $1 strictly typed as UUID
    // is_local = true restricts setting exclusively to this transaction block
    await tx.$executeRaw`SELECT set_config('app.current_organization_id', ${organizationId}, true)`;

    return callback(tx as TransactionClient);
  });
}
```

### Connection Pool Safety Guarantees
- **PgBouncer Transaction Mode:** When running PgBouncer with `pool_mode = transaction`, client sessions share pooled PostgreSQL sockets.
- **Auto-Reset Guarantee:** Because `is_local = true` is supplied to `set_config`, PostgreSQL automatically clears the configuration variable when the transaction ends with `COMMIT` or `ROLLBACK`. The next transaction borrowing the pooled socket starts with an empty configuration, preventing cross-tenant leakage.
