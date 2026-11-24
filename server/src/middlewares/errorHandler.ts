import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError.js";
import { ResponseHelper } from "../utils/apiResponse.js";
import { logger } from "./logger.js";
import { env } from "../config/env.js";

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If headers already sent, delegate to Express default handler
  if (res.headersSent) {
    return;
  }

  const isAppError = err instanceof AppError;
  const isCorsError = Boolean(err.message && err.message.includes("not permitted by CORS policy"));
  const isDbConnError =
    err.name === "PrismaClientInitializationError" ||
    err.message.includes("database server") ||
    err.message.includes("ECONNREFUSED") ||
    err.message.includes("password authentication failed");

  const statusCode = isAppError ? err.statusCode : isCorsError ? 403 : isDbConnError ? 503 : 500;
  const errorCode = isAppError ? err.errorCode : isCorsError ? "CORS_FORBIDDEN" : isDbConnError ? "SERVICE_UNAVAILABLE" : "INTERNAL_SERVER_ERROR";
  const message = isAppError
    ? err.message
    : isCorsError
    ? err.message
    : isDbConnError
    ? "Database service temporarily unavailable. Please verify connection credentials."
    : env.NODE_ENV === "production"
    ? "An unexpected internal server error occurred."
    : err.message;

  const details = isAppError ? err.details : undefined;

  // Structured error logging
  logger.error(
    {
      requestId: req.id,
      url: req.originalUrl,
      method: req.method,
      statusCode,
      errorCode,
      stack: env.NODE_ENV !== "production" ? err.stack : undefined,
      details,
    },
    `Error processing request [${req.method} ${req.originalUrl}]: ${err.message}`
  );

  ResponseHelper.sendError(
    res,
    {
      code: errorCode,
      message,
      ...(details ? { details } : {}),
    },
    statusCode
  );
}
