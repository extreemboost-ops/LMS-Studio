import { pino } from "pino";
import { pinoHttp } from "pino-http";
import type { Request, Response } from "express";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "body.password",
      "body.token",
      "body.refreshToken",
      "body.newPassword",
      "details[*].password",
    ],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req: Request) => req.id || "unknown",
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req: Request, res: Response) => {
    return `${req.method} ${req.url} -> ${res.statusCode} (${req.id})`;
  },
  customErrorMessage: (req: Request, res: Response, err: Error) => {
    return `${req.method} ${req.url} FAILED -> ${res.statusCode}: ${err.message} (${req.id})`;
  },
});
