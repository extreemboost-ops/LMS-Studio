import { z } from "zod";

export const createOrganizationSchema = z.object({
  name: z.string().trim().min(2, "Organization name must be at least 2 characters").max(255),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").max(100).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
