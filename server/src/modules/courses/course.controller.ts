import type { Request, Response, NextFunction } from "express";
import { CourseService } from "./course.service.js";
import { ResponseHelper } from "../../utils/apiResponse.js";
import { AppError } from "../../utils/appError.js";

function getSingleParam(param: string | string[] | undefined): string | undefined {
  if (!param) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

export class CourseController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const workspaceId = typeof req.query.workspaceId === "string" ? req.query.workspaceId : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;

      const courses = await CourseService.listCourses(orgId, workspaceId, status);
      ResponseHelper.sendSuccess(res, courses, 200, "Courses retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const courseId = getSingleParam(req.params.courseId);
      if (!courseId) throw AppError.badRequest("Course ID is required");

      const course = await CourseService.getCourseById(courseId, orgId);
      ResponseHelper.sendSuccess(res, course, 200, "Course retrieved successfully");
    } catch (err) {
      next(err);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      const userId = req.user?.id;
      if (!orgId || !userId) throw AppError.unauthorized("Authentication & tenant context required");

      const course = await CourseService.createCourse(orgId, userId, req.body);
      ResponseHelper.sendSuccess(res, course, 201, "Course created successfully");
    } catch (err) {
      next(err);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const courseId = getSingleParam(req.params.courseId);
      if (!courseId) throw AppError.badRequest("Course ID is required");

      const course = await CourseService.updateCourse(courseId, orgId, req.body);
      ResponseHelper.sendSuccess(res, course, 200, "Course updated successfully");
    } catch (err) {
      next(err);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const courseId = getSingleParam(req.params.courseId);
      if (!courseId) throw AppError.badRequest("Course ID is required");

      const result = await CourseService.deleteCourse(courseId, orgId);
      ResponseHelper.sendSuccess(res, result, 200, "Course deleted successfully");
    } catch (err) {
      next(err);
    }
  }

  // Module controllers
  static async createModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const courseId = getSingleParam(req.params.courseId);
      if (!courseId) throw AppError.badRequest("Course ID is required");

      const module = await CourseService.createModule(courseId, orgId, req.body);
      ResponseHelper.sendSuccess(res, module, 201, "Course module created successfully");
    } catch (err) {
      next(err);
    }
  }

  static async updateModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const courseId = getSingleParam(req.params.courseId);
      const moduleId = getSingleParam(req.params.moduleId);
      if (!courseId || !moduleId) throw AppError.badRequest("Course and Module IDs are required");

      const module = await CourseService.updateModule(moduleId, courseId, orgId, req.body);
      ResponseHelper.sendSuccess(res, module, 200, "Course module updated successfully");
    } catch (err) {
      next(err);
    }
  }

  static async deleteModule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const courseId = getSingleParam(req.params.courseId);
      const moduleId = getSingleParam(req.params.moduleId);
      if (!courseId || !moduleId) throw AppError.badRequest("Course and Module IDs are required");

      const result = await CourseService.deleteModule(moduleId, courseId, orgId);
      ResponseHelper.sendSuccess(res, result, 200, "Course module deleted successfully");
    } catch (err) {
      next(err);
    }
  }

  // Lesson controllers
  static async createLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const courseId = getSingleParam(req.params.courseId);
      const moduleId = getSingleParam(req.params.moduleId);
      if (!courseId || !moduleId) throw AppError.badRequest("Course and Module IDs are required");

      const lesson = await CourseService.createLesson(moduleId, courseId, orgId, req.body);
      ResponseHelper.sendSuccess(res, lesson, 201, "Lesson created successfully");
    } catch (err) {
      next(err);
    }
  }

  static async updateLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const moduleId = getSingleParam(req.params.moduleId);
      const lessonId = getSingleParam(req.params.lessonId);
      if (!moduleId || !lessonId) throw AppError.badRequest("Module and Lesson IDs are required");

      const lesson = await CourseService.updateLesson(lessonId, moduleId, orgId, req.body);
      ResponseHelper.sendSuccess(res, lesson, 200, "Lesson updated successfully");
    } catch (err) {
      next(err);
    }
  }

  static async deleteLesson(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const orgId = req.tenantContext?.organizationId;
      if (!orgId) throw AppError.unauthorized("Tenant context required");

      const moduleId = getSingleParam(req.params.moduleId);
      const lessonId = getSingleParam(req.params.lessonId);
      if (!moduleId || !lessonId) throw AppError.badRequest("Module and Lesson IDs are required");

      const result = await CourseService.deleteLesson(lessonId, moduleId, orgId);
      ResponseHelper.sendSuccess(res, result, 200, "Lesson deleted successfully");
    } catch (err) {
      next(err);
    }
  }
}
