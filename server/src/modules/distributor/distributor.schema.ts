import { z } from "zod";

export const applyDistributorSchema = z.object({
  name: z.string().trim().min(2).max(200),
  contactEmail: z.string().trim().email(),
  companyWebsite: z.string().url().optional(),
  billingMode: z.enum(["REV_SHARE", "WHOLESALE_POOL", "HYBRID"]).default("REV_SHARE"),
});

export const reviewDistributorSchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "REJECTED"]),
  commissionPercent: z.number().min(0).max(80).optional(),
  wholesaleDiscountPercent: z.number().min(0).max(80).optional(),
  seatPoolTotal: z.number().int().min(0).max(100000).optional(),
});

export const provisionClientSchema = z.object({
  organizationName: z.string().trim().min(2).max(200),
  ownerEmail: z.string().trim().email(),
  ownerFirstName: z.string().trim().min(1).max(100).default("Admin"),
  ownerLastName: z.string().trim().min(1).max(100).default("User"),
  planCode: z.enum(["starter", "pro", "business", "enterprise"]).default("pro"),
  seatCount: z.number().int().min(1).max(10000).default(10),
  durationDays: z.number().int().min(1).max(3650).default(365),
});

export const updateClientStatusSchema = z.object({
  isActive: z.boolean(),
  reason: z.string().max(255).optional(),
});

export const generatePartnerLicensesSchema = z.object({
  planCode: z.enum(["starter", "pro", "business", "enterprise"]),
  count: z.number().int().min(1).max(100).default(1),
  seatCount: z.number().int().min(1).max(10000).default(10),
  durationDays: z.number().int().min(1).max(3650).default(365),
  notes: z.string().max(255).optional(),
});

export const requestPayoutSchema = z.object({
  amountCents: z.number().int().min(1000, "Minimum payout request is $10.00 (1000 cents)"),
  referenceNote: z.string().max(255).optional(),
});

export type ApplyDistributorInput = z.infer<typeof applyDistributorSchema>;
export type ReviewDistributorInput = z.infer<typeof reviewDistributorSchema>;
export type ProvisionClientInput = z.infer<typeof provisionClientSchema>;
export type UpdateClientStatusInput = z.infer<typeof updateClientStatusSchema>;
export type GeneratePartnerLicensesInput = z.infer<typeof generatePartnerLicensesSchema>;
export type RequestPayoutInput = z.infer<typeof requestPayoutSchema>;
