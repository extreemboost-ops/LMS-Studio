# 05 — LMS Credential Encryption & Security Architecture

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.6 — LMS Integration Services  
**Cryptographic Primitives:** AES-256-GCM (Authenticated Encryption), RSA 2048 / RS256 (Asymmetric Signatures)  

---

## 1. Zero-Trust Credential Security Model

Enterprise LMS integrations require storing sensitive third-party credentials:
- OAuth2 `clientSecret` and `refreshToken` values.
- Moodle Web Services API tokens (`wstoken`).
- Blackboard application secrets and SCORM Cloud secret keys.

Storing these credentials in plaintext or with reversible unauthenticated ciphers exposes tenants to severe supply-chain attacks. Our platform implements strict **AES-256-GCM authenticated encryption**:

```
[ Sensitive Plaintext JSON ]
         │
         ▼
[ SHA-256 Derived Master Key (32 bytes) ]
         │
         ▼
[ AES-256-GCM Cipher ] ──► Random 96-bit IV
         │
         ├──► 128-bit Authentication Tag (tag)
         └──► Hex-Encoded Ciphertext (data)
         │
         ▼
[ Stored in PostgreSQL (credentials_encrypted JSONB) ]
```

---

## 2. Authenticated Encryption with Associated Data (AEAD) Invariants

1. **Tamper Detection:** AES-GCM guarantees both confidentiality and authenticity. If an attacker modifies even a single bit of the encrypted payload or the authentication tag, `decipher.final()` throws an immediate exception, completely halting execution.
2. **Deterministic Secret Masking:** When reading connections via API endpoints or internal loggers, `LMSCryptoService.sanitizeCredentials()` automatically masks all sensitive keys (`clientSecret`, `apiKey`, `accessToken`, `password`), revealing only non-sensitive metadata (such as `clientId` or `iss`).
3. **No Credential Logging:** Secrets are permanently excluded from server logs, audit tables, and API responses.
