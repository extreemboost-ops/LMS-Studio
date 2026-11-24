import { z } from "zod";

export const CourseStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const createCourseSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  title: z.string().min(2, "Title must be at least 2 characters").max(255),
  code: z.string().min(1, "Course code is required").max(50),
  description: z.string().max(2000).optional(),
  coverImage: z.string().url().max(512).optional(),
  coverColorIndex: z.number().int().min(0).max(10).default(0),
  status: CourseStatusEnum.default("DRAFT"),
});

export const updateCourseSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  code: z.string().min(1).max(50).optional(),
  description: z.string().max(2000).optional(),
  coverImage: z.string().url().max(512).nullable().optional(),
  coverColorIndex: z.number().int().min(0).max(10).optional(),
  status: CourseStatusEnum.optional(),
});

export const createModuleSchema = z.object({
  title: z.string().min(2, "Module title must be at least 2 characters").max(255),
  description: z.string().max(1000).optional(),
  orderIndex: z.number().int().min(0).default(0),
});

export const updateModuleSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
});

export const createLessonSchema = z.object({
  title: z.string().min(2, "Lesson title must be at least 2 characters").max(255),
  description: z.string().max(1000).optional(),
  orderIndex: z.number().int().min(0).default(0),
  contentType: z.string().min(1).max(50).default("interactive"),
  contentProjectId: z.string().uuid("Invalid content project ID").optional(),
});

export const updateLessonSchema = z.object({
  title: z.string().min(2).max(255).optional(),
  description: z.string().max(1000).nullable().optional(),
  orderIndex: z.number().int().min(0).optional(),
  contentType: z.string().min(1).max(50).optional(),
  contentProjectId: z.string().uuid().nullable().optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CreateModuleInput = z.infer<typeof createModuleSchema>;
export type UpdateModuleInput = z.infer<typeof updateModuleSchema>;
export type CreateLessonInput = z.infer<typeof createLessonSchema>;
export type UpdateLessonInput = z.infer<typeof updateLessonSchema>;
