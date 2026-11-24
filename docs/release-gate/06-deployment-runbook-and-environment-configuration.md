# SCORM & H5P Authoring Studio — Deployment Runbook & Environment Configuration
## Document Ref: `docs/release-gate/06-deployment-runbook-and-environment-configuration.md`
### Phase 07 Final Release Gate — Production Deployment & Operations

---

## 1. Prerequisites & Toolchain Specification

The production host environment must satisfy the following minimum requirements:
- **Node.js:** v20.18.0 LTS or higher (tested with v20.19.6).
- **Package Manager:** `pnpm` v9.x or `npm` v10.x.
- **Database:** PostgreSQL 15 or 16 with native Row-Level Security (RLS) support.
- **Connection Pooler:** PgBouncer (Transaction pooling mode compatible).
- **Compute Sizing:** Minimum 2 vCPUs, 4 GB RAM (8 GB recommended for high export concurrency).

---

## 2. Environment Configuration Reference (`.env.production`)

```ini
# ==============================================================================
# SERVER & NETWORK
# ==============================================================================
NODE_ENV=production
PORT=8443
HOST=0.0.0.0
CORS_ORIGIN=https://studio.your-institution.edu
API_PREFIX=/api/v1

# ==============================================================================
# DATABASE (POSTGRESQL WITH RLS)
# ==============================================================================
DATABASE_URL="postgresql://authoring_user:StrictVaultPassword123!@pg-cluster.internal:5432/authoring_studio?schema=public&sslmode=require"
DIRECT_URL="postgresql://authoring_user:StrictVaultPassword123!@pg-cluster.internal:5432/authoring_studio?schema=public&sslmode=require"

# ==============================================================================
# CRYPTOGRAPHIC KEYS & TOKEN SECRETS
# ==============================================================================
# 256-bit high-entropy secret for HMAC signing & AES-256-GCM master derivation
JWT_SECRET="e9b21f37c89a0e4b85c34791da046b28f731a52093e4d9b62a84c7e1f58203b9"
JWT_ISSUER="https://auth.authoring-studio.internal"
JWT_AUDIENCE="https://studio.your-institution.edu"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# ==============================================================================
# COOKIE SECURITY
# ==============================================================================
COOKIE_SECRET="7a4d9c28e10b4f85a3c91e7428f5b03e4819ca73b2d1840e6c52a97184ef3901"
COOKIE_DOMAIN=".your-institution.edu"
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax

# ==============================================================================
# STORAGE & PACKAGING
# ==============================================================================
STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=/var/data/authoring-studio/packages
STORAGE_MAX_FILE_SIZE_BYTES=524288000 # 500 MB
DEFAULT_STORAGE_QUOTA_BYTES=10737418240 # 10 GB per organization

# ==============================================================================
# LMS INTEGRATION DEFAULTS
# ==============================================================================
LTI_KEY_ROTATION_INTERVAL_DAYS=90
```

---

## 3. Step-by-Step Production Deployment Guide

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/organization/scorm-h5p-authoring-studio.git
cd scorm-h5p-authoring-studio
npm install --frozen-lockfile
```

### Step 2: Database Schema & RLS Policy Migration
```bash
# Push schema definitions to PostgreSQL
npx prisma db push --skip-generate
npx prisma generate

# Apply production RLS policies (from docs/database/02-rls-policies.sql)
psql "$DATABASE_URL" -f docs/database/02-rls-policies.sql
```

### Step 3: Compile Production Bundles
```bash
# Compile Backend TypeScript
npm run server:build

# Typecheck and Compile Frontend SPA
npm run typecheck
npm run build
```

### Step 4: System Verification Gate
```bash
# Execute full 29-suite test verification
npm run server:test
```

### Step 5: Start Production Process (via PM2 or Systemd)
```bash
# Example using PM2 process manager
pm2 start server/dist/index.js --name "authoring-studio-api" -i max
```

---

## 4. Health Checks & Diagnostics

| Target | Endpoint | Expected Status | Purpose |
| :--- | :--- | :--- | :--- |
| **Liveness** | `GET /api/v1/health` | HTTP 200 `{ status: "ok" }` | Orchestrator container health probe |
| **Readiness** | `GET /api/v1/health/database` | HTTP 200 `{ status: "healthy", database: "connected" }` | Validates active PostgreSQL RLS connection |
| **Telemetry** | `GET /api/v1/analytics/telemetry` | HTTP 200 `{ storage: ..., exportQueue: ... }` | APM and Prometheus metrics scraping |

---

## 5. Rollback Runbook

If anomalous error rates exceed 0.5% during deployment:
1. Revert container traffic to previous image tag using Kubernetes deployment rollout or reverse proxy switch.
2. In case of database migration rollback: all schema changes are backwards-compatible (additive columns only). No destructive migrations are permitted per system guidelines.
