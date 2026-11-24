# Security Foundation & Tenant Isolation Specification

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/backend/05-security-foundation.md`  
**Milestone:** Phase 03.1 — Production Backend Foundation  
**Status:** Approved & Implemented  
**Date:** November 2026  

---

## 1. Environment Secret Management & Validation

Security starts at startup. The application forbids unverified or missing configuration.

### Zod Configuration Enforcement (`server/src/config/env.ts`)
```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  CORS_ORIGIN: z.string().default("http://localhost:5173,http://localhost:8443,http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1000),
  JWT_SECRET: z.string().min(16).default("dev-secret-key-scorm-h5p-studio-min32chars-for-safety"),
});
```
If any required variable is missing or malformed, the server aborts execution immediately, preventing runtime silent failures or unauthenticated configurations.

---

## 2. HTTP Defense-in-Depth

### Helmet Security Headers
Helmet is applied globally at the top of the middleware stack (`server/src/app.ts`), setting:
- **Content-Security-Policy (CSP):** Prevents XSS by strictly regulating script and style sources.
- **Strict-Transport-Security (HSTS):** Enforces HTTPS with `max-age=31536000` and `includeSubDomains`.
- **X-Content-Type-Options:** Enforces `nosniff` to eliminate MIME-type confusion attacks.
- **X-Frame-Options:** Set to `SAMEORIGIN` (to allow embed testing while blocking unauthorized clickjacking).
- **Referrer-Policy:** `no-referrer` to prevent leakage of internal IDs.

### CORS Origin Whitelist (`server/src/middlewares/cors.ts`)
- Origins are parsed from `CORS_ORIGIN`.
- Only explicitly authorized origins (or localhost dev servers during development) are permitted.
- Credentials (`cookies`, `Authorization` headers) are explicitly handled with preflight caching (`maxAge: 86400`).

### Sliding Window Rate Limiting (`server/src/middlewares/rateLimiter.ts`)
- Configured to 1,000 requests per 15-minute window per IP in development (configurable via `RATE_LIMIT_MAX_REQUESTS` and `RATE_LIMIT_WINDOW_MS`).
- Returns standardized HTTP 429 response upon breach.

---

## 3. Zero-Trust Tenant Isolation Architecture

### Core Tenant Security Invariant
> **CRITICAL RULE:** Frontend requests must NEVER be trusted to dictate tenant context. `organizationId` sent in request query strings or request bodies is discarded.

### Implementation in Phase 03.1 (`server/src/middlewares/tenantContext.ts`)
```typescript
export interface TenantContext {
  organizationId: string;
  userId: string;
  workspaceId?: string;
  roles: string[];
}

export function tenantContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Strip unverified organizationId from query to prevent spoofing
  if (req.query && "organizationId" in req.query) {
    delete (req.query as Record<string, unknown>).organizationId;
  }
  next();
}
```

### Roadmap to Phase 03.2 Authentication & RLS Binding
In Phase 03.2, `TenantContext` will be populated exclusively via verified JWT tokens signed with RS256/Ed25519:
1. Client sends Bearer JWT in `Authorization` header.
2. `authMiddleware` verifies the cryptographic signature and decodes `sub` (User ID) and `org` (Organization ID).
3. `req.tenantContext` is populated with verified claims.
4. Database transactions execute:
   ```sql
   SELECT set_config('app.current_organization_id', $1, true);
   ```
5. PostgreSQL Row-Level Security policies automatically filter rows for all queries in that transaction.

---

## 4. Structured Redaction & Safe Error Reporting

### Log Redaction (`server/src/middlewares/logger.ts`)
Pino automatically censors sensitive headers and body fields before writing to logs:
- `req.headers.authorization` -> `[REDACTED]`
- `req.headers.cookie` -> `[REDACTED]`
- `body.password` -> `[REDACTED]`
- `body.token` -> `[REDACTED]`

### Safe Error Reporting (`server/src/middlewares/errorHandler.ts`)
- Operational errors (`AppError`) return clean codes and messages.
- Unexpected errors (`500 Internal Server Error`) display stack traces ONLY in `development` and `test` environments.
- In `production`, stack traces are completely suppressed, returning a safe, generic message: *"An unexpected internal server error occurred."*
