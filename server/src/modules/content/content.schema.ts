import { z } from "zod";

export const ProjectContentTypeEnum = z.enum([
  "PRESENTATION",
  "INTERACTIVE_VIDEO",
  "INTERACTIVE_BOOK",
  "QUESTION_SET",
  "MULTI_CHOICE",
  "DRAG_DROP",
  "FILL_BLANKS",
  "TRUE_FALSE",
  "FLASHCARDS",
  "IMAGE_HOTSPOTS",
]);

export const ProjectStatusEnum = z.enum(["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"]);

export const ElementTypeEnum = z.enum([
  "CHAPTER",
  "SLIDE",
  "QUESTION",
  "HOTSPOT",
  "MEDIA",
  "INTERACTION",
]);

export const createProjectSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  title: z.string().min(2, "Title must be at least 2 characters").max(255),
  description: z.string().max(2000).optional(),
  contentType: ProjectContentTypeEnum.default("PRESENTATION"),
  themeVariant: z.string().max(50).default("safety"),
  thumbnailUrl: z.string().url().max(512).optional(),
});

export const updateProjectSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: ProjectStatusEnum.optional(),
  themeVariant: z.string().max(50).optional(),
  thumbnailUrl: z.string().url().max(512).nullable().optional(),
});

export const saveDocumentSchema = z.object({
  metadata: z.record(z.string(), z.unknown()).default({}),
  settings: z.record(z.string(), z.unknown()).default({}),
  isPublished: z.boolean().optional(),
});

export const createElementSchema = z.object({
  documentId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  elementType: ElementTypeEnum,
  name: z.string().min(1, "Element name is required").max(255),
  orderIndex: z.number().int().min(0).default(0),
  config: z.record(z.string(), z.unknown()).default({}),
});

export const updateElementSchema = z.object({
  parentId: z.string().uuid().nullable().optional(),
  name: z.string().min(1).max(255).optional(),
  orderIndex: z.number().int().min(0).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const reorderElementsSchema = z.object({
  elements: z.array(
    z.object({
      id: z.string().uuid(),
      orderIndex: z.number().int().min(0),
      parentId: z.string().uuid().nullable().optional(),
    })
  ).min(1),
});

export const createVersionSnapshotSchema = z.object({
  title: z.string().min(2, "Version title is required").max(255),
  description: z.string().max(2000).optional(),
  h5pLibraryId: z.string().uuid().optional(),
});

export const createRevisionSchema = z.object({
  diffPayload: z.record(z.string(), z.unknown()),
  changeSummary: z.string().max(500).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type SaveDocumentInput = z.infer<typeof saveDocumentSchema>;
export type CreateElementInput = z.infer<typeof createElementSchema>;
export type UpdateElementInput = z.infer<typeof updateElementSchema>;
export type ReorderElementsInput = z.infer<typeof reorderElementsSchema>;
export type CreateVersionSnapshotInput = z.infer<typeof createVersionSnapshotSchema>;
export type CreateRevisionInput = z.infer<typeof createRevisionSchema>;
