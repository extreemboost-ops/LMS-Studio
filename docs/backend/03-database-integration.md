# Database Integration & Prisma 7 Driver Adapter Specification

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/backend/03-database-integration.md`  
**Milestone:** Phase 03.1 — Production Backend Foundation  
**Status:** Approved & Implemented  
**Date:** November 2026  

---

## 1. Prisma ORM 7 Architecture & Driver Adapter Pattern

In Prisma ORM v7, native database connectivity requires an explicit database driver adapter. Rather than embedding binary query engines with proprietary socket drivers, Prisma 7 delegates connection pooling and network socket management to native JavaScript/TypeScript drivers.

### Technology Architecture
- **ORM:** Prisma Client v7.10.1 (`@prisma/client`)
- **Driver Adapter:** `@prisma/adapter-pg` v7.10.1
- **Underlying Driver:** `pg` (node-postgres) v8.18.0 with `pg.Pool`
- **Target Database:** PostgreSQL 16+

### Initialization Implementation (`server/src/database/prisma.ts`)
```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "../config/env.js";

const { Pool } = pg;

// Establish PostgreSQL connection pool with connection quotas and timeouts
const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Wrap connection pool into Prisma 7 driver adapter
const adapter = new PrismaPg(pool);

// Global PrismaClient singleton to prevent socket exhaustion during hot reload
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

---

## 2. Real Database Diagnostic Health Check

A key directive of Phase 03.1 is that health endpoints must report **actual connection health**, never hardcoded success.

### Health Check Function (`checkDatabaseHealth`)
```typescript
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const start = Date.now();
  try {
    // Executes a real SQL diagnostic query against the PostgreSQL engine
    await prisma.$queryRawUnsafe("SELECT 1 as connected, NOW() as current_time");
    const latencyMs = Date.now() - start;

    return {
      status: "UP",
      latencyMs,
      database: "PostgreSQL 16+",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const latencyMs = Date.now() - start;
    const errorMessage = error instanceof Error ? error.message : "Unknown database connection error";

    return {
      status: "DOWN",
      latencyMs,
      database: "PostgreSQL 16+",
      timestamp: new Date().toISOString(),
      error: errorMessage,
    };
  }
}
```

### Diagnostic Output Examples

#### Successful Connection (Status: UP)
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "latencyMs": 4,
    "database": "PostgreSQL 16+",
    "timestamp": "2026-11-20T16:16:23.000Z"
  },
  "message": "Database connection active and responsive",
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2026-11-20T16:16:23.004Z",
    "durationMs": 4
  }
}
```

#### Unreachable / Credential Failure (Status: DOWN — HTTP 503)
```json
{
  "success": true,
  "data": {
    "status": "DOWN",
    "latencyMs": 15,
    "database": "PostgreSQL 16+",
    "timestamp": "2026-11-20T16:16:24.000Z",
    "error": "password authentication failed for user \"postgres\""
  },
  "message": "Database connection failed or unreachable",
  "meta": {
    "requestId": "f81d4fae-7dec-11d0-a765-00a0c91e6bf6",
    "timestamp": "2026-11-20T16:16:24.015Z",
    "durationMs": 15
  }
}
```

---

## 3. Graceful Disconnection Handling

To prevent orphaned sockets or unclean connection pool termination, `disconnectPrisma()` drains the pool and disconnects the Prisma client:

```typescript
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    await pool.end();
  } catch (err) {
    console.error("Error during Prisma Client disconnect:", err);
  }
}
```

This handler is registered with the Node.js `SIGINT` and `SIGTERM` listeners in `server.ts`.

---

## 4. Database Migration & Schema Workflow

The schema at `prisma/schema.prisma` is the single source of truth for the database architecture.

### Safe Workflow Commands
- **Validate Schema Syntax:**
  ```powershell
  npm run db:validate
  # Under the hood: node ./node_modules/prisma/build/index.js validate
  ```
- **Generate Type-Safe Client:**
  ```powershell
  npm run db:generate
  # Under the hood: node ./node_modules/prisma/build/index.js generate
  ```
- **Create Development Migration (When Live Database is Active in Phase 03.2):**
  ```powershell
  npx prisma migrate dev --name init_schema
  ```
- **Apply Staging / Production Migrations:**
  ```powershell
  npx prisma migrate deploy
  ```

### Strict Restrictions Maintained
1. No migrations were executed against production environments.
2. No destructive database commands (`migrate reset`, `db push --force-reset`) were run.
3. All 45 models, 15 enums, and composite constraints from Phase 02.2 remain completely intact.
