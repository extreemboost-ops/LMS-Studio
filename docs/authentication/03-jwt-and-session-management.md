# JWT & Session Management Specification

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/authentication/03-jwt-and-session-management.md`  
**Milestone:** Phase 03.2 — Production Authentication, Authorization & Multi-Tenant Provisioning  
**Status:** Implemented & Verified  
**Date:** November 2026  

---

## 1. Dual-Token Architecture

To maximize security while ensuring high API performance, the studio employs a dual-token strategy:

```
+---------------------------------------------------------------------------------------+
|                                Dual-Token Strategy                                    |
+---------------------------------------------------+-----------------------------------+
|               Access Token (JWT)                  |        Refresh Token (Opaque)     |
+---------------------------------------------------+-----------------------------------+
| - Short-lived (15 minutes)                        | - Long-lived (7 days)             |
| - Stateless, cryptographically signed             | - Stateful, persisted in database |
| - Stored in client memory / sessionStorage        | - Stored in HttpOnly cookie       |
| - Attached in Authorization: Bearer header        | - Attached via cookie transport   |
| - Carries verified identity & tenant claims       | - Used only to rotate & refresh   |
+---------------------------------------------------+-----------------------------------+
```

---

## 2. JWT Access Token Structure & Claims

Access tokens are signed using HMAC-SHA256 (`HS256`) with strict validation parameters:

### Token Payload Schema
```json
{
  "sub": "b2c1d3e4-5678-49ab-8cde-0123456789ab",
  "email": "alex@acme.edu",
  "isSuperAdmin": false,
  "orgId": "9f8e7d6c-5b4a-3210-9876-543210fedcba",
  "workspaceId": "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
  "role": "OWNER",
  "permissions": [
    "org:admin",
    "org:manage_members",
    "org:invite",
    "workspace:create",
    "content:create",
    "content:edit",
    "content:publish",
    "scorm:export",
    "h5p:export"
  ],
  "iss": "scorm-h5p-studio",
  "aud": "scorm-h5p-studio-api",
  "iat": 1732128000,
  "exp": 1732128900
}
```

### Verification Constraints (`server/src/utils/jwt.ts`)
- **Algorithm Allowlist:** Strictly `["HS256"]`. Prevents algorithm switching or `"none"` attacks.
- **Issuer Validation:** Must match `env.JWT_ISSUER` (`scorm-h5p-studio`).
- **Audience Validation:** Must match `env.JWT_AUDIENCE` (`scorm-h5p-studio-api`).
- **Clock Tolerance:** 0 seconds; expired tokens immediately trigger HTTP 401 `TOKEN_EXPIRED`.

---

## 3. Session Transport & Cookie Security

Refresh tokens are transported via HTTP cookies configured for maximum defense:

```typescript
res.cookie("refreshToken", token, {
  httpOnly: true,                                       // Inaccessible to document.cookie (prevents XSS exfiltration)
  secure: env.COOKIE_SECURE || env.NODE_ENV === "production", // Transmitted over HTTPS only
  sameSite: "lax",                                      // Protects against CSRF in cross-site requests
  path: "/api/v1/auth",                                 // Cookie sent only to auth endpoints
  maxAge: 7 * 24 * 60 * 60 * 1000,                     // 7 days in milliseconds
});
```

---

## 4. Session Revocation Protocols

1. **User Logout (`POST /api/v1/auth/logout`):** Hashes the cookie refresh token, marks `isRevoked = true` in `user_refresh_tokens`, and clears the cookie via `clearCookie()`.
2. **Logout All Devices (`POST /api/v1/auth/logout-all`):** Sets `isRevoked = true` for all active refresh tokens belonging to `req.user.id`.
3. **Password Change Revocation:** Whenever a password is reset, all active refresh tokens for the user are automatically marked as revoked.
