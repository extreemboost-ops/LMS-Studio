import type { Server } from "node:http";
import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./middlewares/logger.js";
import { checkDatabaseHealth, disconnectPrisma } from "./database/prisma.js";

let server: Server | null = null;

async function bootstrap(): Promise<void> {
  if (env.NODE_ENV === "production") {
    try {
      const { execSync } = await import("node:child_process");
      logger.info("Synchronizing Prisma schema with PostgreSQL database...");
      execSync("node ./node_modules/prisma/build/index.js db push --accept-data-loss", {
        stdio: "inherit",
      });
    } catch (err) {
      logger.warn({ err }, "Automatic prisma db push skipped or failed");
    }
  }

  const app = createApp();

  server = app.listen(env.PORT, env.HOST, () => {
    logger.info(
      {
        port: env.PORT,
        host: env.HOST,
        env: env.NODE_ENV,
        pid: process.pid,
      },
      `🚀 SCORM & H5P Studio Backend API running at http://${env.HOST}:${env.PORT}/api/v1`
    );
  });

  // Perform initial database connection verification
  const dbHealth = await checkDatabaseHealth();
  if (dbHealth.status === "UP") {
    logger.info(
      { latencyMs: dbHealth.latencyMs, database: dbHealth.database },
      "✅ PostgreSQL database connected successfully"
    );
  } else {
    logger.warn(
      { error: dbHealth.error, database: dbHealth.database },
      "⚠️ PostgreSQL database is currently unreachable. Health endpoint will report status DOWN until connected."
    );
  }

  // Graceful shutdown handling
  const handleShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);

    if (server) {
      server.close(async () => {
        logger.info("HTTP server closed.");
        await disconnectPrisma();
        logger.info("Database disconnected. Process exiting cleanly.");
        process.exit(0);
      });

      // Force shutdown if connections do not drain within 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout.");
        process.exit(1);
      }, 10000).unref();
    } else {
      await disconnectPrisma();
      process.exit(0);
    }
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));

  process.on("unhandledRejection", (reason) => {
    logger.error({ reason }, "Unhandled Promise Rejection detected");
  });

  process.on("uncaughtException", (error) => {
    logger.fatal({ error }, "Uncaught Exception thrown. Shutting down.");
    process.exit(1);
  });
}

// Start server
bootstrap().catch((error) => {
  logger.fatal({ error }, "Bootstrap failed. Application terminated.");
  process.exit(1);
});
