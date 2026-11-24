import { z } from "zod";
import { validateRequest } from "../src/middlewares/validateRequest.js";
import { AppError } from "../src/utils/appError.js";
import type { Request, Response, NextFunction } from "express";

export async function runValidationTests(): Promise<{ passed: boolean; message: string }> {
  try {
    const testSchema = z.object({
      title: z.string().min(3),
      count: z.number().int().positive(),
    });

    const middleware = validateRequest({ body: testSchema });

    // Test 1: Valid body passes
    const validReq = {
      body: { title: "Course Title", count: 5 },
    } as unknown as Request;

    let nextCalled = false;
    let nextError: unknown = null;

    const nextFn: NextFunction = (err?: unknown) => {
      nextCalled = true;
      nextError = err;
    };

    await middleware(validReq, {} as Response, nextFn);

    if (!nextCalled || nextError) {
      return { passed: false, message: "Expected valid body to pass validation without error" };
    }

    // Test 2: Invalid body calls next with AppError
    const invalidReq = {
      body: { title: "A", count: -1 },
    } as unknown as Request;

    nextCalled = false;
    nextError = null;

    await middleware(invalidReq, {} as Response, nextFn);

    if (!nextCalled || !(nextError instanceof AppError)) {
      return { passed: false, message: "Expected invalid body to trigger AppError" };
    }

    if (nextError.statusCode !== 422) {
      return { passed: false, message: `Expected statusCode 422, got ${nextError.statusCode}` };
    }

    return { passed: true, message: "Request validation middleware passed (positive & negative schemas)" };
  } catch (error) {
    return { passed: false, message: error instanceof Error ? error.message : String(error) };
  }
}
