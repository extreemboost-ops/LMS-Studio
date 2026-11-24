# Refresh Token Security & Family Rotation Specification

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/authentication/04-refresh-token-security.md`  
**Milestone:** Phase 03.2 — Production Authentication, Authorization & Multi-Tenant Provisioning  
**Status:** Implemented & Verified  
**Date:** November 2026  

---

## 1. Threat Profile: Refresh Token Theft

If an attacker intercepts or steals a long-lived refresh token, they could potentially maintain unauthorized access indefinitely. To neutralize this threat, the studio implements **Cryptographic Refresh Token Rotation with Token Family Reuse Detection** (RFC 6819 §5.2.2.3).

---

## 2. Token Family & Rotation Lifecycle

```
[Initial Login]
  │
  └── Generates Token RT-1 (Family: F-1, isRevoked: false)
        │
[First Refresh Call (/api/v1/auth/refresh with RT-1)]
  │
  ├── 1. RT-1 is marked as isRevoked: true, replacedByTokenHash: hash(RT-2)
  └── 2. Generates Token RT-2 (Family: F-1, isRevoked: false)
        │
[Second Refresh Call (/api/v1/auth/refresh with RT-2)]
  │
  ├── 1. RT-2 is marked as isRevoked: true, replacedByTokenHash: hash(RT-3)
  └── 2. Generates Token RT-3 (Family: F-1, isRevoked: false)
        │
[ATTACK SCENARIO: Attacker uses stolen RT-1]
  │
  ├── 1. Server looks up RT-1 -> Finds isRevoked === true!
  ├── 2. REUSE DETECTED!
  ├── 3. Server immediately revokes ENTIRE Family F-1:
  │      UPDATE user_refresh_tokens SET isRevoked = true WHERE family = 'F-1'
  └── 4. Rejects request with HTTP 401 TOKEN_REUSE_DETECTED
        (Legitimate user and attacker are both evicted; forces fresh login)
```

---

## 3. Database Persistence Schema (`user_refresh_tokens`)

Raw refresh tokens are never persisted in plain text:

```prisma
model UserRefreshToken {
  id                  String   @id @default(uuid()) @db.Uuid
  userId              String   @map("user_id") @db.Uuid
  tokenHash           String   @unique @map("token_hash") @db.VarChar(255) // SHA-256 hash
  family              String   @db.Uuid                                    // Token lineage group
  isRevoked           Boolean  @default(false) @map("is_revoked")
  replacedByTokenHash String?  @map("replaced_by_token_hash") @db.VarChar(255)
  userAgent           String?  @map("user_agent") @db.VarChar(512)
  ipAddress           String?  @map("ip_address") @db.VarChar(45)
  expiresAt           DateTime @map("expires_at")
  createdAt           DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, isRevoked])
  @@index([family])
  @@map("user_refresh_tokens")
}
```

---

## 4. Mechanical Guarantees

1. **SHA-256 One-Way Storage:** Even if database backups or read replicas are breached, raw refresh tokens cannot be reversed.
2. **Atomic Invalidation:** Revoking the old token and issuing the new token occur within a single database transaction (`prisma.$transaction`).
3. **Audit Evidence:** `userAgent` and `ipAddress` are captured on each issuance to aid security forensics.
