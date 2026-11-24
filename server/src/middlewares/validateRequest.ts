import type { Request, Response, NextFunction } from "express";
import { type ZodSchema, ZodError } from "zod";
import { AppError } from "../utils/appError.js";

interface ValidationSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validateRequest(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as typeof req.query;
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as typeof req.params;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        }));
        next(AppError.unprocessable("Request input validation failed", details));
      } else {
        next(err);
      }
    }
  };
}
