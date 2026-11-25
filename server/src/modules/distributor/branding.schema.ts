import { z } from "zod";

const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

export const updateBrandingSchema = z.object({
  appName: z.string().trim().min(2).max(60).optional(),
  appSubtitle: z.string().trim().min(1).max(30).optional(),
  primaryColor: z
    .string()
    .regex(hexColorRegex, "primaryColor must be a 6-digit hex color (e.g. #2563EB)")
    .optional(),
  logoUrl: z.string().url().max(512).nullable().optional(),
  faviconUrl: z.string().url().max(512).nullable().optional(),
  supportEmail: z.string().email().max(255).optional(),
  hidePoweredBy: z.boolean().optional(),
  customDomain: z
    .string()
    .trim()
    .max(253)
    .nullable()
    .optional(),
});

export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;
