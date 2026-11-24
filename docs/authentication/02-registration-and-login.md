# User Registration & Login Specification

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/authentication/02-registration-and-login.md`  
**Milestone:** Phase 03.2 — Production Authentication, Authorization & Multi-Tenant Provisioning  
**Status:** Implemented & Verified  
**Date:** November 2026  

---

## 1. Registration Pipeline (`POST /api/v1/auth/register`)

### 1.1 Input Validation Rules
All incoming payloads are validated via Zod (`registerSchema`):
- `firstName`: Required, string, 1 to 100 characters.
- `lastName`: Required, string, 1 to 100 characters.
- `email`: Required, valid email format, converted to lowercase, max 255 characters.
- `password`: Required, minimum 8 characters, containing at least:
  - 1 uppercase letter (`[A-Z]`)
  - 1 lowercase letter (`[a-z]`)
  - 1 number (`[0-9]`)
- `organizationName`: Optional string, 2 to 255 characters (defaults to `"${firstName}'s Organization"`).

### 1.2 Execution Lifecycle
1. **Normalization:** The email is converted to lowercase and trimmed.
2. **Duplicate Check:** Query `prisma.user.findUnique({ where: { email } })`. If exists, return HTTP 409 `EMAIL_EXISTS`.
3. **Argon2id Hashing:** Hashes the password with OWASP parameters (19 MiB memory cost, 2 iterations, parallelism 1, algorithm Argon2id).
4. **Token Generation:** Generates raw 256-bit crypto tokens for email verification and the initial refresh token; hashes them with SHA-256 for database storage.
5. **Atomic Provisioning Transaction:** Executes in a single ACID transaction:
   - Inserts `User`.
   - Inserts `Organization` with unique slug.
   - Inserts default `Workspace` (`Main Workspace`, slug `main`).
   - Ensures standard system permissions exist.
   - Creates `OWNER` and system roles for the organization.
   - Creates `OrganizationMember` with status `ACTIVE`.
   - Inserts `EmailVerificationToken` (expires in 24 hours).
   - Inserts `UserRefreshToken` (expires in 7 days).
6. **Email Dispatch:** Sends a verification email containing the verification token.
7. **Token Issuance:** Returns HTTP 201 with signed JWT access token and sets HttpOnly refresh cookie.

---

## 2. Authentication Pipeline (`POST /api/v1/auth/login`)

### 2.1 Execution Lifecycle
1. **Input Validation:** Zod validates email and password presence.
2. **User Lookup:** Queries `prisma.user.findUnique({ where: { email } })` including active memberships, organization details, roles, and permissions.
3. **Timing-Safe Failure:** If user does not exist or has no password hash, the request is rejected with HTTP 401 `INVALID_CREDENTIALS`.
4. **Argon2id Verification:** Verifies the supplied password against `user.passwordHash`. If verification fails, returns HTTP 401 `INVALID_CREDENTIALS`.
5. **Tenant Context Resolution:** Identifies user's primary organization membership and default workspace.
6. **Session Creation:** Creates a new refresh token family in `user_refresh_tokens` recording user agent and IP address.
7. **JWT Access Token Issuance:** Signs an access token containing `sub`, `email`, `orgId`, `workspaceId`, `role`, and `permissions`.
8. **Response:** Sets HttpOnly `refreshToken` cookie and returns HTTP 200 with user summary and `accessToken`.

---

## 3. Account Verification & Password Recovery

### Email Verification (`POST /api/v1/auth/verify-email`)
- Computes SHA-256 hash of the incoming token.
- Validates token presence in `email_verification_tokens`, checking `isUsed === false` and `expiresAt > NOW()`.
- Updates `User.isEmailVerified = true` and `User.emailVerifiedAt = NOW()`.
- Marks token `isUsed = true`.

### Forgot Password (`POST /api/v1/auth/forgot-password`)
- Normalizes email.
- If user exists: generates single-use reset token (valid 1 hour), stores SHA-256 hash in `password_reset_tokens`, and dispatches email.
- **Zero User Enumeration:** Always returns HTTP 200 with message *"If an account with this email exists, a password reset email has been dispatched."*

### Password Reset (`POST /api/v1/auth/reset-password`)
- Hashes token and checks `isUsed === false` and `expiresAt > NOW()`.
- Validates new password strength.
- Hashes new password with Argon2id.
- In one ACID transaction: updates `user.passwordHash`, marks token `isUsed = true`, and **revokes all active refresh tokens for the user** to prevent session hijacking.
