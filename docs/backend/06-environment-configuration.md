# Environment Configuration Specification

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/backend/06-environment-configuration.md`  
**Milestone:** Phase 03.1 — Production Backend Foundation  
**Status:** Approved & Implemented  
**Date:** November 2026  

---

## 1. Environment Variables Dictionary

| Variable Name | Type | Default Value | Description |
|:---|:---|:---|:---|
| `NODE_ENV` | Enum | `"development"` | Active runtime environment: `'development'`, `'test'`, or `'production'`. |
| `PORT` | Integer | `4000` | TCP port on which Express listens. |
| `HOST` | String | `"0.0.0.0"` | Network interface to bind (binds to all interfaces by default). |
| `DATABASE_URL` | String (URL) | `postgresql://postgres:postgres@localhost:5432/scorm_h5p_studio?schema=public` | PostgreSQL connection string for Prisma Client & connection pool. |
| `DIRECT_URL` | String (URL) | Optional | Direct connection string bypassing connection poolers (used for migrations). |
| `CORS_ORIGIN` | String (CSV) | `"http://localhost:5173,http://localhost:8443,http://localhost:3000"` | Comma-delimited list of permitted HTTP origins. |
| `LOG_LEVEL` | Enum | `"info"` | Minimum log level: `'fatal'`, `'error'`, `'warn'`, `'info'`, `'debug'`, `'trace'`. |
| `RATE_LIMIT_WINDOW_MS` | Integer | `900000` (15m) | Time window in milliseconds for IP rate limiting. |
| `RATE_LIMIT_MAX_REQUESTS` | Integer | `1000` | Maximum allowed requests per IP per window. |
| `JWT_SECRET` | String | Development default | Cryptographic secret for signing and verifying tokens (min 16 chars). |

---

## 2. Environment Profiles

### Development Profile (`NODE_ENV=development`)
- Express logs detailed debug information with colored console outputs.
- Prisma logs `warn` and `error` events to console.
- Stack traces are returned in error JSON responses for rapid debugging.
- Rate limits are generous (1,000 requests per 15 minutes).
- Default database connects to local PostgreSQL instance.

### Test Profile (`NODE_ENV=test`)
- Express and Prisma logs are suppressed to keep test runner output clean.
- Supertest can spin up in-memory Express instances without occupying network ports.
- Configuration tests can instantiate isolated environments.

### Production Profile (`NODE_ENV=production`)
- Express logs structured JSON lines only (optimized for Datadog, CloudWatch, or Google Cloud Logging).
- Stack traces and internal error messages are strictly suppressed.
- `CORS_ORIGIN` must point explicitly to production frontend domains.
- `JWT_SECRET` must be a high-entropy cryptographically random string (e.g. 64 hex characters).

---

## 3. `.env.example` Template

The workspace contains `.env.example` to provide developers with a clear template for local setup:

```bash
# Node Environment
NODE_ENV=development

# Server Port & Host
PORT=4000
HOST=0.0.0.0

# PostgreSQL Database Connection URL
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/scorm_h5p_studio?schema=public"

# CORS Allowed Origins
CORS_ORIGIN="http://localhost:5173,http://localhost:8443,http://localhost:3000"

# Logging Level
LOG_LEVEL=info

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000

# Authentication & JWT Secrets
JWT_SECRET="dev-secret-key-scorm-h5p-studio-min32chars-for-safety"
```
