import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { env } from "../config/env.js";
import type { DatabaseHealthResult } from "../types/api.types.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

// Global PrismaClient singleton for Node.js
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

/**
 * Diagnostic health check executing a real query against PostgreSQL
 */
export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const start = Date.now();
  try {
    // Real query check using Prisma raw query
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

/**
 * Graceful database disconnect handler
 */
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    await pool.end();
  } catch (err) {
    console.error("Error during Prisma Client disconnect:", err);
  }
}
