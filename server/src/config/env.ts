import { z } from "zod";
import dotenv from "dotenv";
import path from "node:path";

// Load .env from workspace root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgresql://postgres:postgres@localhost:5432/scorm_h5p_studio?schema=public"),
  DIRECT_URL: z.string().optional(),
  CORS_ORIGIN: z
    .string()
    .default("http://localhost:5173,http://localhost:8443,http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(1000),
  JWT_SECRET: z.string().min(16).default("dev-secret-key-scorm-h5p-studio-min32chars-for-safety"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_ISSUER: z.string().default("scorm-h5p-studio"),
  JWT_AUDIENCE: z.string().default("scorm-h5p-studio-api"),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  COOKIE_SECURE: z.coerce.boolean().default(false),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("noreply@scorm-h5p-studio.local"),
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(rawEnv: Record<string, unknown> = process.env): Env {
  const parsed = envSchema.safeParse(rawEnv);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${issues}`);
  }
  return parsed.data;
}

export const env: Env = parseEnv();
