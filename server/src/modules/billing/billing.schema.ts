import { z } from "zod";

export const createCheckoutSchema = z.object({
  planCode: z.enum(["starter", "pro", "business", "enterprise"]),
  billingCycle: z.enum(["MONTHLY", "ANNUAL"]).default("MONTHLY"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const generateLicenseKeysSchema = z.object({
  planCode: z.enum(["starter", "pro", "business", "enterprise"]),
  count: z.number().int().min(1).max(100).default(1),
  seatCount: z.number().int().min(1).max(10000).default(10),
  durationDays: z.number().int().min(1).max(3650).default(365),
  expiresAt: z.string().datetime().optional(),
  notes: z.string().max(255).optional(),
});

export const redeemLicenseKeySchema = z.object({
  code: z
    .string()
    .trim()
    .min(10, "License key is too short")
    .max(64, "License key is too long"),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type GenerateLicenseKeysInput = z.infer<typeof generateLicenseKeysSchema>;
export type RedeemLicenseKeyInput = z.infer<typeof redeemLicenseKeySchema>;
