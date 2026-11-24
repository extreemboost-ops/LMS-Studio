# Organization & Workspace Provisioning Specification

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/authentication/05-organization-provisioning.md`  
**Milestone:** Phase 03.2 — Production Authentication, Authorization & Multi-Tenant Provisioning  
**Status:** Implemented & Verified  
**Date:** November 2026  

---

## 1. Multi-Tenant Organization Hierarchy

The studio models tenancy through a clean, relational hierarchy:

```
[User] ──(Many-to-Many via OrganizationMember)──► [Organization]
                                                         │
                                  ┌──────────────────────┴──────────────────────┐
                                  ▼                                             ▼
                             [Workspace]                                   [Role] (e.g. OWNER)
                                  │                                             │
                      ┌───────────┴───────────┐                         [RolePermission]
                      ▼                       ▼                                 │
                  [Courses]           [ContentProjects]                   [Permission]
```

---

## 2. First-Time Registration Provisioning Transaction

When a user signs up, the application must provision an initial organizational boundary atomically. A partial failure (e.g., user created but organization failed) is completely prohibited.

### Transaction Steps (`AuthService.register`)
```typescript
const result = await prisma.$transaction(async (tx) => {
  // Step 1: Create User
  const user = await tx.user.create({ ... });

  // Step 2: Create Organization
  const organization = await tx.organization.create({
    data: { name: orgName, slug: orgSlug, plan: "business", isActive: true },
  });

  // Step 3: Create Default Workspace
  const workspace = await tx.workspace.create({
    data: { organizationId: organization.id, name: "Main Workspace", slug: "main" },
  });

  // Step 4: Ensure Standard Permissions exist
  for (const perm of SYSTEM_PERMISSIONS) {
    await tx.permission.upsert({ ... });
  }

  // Step 5: Create OWNER role for the organization
  const ownerRole = await tx.role.create({
    data: { organizationId: organization.id, name: "OWNER", isSystem: true },
  });

  // Step 6: Bind all system permissions to OWNER
  const allPermissions = await tx.permission.findMany();
  await tx.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: ownerRole.id, permissionId: p.id })),
  });

  // Step 7: Assign user as active OWNER in OrganizationMember
  const membership = await tx.organizationMember.create({
    data: { organizationId: organization.id, userId: user.id, roleId: ownerRole.id, status: "ACTIVE" },
  });

  return { user, organization, workspace, membership, role: ownerRole, permissions: allPermissions };
});
```

---

## 3. Secondary Organization Creation & Tenant Switching

### Creating Additional Organizations (`POST /api/v1/organizations`)
An existing authenticated user can provision additional independent organizations at any time. The same atomic workflow creates the new organization, default workspace, and assigns the user as `OWNER`.

### Switching Active Organization (`POST /api/v1/organizations/:organizationId/switch`)
When a user switches organizations:
1. The server checks that the user has an `ACTIVE` membership in the target organization.
2. Identifies the default workspace for that organization.
3. Generates a fresh JWT access token containing the target `orgId`, `workspaceId`, `role`, and `permissions`.
4. Client stores the new token and updates `X-Organization-Id` for subsequent requests.

---

## 4. Member Invitations & Lifecycle

### Inviting Members (`POST /api/v1/organizations/:organizationId/invitations`)
- Requires `org:invite` or `org:manage_members` permission.
- Checks if the user is already an active member (avoids redundant memberships).
- Creates an `OrganizationInvitation` with unique cryptographic token and 7-day expiration.
- Dispatches an invitation email to the target address.

### Accepting Invitations (`POST /api/v1/invitations/accept`)
- Requires authenticated user session.
- Asserts invitation token validity and email address match.
- Transactionally provisions `OrganizationMember` with assigned `roleId` and marks invitation `status = ACTIVE`.
