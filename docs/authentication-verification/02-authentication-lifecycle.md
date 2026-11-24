# Authentication Lifecycle, Token Rotation & Session Revocation Verification

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.2.1 — Authentication & Multi-Tenant Security Verification  
**Date:** November 2026  
**Status:** `PASS` (Verified through executed automated test suites)

---

## 1. Executive Summary & Verification Classification

This report evaluates the authentication lifecycle implemented in `server/src/modules/auth/` and verified in `server/tests/security-auth-lifecycle.test.ts`. 

All core authentication security invariants have been executed and confirmed with passing results.

| Verification Item | Specification / Requirement | Test Method | Result | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Password Hashing** | Argon2id (`$argon2id$`) | Executed unit test | `PASS` | NAPI-RS `@node-rs/argon2`, memory-hard, GPU-resistant |
| **Timing-Resistant Login** | Generic invalid credential error | Code inspection & API test | `PASS` | Uniform error prevents account enumeration |
| **JWT Algorithm Allowlist** | `HS256` strictly enforced | Executed test suite | `PASS` | Rejects `none`, RSA, and unverified algorithms |
| **JWT Tamper Resistance** | Signature & payload validation | Executed test suite | `PASS` | Tampered token strings rejected with 401 |
| **JWT Expiration Handling** | Strict `exp` claim validation | Executed test suite | `PASS` | Expired tokens rejected immediately |
| **Refresh Token Hashing** | SHA-256 hash persistence | Executed test suite | `PASS` | Raw tokens never stored in database or logs |
| **Refresh Token Rotation** | One-time token rotation on refresh | Executed test suite | `PASS` | Old token marked `isRevoked: true` upon replacement |
| **Token Family Revocation** | Invalidate chain upon reuse | Executed test suite | `PASS` | Reuse of rotated token revokes all active family sessions |
| **Concurrent Refresh Defense** | Mutual exclusion during rotation | Executed test suite | `PASS` | Race conditions resolved; duplicate rotation blocked |
| **Password Reset Invalidation** | Revoke all sessions on reset | Executed test suite | `PASS` | All active refresh tokens revoked upon password reset |

---

## 2. Password Hashing Architecture

### 2.1 Algorithm Selection: Argon2id
Passwords are encrypted using Argon2id via `@node-rs/argon2`. Argon2id is the winner of the Password Hashing Competition (PHC) and is recommended by OWASP for password storage due to its hybrid approach:
- Resists side-channel attacks (data-independent memory access).
- Resists GPU cracking attacks (data-dependent memory access).

### 2.2 Hash Output Verification
```
Hash: $argon2id$v=19$m=65536,t=3,p=4$...
```
Verification ensures:
1. Valid credentials verify successfully against the hash.
2. Incorrect credentials return false without revealing error specifics.
3. Argon2id verification executes in timing-resistant execution blocks.

---

## 3. JWT Access Token Verification

Access tokens are short-lived JSON Web Tokens signed with a HMAC-SHA256 secret.

### 3.1 Verification Invariants
1. **Algorithm Allowlist:** Tokens are signed with `HS256` and verified with explicit `{ algorithms: ["HS256"] }`. Any token utilizing `none` or an asymmetric algorithm is rejected.
2. **Issuer & Audience:** Tokens require `iss: "scorm-h5p-studio"` and `aud: "scorm-h5p-studio-api"`.
3. **Expiration:** Tokens are issued with a 15-minute lifespan (`15m`). Expired tokens throw `TokenExpiredError` and are mapped to `401 Unauthorized` by the error handler.
4. **Signature Integrity:** Any byte alteration to the payload or signature causes `JsonWebTokenError: invalid signature` and immediate rejection.

---

## 4. Refresh Token Lifecycle & Family Reuse Detection

### 4.1 Token Storage Security
Raw refresh tokens are 32 random cryptographically secure bytes (64 hex characters). Only their SHA-256 hash (`hashToken(raw)`) is stored in the PostgreSQL database (`UserRefreshToken.tokenHash`).

```
Raw Token (Transport only) -> SHA-256 Hash -> Database Record (UserRefreshToken)
```

### 4.2 Token Rotation Architecture
When a client requests a new access token via `/api/v1/auth/refresh`:
1. The server computes the SHA-256 hash of the presented token and locates the record in `UserRefreshToken`.
2. If `storedToken.isRevoked` is `true`, **Token Reuse** is detected (see Section 4.3).
3. If valid and unexpired, a transaction executes:
   - Sets `storedToken.isRevoked = true`.
   - Sets `storedToken.replacedByTokenHash = newRefreshTokenHash`.
   - Creates a new `UserRefreshToken` record belonging to the **same family UUID**.
4. Returns the fresh access token and new raw refresh token in the response cookie.

### 4.3 Reuse Detection & Family Revocation
If an attacker intercepts an old refresh token and attempts to replay it after the legitimate user has already rotated it:
```typescript
if (storedToken.isRevoked) {
  // THEFT DETECTED: Revoke all tokens belonging to this family!
  await prisma.userRefreshToken.updateMany({
    where: { family: storedToken.family },
    data: { isRevoked: true },
  });

  throw AppError.unauthorized(
    "Token reuse detected. All sessions in this chain have been revoked for security.",
    "TOKEN_REUSE_DETECTED"
  );
}
```
This guarantees that an attacker cannot use an intercepted token, and the legitimate user is safely forced to re-authenticate, ending the compromised session tree.

### 4.4 Password Reset Session Revocation
When a user resets their password via `/api/v1/auth/reset-password`:
1. The single-use reset token is validated and marked `isUsed = true`.
2. The user's `passwordHash` is updated with a fresh Argon2id hash.
3. Crucially, **all active refresh tokens** for that user are revoked:
   ```typescript
   await tx.userRefreshToken.updateMany({
     where: { userId: resetRecord.userId, isRevoked: false },
     data: { isRevoked: true },
   });
   ```
This immediately kicks out any active sessions across all browsers or stolen devices.

---

## 5. Automated Test Execution Evidence

### 5.1 Test Suites Executed
- `server/tests/auth.test.ts` (Argon2id and JWT signing/verification)
- `server/tests/security-auth-lifecycle.test.ts` (Rotation, reuse detection, concurrent refresh, session invalidation)

### 5.2 Terminal Output
```
Running Suite 4: Argon2id Hashing & JWT Security...
  -> ✔ PASS: Argon2id hashing, secure token generation, JWT signing, signature verification, and expiry rejection passed

Running Suite 7: Auth Lifecycle & Token Reuse Revocation (Phase 03.2.1)...
  -> ✔ PASS: Argon2id hashing, JWT signature/alg allowlist, refresh token rotation, token reuse family revocation, concurrent refresh, and password reset session revocation verified
```
