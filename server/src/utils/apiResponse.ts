import type { Response, Request } from "express";
import type { StandardApiResponse, StandardError, StandardMeta } from "../types/api.types.js";

export class ResponseHelper {
  private static createMeta(req: Request): StandardMeta {
    const durationMs = req.startTime ? Date.now() - req.startTime : undefined;
    const reqId =
      typeof req.id === "string"
        ? req.id
        : typeof req.id === "number"
        ? String(req.id)
        : "unknown-request-id";

    return {
      requestId: reqId,
      timestamp: new Date().toISOString(),
      ...(durationMs !== undefined ? { durationMs } : {}),
    };
  }

  static sendSuccess<T>(
    res: Response,
    data: T,
    statusCode = 200,
    message?: string
  ): Response<StandardApiResponse<T>> {
    const req = res.req as Request;
    const meta = this.createMeta(req);

    const body: StandardApiResponse<T> = {
      success: true,
      data,
      ...(message ? { message } : {}),
      meta,
    };

    return res.status(statusCode).json(body);
  }

  static sendError(
    res: Response,
    error: StandardError,
    statusCode = 500
  ): Response<StandardApiResponse<null>> {
    const req = res.req as Request;
    const meta = this.createMeta(req);

    const body: StandardApiResponse<null> = {
      success: false,
      error,
      meta,
    };

    return res.status(statusCode).json(body);
  }
}
