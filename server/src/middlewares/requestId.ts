import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Respect existing upstream request ID or generate a cryptographically strong UUID v4
  const existingId = req.headers["x-request-id"];
  const id = (typeof existingId === "string" && existingId.trim().length > 0)
    ? existingId
    : randomUUID();

  req.id = id;
  req.startTime = Date.now();
  res.setHeader("X-Request-Id", id);

  next();
}
