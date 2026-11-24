# Authentication & Multi-Tenancy API Reference

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/authentication/08-api-reference.md`  
**Milestone:** Phase 03.2 — Production Authentication, Authorization & Multi-Tenant Provisioning  
**Status:** Implemented & Verified  
**Date:** November 2026  

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /api/v1/auth/register`
Provisions user, organization, default workspace, and OWNER role atomically.
- **Request Body:**
  ```json
  {
    "firstName": "Jane",
    "lastName": "Doe",
    "email": "jane@example.com",
    "password": "Password123!",
    "organizationName": "Acme Academy"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "uuid", "email": "jane@example.com", "firstName": "Jane", "lastName": "Doe" },
      "organization": { "id": "uuid", "name": "Acme Academy", "slug": "acme-academy-a1b2" },
      "workspace": { "id": "uuid", "name": "Main Workspace", "slug": "main" },
      "accessToken": "eyJhbGciOiJIUzI1Ni..."
    },
    "meta": { "requestId": "uuid", "timestamp": "..." }
  }
  ```
- **Cookie Set:** `refreshToken` (HttpOnly, SameSite=Lax, Secure).

### `POST /api/v1/auth/login`
Authenticates user with email and password.
- **Request Body:** `{ "email": "jane@example.com", "password": "Password123!" }`
- **Response (200 OK):** User summary, active organization context, and `accessToken`.

### `POST /api/v1/auth/refresh`
Rotates refresh token and issues fresh access token.
- **Transport:** `refreshToken` cookie.
- **Response (200 OK):** `{ "accessToken": "eyJhbGci..." }`.

### `POST /api/v1/auth/logout`
Revokes active session cookie.
- **Response (200 OK):** `{ "loggedOut": true }`.

### `POST /api/v1/auth/logout-all`
Revokes all refresh tokens for the user across all devices (Requires `Authorization: Bearer <token>`).

### `POST /api/v1/auth/forgot-password`
Dispatches password reset token. Always returns generic message to prevent user enumeration.

### `POST /api/v1/auth/reset-password`
Resets password and revokes all active sessions.

### `POST /api/v1/auth/verify-email`
Verifies user email address.

---

## 2. User Endpoints (`/api/v1/users`)

### `GET /api/v1/users/me`
Retrieves authenticated user profile with active organization memberships.

### `PATCH /api/v1/users/me`
Updates user profile information (`firstName`, `lastName`, `avatarUrl`).

---

## 3. Organization Endpoints (`/api/v1/organizations`)

### `GET /api/v1/organizations`
Lists all organizations where the user has an active membership.

### `POST /api/v1/organizations`
Creates a new organization with default workspace and OWNER role.

### `GET /api/v1/organizations/:organizationId`
Retrieves organization details if the user is an active member.

### `POST /api/v1/organizations/:organizationId/switch`
Switches active organization context and issues an updated JWT access token.

---

## 4. Member Endpoints (`/api/v1/organizations/:organizationId/members`)

### `GET /api/v1/organizations/:organizationId/members`
Lists all active members and pending invitations.

### `POST /api/v1/organizations/:organizationId/invitations`
Invites a new member by email with an assigned role.

### `POST /api/v1/invitations/accept`
Accepts an invitation using the cryptographic invitation token.

---

## 5. Workspace Endpoints (`/api/v1/organizations/:organizationId/workspaces`)

### `GET /api/v1/organizations/:organizationId/workspaces`
Lists all workspaces within the organization with counts of courses and projects.

### `POST /api/v1/organizations/:organizationId/workspaces`
Creates a new workspace within the organization.
