# Backend Architecture Specification

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/backend/01-backend-architecture.md`  
**Milestone:** Phase 03.1 — Production Backend Foundation  
**Status:** Approved & Implemented  
**Date:** November 2026  

---

## 1. Architectural Mission & Principles

The backend of the SCORM & H5P Authoring Studio provides an enterprise-grade, multi-tenant API server engineered for high reliability, strict tenant isolation, and seamless compliance with both H5P Core and SCORM 1.2 / SCORM 2004 runtime standards.

### Core Architectural Principles
1. **Modularity & Decoupling:** Every functional domain (Authentication, Organizations, Content Projects, Media Assets, H5P Engine, SCORM Packager, LMS Integrations) is structured as an autonomous module with its own controllers, routes, schemas, and services.
2. **Stateless API Design:** The Express application maintains no sticky session state. All operations are authenticated via cryptographically verified bearer credentials, making the server horizontally scalable behind load balancers.
3. **Explicit Lifecycle Management:** Server initialization, database connection pooling, request tracking, and process termination are strictly managed with structured logging and deterministic shutdown handlers.
4. **Zero-Trust Tenant Boundary:** Tenant context (`organizationId`, `workspaceId`) is never inferred from unverified client inputs (such as URL queries or JSON bodies). It is derived exclusively from verified authentication context and enforced via composite foreign keys and database Row-Level Security (RLS).
5. **Contract Parity with Frontend:** Standardized API responses mirror the frontend `ApiResponse<T>` contract from `src/services/api-client.ts`, allowing mock services to be replaced with real HTTP calls without modifying UI presentation components.

---

## 2. Technology Stack & Runtime Configuration

| Component | Technology | Version | Purpose |
|:---|:---|:---|:---|
| **Runtime Environment** | Node.js | v20.19.6 LTS | High-performance asynchronous JavaScript runtime. |
| **HTTP Framework** | Express.js | v5.3.0 | Modern web application framework with native async route handling. |
| **Language & Compiler** | TypeScript | v5.7.2 | Strict static typing across backend and shared contracts. |
| **Database Engine** | PostgreSQL | 16+ | ACID-compliant relational database with JSONB and RLS support. |
| **Database ORM** | Prisma ORM | v7.10.1 | Modern type-safe database toolkit. |
| **Driver Adapter** | `@prisma/adapter-pg` + `pg` | v7.10.1 / v8.18.0 | Native PostgreSQL connection pool adapter required by Prisma 7. |
| **Schema Validation** | Zod | v4.6.7 | Strict runtime validation of environment, headers, params, and bodies. |
| **Structured Logging** | Pino + Pino-Http | v10.4.0 / v11.0.0 | High-throughput, low-overhead JSON logging with redaction. |
| **HTTP Security** | Helmet | v8.3.0 | Automated defense-in-depth security headers (CSP, HSTS, frame-guard). |
| **CORS Policy** | cors | v2.8.6 | Configurable multi-origin whitelist and credentials support. |
| **Rate Limiter** | express-rate-limit | v8.7.5 | Brute-force and DoS prevention with standard rate-limit headers. |
| **Runtime Execution** | `tsx` | v4.21.0 | Fast, zero-config TypeScript execution for Node.js ESM. |

---

## 3. End-to-End Request Lifecycle Pipeline

Every incoming HTTP request traverses an orchestrated pipeline of security, observability, and validation middlewares before reaching domain logic:

```
[Incoming HTTP Client Request]
       │
       ▼
1. Helmet Security Middleware (Sets CSP, HSTS, X-Content-Type-Options, etc.)
       │
       ▼
2. CORS Policy Middleware (Validates origin against CORS_ORIGIN whitelist)
       │
       ▼
3. Request Correlation ID Middleware (Extracts or generates X-Request-Id via crypto.randomUUID())
       │
       ▼
4. Pino HTTP Logger (Binds req.id, starts latency timer, redacts sensitive headers)
       │
       ▼
5. Express Rate Limiter (Enforces IP rate limit window; returns standardized 429 on breach)
       │
       ▼
6. JSON & URL-Encoded Body Parsers (10MB payload cap with strict content-type enforcement)
       │
       ▼
7. Tenant Context Middleware (Strips unverified organizationId from query/body)
       │
       ▼
8. Versioned API Router (/api/v1)
       │
       ├─► /health routes (HealthController: liveness, db probe, readiness)
       │
       ├─► [Future Modules]: /auth, /organizations, /projects, /h5p, /scorm, /lms
       │
       ▼
9. Route Handler & Zod Validation (Validates req.body, req.query, req.params)
       │
       ▼
10. Database Interaction (Prisma 7 Client via @prisma/adapter-pg connection pool)
       │
       ▼
11. Standard Response Formatter (ResponseHelper: { success, data, meta: { requestId, timestamp } })
       │
       ▼
[Catch-All 404 Handler] (Triggers AppError.notFound for undefined routes)
       │
       ▼
[Centralized Error Handler] (Maps AppError / ZodError / PrismaError to clean JSON response)
```

---

## 4. Module Decoupling Strategy

The backend adopts a **screaming modular architecture**. Each domain is completely self-contained within `server/src/modules/<domain>`:

```
server/src/modules/<module-name>/
├── <module-name>.controller.ts    # HTTP request handling and response formatting
├── <module-name>.routes.ts        # Express router definitions and middleware attachments
├── <module-name>.service.ts       # Core business logic and database transactions
├── <module-name>.schema.ts        # Zod input/output validation definitions
└── <module-name>.types.ts         # Module-specific TypeScript interfaces
```

All modules register their routes through the centralized `server/src/routes/index.ts` hub under `/api/v1`. This guarantees that future business domains (such as SCORM packaging or H5P library management) can be developed and unit-tested in isolation without affecting existing routes.

---

## 5. Graceful Process Lifecycle & Error Resilience

The server runtime guarantees clean startup and deterministic shutdown:
- **Startup Diagnostic:** Upon binding to `PORT`, the server dispatches a non-blocking diagnostic query (`SELECT 1`) to PostgreSQL to verify connectivity.
- **Signal Interception:** Intercepts `SIGINT` (Ctrl+C) and `SIGTERM` (container orchestrator termination).
- **Graceful Drain:** Stops accepting new connections, allows in-flight HTTP requests up to 10 seconds to finish, terminates the PostgreSQL connection pool cleanly (`disconnectPrisma()`), and exits with code 0.
- **Unhandled Rejection Protection:** Catches `unhandledRejection` and `uncaughtException`, logs detailed diagnostic JSON with stack traces, and terminates cleanly to allow container orchestrators (Docker, Kubernetes) to restart the pod.
