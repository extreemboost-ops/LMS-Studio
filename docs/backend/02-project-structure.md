# Backend Project Structure & Directory Organization

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/backend/02-project-structure.md`  
**Milestone:** Phase 03.1 — Production Backend Foundation  
**Status:** Approved & Implemented  
**Date:** November 2026  

---

## 1. Directory Tree Layout

The backend foundation is placed cleanly under the dedicated `server/` root directory, coexisting harmoniously with the existing React frontend:

```
server/
├── tsconfig.json                       # Dedicated NodeNext TypeScript configuration
│
├── src/
│   ├── app.ts                          # Express application factory with middleware stack
│   ├── server.ts                       # HTTP server bootstrap and graceful shutdown handler
│   │
│   ├── config/
│   │   └── env.ts                      # Zod-validated environment configuration
│   │
│   ├── database/
│   │   └── prisma.ts                   # Prisma 7 client with @prisma/adapter-pg connection pool
│   │
│   ├── middlewares/
│   │   ├── cors.ts                     # CORS origin validation middleware
│   │   ├── errorHandler.ts             # Centralized exception and error handling middleware
│   │   ├── logger.ts                   # Pino structured request and application logger
│   │   ├── rateLimiter.ts              # IP-based sliding window rate limiter
│   │   ├── requestId.ts                # UUID request correlation ID middleware
│   │   ├── tenantContext.ts            # Tenant context contract and spoofing prevention
│   │   └── validateRequest.ts          # Zod schema validation middleware (body, query, params)
│   │
│   ├── modules/
│   │   └── health/                     # Health, database diagnostic, and readiness module
│   │       ├── health.controller.ts    # Health endpoints logic and resource reporting
│   │       └── health.routes.ts        # Health route definitions (/health, /health/database, /health/readiness)
│   │
│   ├── routes/
│   │   └── index.ts                    # Centralized /api/v1 API router hub
│   │
│   ├── types/
│   │   ├── api.types.ts                # Common API response and diagnostic types
│   │   └── express.d.ts                # Express Request extensions (req.id, req.startTime, req.tenantContext)
│   │
│   └── utils/
│       ├── apiResponse.ts              # Standardized API response helper (sendSuccess, sendError)
│       └── appError.ts                 # Operational application error class (AppError)
│
└── tests/
    ├── config.test.ts                  # Environment validation unit tests
    ├── health.test.ts                  # Supertest integration tests for health endpoints & routes
    ├── validation.test.ts              # Zod request validation middleware unit tests
    └── run-tests.ts                    # Automated backend test runner script
```

---

## 2. Directory Responsibilities & Boundary Rules

### `server/src/config/`
- **Ownership:** Environment parsing and type coercion.
- **Rule:** No module may access `process.env` directly; all configuration must be imported from `config/env.js`.
- **Validation:** Missing or malformed configuration aborts server startup immediately with human-readable error messages.

### `server/src/database/`
- **Ownership:** Prisma Client lifecycle and connection pooling.
- **Rule:** Uses `@prisma/adapter-pg` and PostgreSQL connection pool. Exports `prisma`, `checkDatabaseHealth()`, and `disconnectPrisma()`.
- **Isolation:** Never executes raw DDL migrations directly in application code.

### `server/src/middlewares/`
- **Ownership:** Cross-cutting HTTP pipeline concerns.
- **Order of Execution:** Helmet -> CORS -> RequestId -> Logger -> RateLimiter -> BodyParsers -> TenantContext -> Routes -> 404 -> ErrorHandler.

### `server/src/modules/`
- **Ownership:** Domain-specific business logic.
- **Phase 03.1:** Implements the `health` module.
- **Subsequent Milestones:** Reserved for `auth`, `organizations`, `projects`, `h5p`, `scorm`, `media`, and `lms`.
- **Decoupling Rule:** Modules communicate via exported services or typed interfaces, never by reaching into another module's internal route definitions.

### `server/src/routes/`
- **Ownership:** Versioned API route aggregation (`/api/v1`).
- **Convention:** All routes mounted under `/api/v1`. Any future `/api/v2` can be cleanly mounted alongside.

### `server/src/utils/`
- **Ownership:** Pure, reusable utility functions and classes.
- **`appError.ts`:** `AppError` class containing `statusCode`, `errorCode`, `details`, and `isOperational`.
- **`apiResponse.ts`:** `ResponseHelper` providing standard JSON envelopes.

### `server/src/types/`
- **Ownership:** Shared backend TypeScript definitions and declaration merging.
- **`express.d.ts`:** Augments `Express.Request` to include `id`, `startTime`, and `tenantContext`.

---

## 3. Toolchain & Build Configuration

### Server TypeScript Configuration (`server/tsconfig.json`)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "../dist-server",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist-server", "tests"]
}
```

### Script Execution in `package.json`
| Command | Action | Description |
|:---|:---|:---|
| `npm run server:dev` | `tsx server/src/server.ts` | Runs backend in development mode with live TypeScript compilation. |
| `npm run server:build` | `tsc --project server/tsconfig.json` | Type-checks and compiles server code to `dist-server/`. |
| `npm run server:test` | `tsx server/tests/run-tests.ts` | Executes the automated test suite. |
| `npm run db:generate` | `prisma generate` | Generates type-safe Prisma client. |
| `npm run db:validate` | `prisma validate` | Validates `prisma/schema.prisma` syntax. |
| `npm run typecheck` | `tsc --noEmit` | Validates frontend TypeScript code. |
| `npm run build` | `vite build` | Compiles production frontend bundle. |
