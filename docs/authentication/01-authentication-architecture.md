# Authentication & Authorization Architecture Specification

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/authentication/01-authentication-architecture.md`  
**Milestone:** Phase 03.2 — Production Authentication, Authorization & Multi-Tenant Provisioning  
**Status:** Implemented & Verified  
**Date:** November 2026  

---

## 1. Architectural Mission

The authentication and multi-tenancy subsystem provides a zero-trust, cryptographically verified security boundary for the SCORM & H5P Authoring Studio. It guarantees:
1. **Strong Password Security:** Industry-standard Argon2id password hashing compliant with OWASP guidelines.
2. **Dual-Token Architecture:** Short-lived JWT access tokens paired with rotating, family-tracked refresh tokens stored in secure HttpOnly cookies.
3. **Atomic Tenant Provisioning:** Single-transaction creation of User, Organization, Workspace, Roles, and Memberships upon first registration.
4. **Verified Tenant Context:** Complete isolation where `organizationId` is derived exclusively from verified JWT signatures and database membership records, rejecting any client-supplied spoofing attempts.
5. **Database-Backed RBAC:** Five distinct system roles (`OWNER`, `ADMIN`, `AUTHOR`, `REVIEWER`, `VIEWER`) mapped to fine-grained permission codes.
6. **PostgreSQL RLS Integration:** Parameterized transaction-scoped context execution using `SELECT set_config('app.current_organization_id', $1, true)`.

---

## 2. Authentication Flow & Token Lifecycle

```
[Client Application]                                [Auth API Server]                            [PostgreSQL Database]
        │                                                   │                                              │
        │─── POST /api/v1/auth/register (Credentials) ─────►│                                              │
        │                                                   │─── Begin ACID Transaction ──────────────────►│
        │                                                   │    1. Hash Password (Argon2id)               │
        │                                                   │    2. Create User                            │
        │                                                   │    3. Create Organization & Workspace        │
        │                                                   │    4. Assign OWNER Role & Permissions        │
        │                                                   │    5. Create Refresh & Verification Tokens   │
        │                                                   │◄── Commit Transaction ───────────────────────│
        │◄── HTTP 201 Created ──────────────────────────────│
        │    Body: { user, org, workspace, accessToken }    │
        │    Set-Cookie: refreshToken (HttpOnly, SameSite)  │
        │                                                   │
        │                                                   │
[Subsequent API Calls]                                      │
        │─── GET /api/v1/organizations/:id/workspaces ──────►│
        │    Header: Authorization: Bearer <accessToken>    │─── Verify JWT Signature & Expiry             │
        │                                                   │─── Verify DB Active Membership ─────────────►│
        │                                                   │    Assert targetOrgId === member.orgId       │
        │                                                   │    Populate req.tenantContext                │
        │                                                   │─── Execute within RLS Transaction ──────────►│
        │                                                   │    SELECT set_config(...)                    │
        │◄── HTTP 200 OK (Protected Data) ──────────────────│◄── Result ───────────────────────────────────│
        │                                                   │
        │                                                   │
[Token Refresh & Rotation]                                  │
        │─── POST /api/v1/auth/refresh ─────────────────────►│
        │    Cookie: refreshToken                           │─── Hash Token & Lookup in DB ───────────────►│
        │                                                   │    Assert isRevoked === false                │
        │                                                   │    (If revoked: Revoke Family & Alarm!)      │
        │                                                   │    Rotate: Mark old revoked, issue new       │
        │◄── HTTP 200 OK ───────────────────────────────────│◄── Persist new refresh token ───────────────│
        │    Body: { accessToken }                          │
        │    Set-Cookie: newRefreshToken (HttpOnly)         │
```

---

## 3. Threat Model & Mitigations

| Threat | Architectural Mitigation | Status |
|:---|:---|:---|
| **Credential Stuffing / Brute-Force** | IP sliding-window rate limiting (`1,000 req / 15 min`) + Argon2id compute penalty (19 MiB memory, 2 iterations). | **ACTIVE** |
| **User Enumeration** | Generic invalid-credential messages on login; identical response on forgot-password whether email exists or not. | **ACTIVE** |
| **Token Theft / Replay** | Short-lived access tokens (15 mins); refresh tokens rotated on every use with family-wide revocation on reuse detection. | **ACTIVE** |
| **XSS Token Exfiltration** | Refresh tokens conveyed exclusively via HttpOnly, SameSite cookies inaccessible to JavaScript. | **ACTIVE** |
| **Cross-Tenant Access / IDOR** | Zero trust for frontend-supplied `organizationId`; mandatory membership verification before populating `req.tenantContext`. | **ACTIVE** |
| **Database Tenant Leaks** | Engine-level composite foreign keys (`[organizationId, id]`) and transaction-scoped RLS `set_config`. | **ACTIVE** |
