import cors from "cors";
import { env } from "../config/env.js";

const allowedOrigins = env.CORS_ORIGIN.split(",").map((origin) => origin.trim());

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. Postman, server-to-server, curl) or matched origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error(`Origin '${origin}' not permitted by CORS policy`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Request-Id",
    "X-Organization-Id",
    "X-Workspace-Id",
  ],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 86400, // 24 hours
});
