import { z } from "zod";

export const H5PEmbedTypeEnum = z.enum(["DIV", "IFRAME"]);
export const H5PDependencyTypeEnum = z.enum(["PRELOADED", "DYNAMIC", "EDITOR"]);

export const registerLibrarySchema = z.object({
  machineName: z
    .string()
    .min(3, "Machine name must be at least 3 characters")
    .max(127)
    .regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/, "Invalid machine name format (e.g. H5P.InteractiveVideo)"),
  title: z.string().min(2).max(255),
  majorVersion: z.number().int().min(1),
  minorVersion: z.number().int().min(0),
  patchVersion: z.number().int().min(0).default(0),
  runnable: z.boolean().default(true),
  fullscreen: z.boolean().default(false),
  coreApiVersionMajor: z.number().int().default(1),
  coreApiVersionMinor: z.number().int().default(24),
  preloadedJs: z.array(z.string().or(z.object({ path: z.string() }))).default([]),
  preloadedCss: z.array(z.string().or(z.object({ path: z.string() }))).default([]),
  semantics: z.array(z.record(z.string(), z.unknown())).optional(),
  language: z.record(z.string(), z.unknown()).optional(),
  tutorialUrl: z.string().url().max(512).optional(),
  exampleUrl: z.string().url().max(512).optional(),
  dependencies: z
    .array(
      z.object({
        machineName: z.string(),
        majorVersion: z.number().int(),
        minorVersion: z.number().int(),
        dependencyType: H5PDependencyTypeEnum.default("PRELOADED"),
      })
    )
    .default([]),
});

export const saveH5PContentSchema = z.object({
  libraryId: z.string().uuid("Invalid library ID"),
  parameters: z.record(z.string(), z.unknown()),
  metadata: z
    .object({
      title: z.string().optional(),
      authors: z.array(z.string()).optional(),
      license: z.string().optional(),
      defaultLanguage: z.string().optional(),
    })
    .default({}),
  embedType: H5PEmbedTypeEnum.default("DIV"),
});

export const validateParametersSchema = z.object({
  libraryId: z.string().uuid(),
  parameters: z.record(z.string(), z.unknown()),
});

export const createPackageImportSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  filename: z
    .string()
    .min(1)
    .max(255)
    .refine((fn) => fn.endsWith(".h5p") || fn.endsWith(".zip"), "File must have .h5p or .zip extension"),
  fileSizeBytes: z.number().int().positive(),
});

export type RegisterLibraryInput = z.infer<typeof registerLibrarySchema>;
export type SaveH5PContentInput = z.infer<typeof saveH5PContentSchema>;
export type ValidateParametersInput = z.infer<typeof validateParametersSchema>;
export type CreatePackageImportInput = z.infer<typeof createPackageImportSchema>;
