import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(2, "Workspace name must be at least 2 characters").max(150),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens").max(150).optional(),
  description: z.string().trim().max(500).optional(),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
