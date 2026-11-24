import { Router } from "express";
import { CourseController } from "./course.controller.js";
import { requireAuth } from "../../middlewares/auth.js";
import { resolveTenantContext } from "../../middlewares/tenantContext.js";
import { requirePermission } from "../../middlewares/rbac.js";
import { validateRequest } from "../../middlewares/validateRequest.js";
import {
  createCourseSchema,
  updateCourseSchema,
  createModuleSchema,
  updateModuleSchema,
  createLessonSchema,
  updateLessonSchema,
} from "./course.schema.js";

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.use(resolveTenantContext);

// Course level routes
router.get("/", requirePermission("content:view"), CourseController.list);
router.post(
  "/",
  requirePermission("content:create"),
  validateRequest({ body: createCourseSchema }),
  CourseController.create
);
router.get("/:courseId", requirePermission("content:view"), CourseController.getById);
router.patch(
  "/:courseId",
  requirePermission("content:edit"),
  validateRequest({ body: updateCourseSchema }),
  CourseController.update
);
router.delete("/:courseId", requirePermission("content:delete"), CourseController.delete);

// Module level routes
router.post(
  "/:courseId/modules",
  requirePermission("content:edit"),
  validateRequest({ body: createModuleSchema }),
  CourseController.createModule
);
router.patch(
  "/:courseId/modules/:moduleId",
  requirePermission("content:edit"),
  validateRequest({ body: updateModuleSchema }),
  CourseController.updateModule
);
router.delete("/:courseId/modules/:moduleId", requirePermission("content:edit"), CourseController.deleteModule);

// Lesson level routes
router.post(
  "/:courseId/modules/:moduleId/lessons",
  requirePermission("content:edit"),
  validateRequest({ body: createLessonSchema }),
  CourseController.createLesson
);
router.patch(
  "/:courseId/modules/:moduleId/lessons/:lessonId",
  requirePermission("content:edit"),
  validateRequest({ body: updateLessonSchema }),
  CourseController.updateLesson
);
router.delete(
  "/:courseId/modules/:moduleId/lessons/:lessonId",
  requirePermission("content:edit"),
  CourseController.deleteLesson
);

export const courseRoutes = router;
