import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { ResponseHelper } from "../utils/apiResponse.js";

export const rateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  handler: (req, res) => {
    ResponseHelper.sendError(
      res,
      {
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests from this client. Please retry later.",
      },
      429
    );
  },
});
