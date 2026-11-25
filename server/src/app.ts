import express, { type Express } from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { requestIdMiddleware } from "./middlewares/requestId.js";
import { httpLogger } from "./middlewares/logger.js";
import { corsMiddleware } from "./middlewares/cors.js";
import { rateLimiter } from "./middlewares/rateLimiter.js";
import { authenticate } from "./middlewares/auth.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { rootRouter } from "./routes/index.js";
import { AppError } from "./utils/appError.js";

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS policy
  app.use(corsMiddleware);

  // Request correlation ID & timing
  app.use(requestIdMiddleware);

  // Structured HTTP access logging
  app.use(httpLogger);

  // Global rate limiter
  app.use(rateLimiter);

  // Body parsers & cookie parsing (preserve rawBody for Stripe webhook signature verification)
  app.use(
    express.json({
      limit: "10mb",
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(cookieParser());

  // Extract authenticated user credentials if present
  app.use(authenticate);

  // Mount versioned API routes
  app.use("/api/v1", rootRouter);

  // Catch-all 404 handler for unknown routes
  app.use((req, _res, next) => {
    next(AppError.notFound(`Route ${req.method} ${req.originalUrl}`));
  });

  // Centralized error handling
  app.use(errorHandler);

  return app;
}
