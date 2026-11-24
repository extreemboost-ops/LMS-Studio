import { prisma } from "../../database/prisma.js";
import { AppError } from "../../utils/appError.js";
import type {
  CreateCourseInput,
  UpdateCourseInput,
  CreateModuleInput,
  UpdateModuleInput,
  CreateLessonInput,
  UpdateLessonInput,
} from "./course.schema.js";

export class CourseService {
  /**
   * Lists all courses within an organization, optionally filtered by workspace
   */
  static async listCourses(organizationId: string, workspaceId?: string, status?: string) {
    const whereClause: Record<string, unknown> = { organizationId };

    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }
    if (status) {
      whereClause.status = status;
    }

    const courses = await prisma.course.findMany({
      where: whereClause,
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        _count: {
          select: {
            modules: true,
            enrollments: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return courses.map((c) => ({
      id: c.id,
      title: c.title,
      code: c.code,
      description: c.description,
      coverImage: c.coverImage,
      coverColorIndex: c.coverColorIndex,
      status: c.status,
      version: c.version,
      workspace: c.workspace,
      createdBy: c.createdBy,
      modulesCount: c._count.modules,
      enrollmentsCount: c._count.enrollments,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Retrieves a course by ID with its nested modules and lessons
   */
  static async getCourseById(courseId: string, organizationId: string) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, organizationId },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        modules: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
              include: {
                contentProject: {
                  select: { id: true, title: true, contentType: true, status: true },
                },
              },
            },
          },
        },
      },
    });

    if (!course) {
      throw AppError.notFound("Course");
    }

    return course;
  }

  /**
   * Creates a new course in a verified workspace
   */
  static async createCourse(organizationId: string, userId: string, input: CreateCourseInput) {
    // 1. Verify workspace belongs to organization
    const workspace = await prisma.workspace.findFirst({
      where: { id: input.workspaceId, organizationId },
    });

    if (!workspace) {
      throw AppError.notFound("Workspace");
    }

    // 2. Create course record
    const course = await prisma.course.create({
      data: {
        organizationId,
        workspaceId: input.workspaceId,
        createdById: userId,
        title: input.title,
        code: input.code,
        description: input.description,
        coverImage: input.coverImage,
        coverColorIndex: input.coverColorIndex,
        status: input.status,
      },
      include: {
        workspace: { select: { id: true, name: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    return course;
  }

  /**
   * Updates an existing course
   */
  static async updateCourse(courseId: string, organizationId: string, input: UpdateCourseInput) {
    const existing = await prisma.course.findFirst({
      where: { id: courseId, organizationId },
    });

    if (!existing) {
      throw AppError.notFound("Course");
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.code !== undefined ? { code: input.code } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}),
        ...(input.coverColorIndex !== undefined ? { coverColorIndex: input.coverColorIndex } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });

    return updated;
  }

  /**
   * Deletes a course
   */
  static async deleteCourse(courseId: string, organizationId: string) {
    const existing = await prisma.course.findFirst({
      where: { id: courseId, organizationId },
    });

    if (!existing) {
      throw AppError.notFound("Course");
    }

    await prisma.course.delete({
      where: { id: courseId },
    });

    return { id: courseId, deleted: true };
  }

  /**
   * Module Management: Creates a module within a course
   */
  static async createModule(courseId: string, organizationId: string, input: CreateModuleInput) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, organizationId },
    });

    if (!course) {
      throw AppError.notFound("Course");
    }

    const module = await prisma.courseModule.create({
      data: {
        courseId,
        title: input.title,
        description: input.description,
        orderIndex: input.orderIndex,
      },
    });

    return module;
  }

  /**
   * Updates a module
   */
  static async updateModule(
    moduleId: string,
    courseId: string,
    organizationId: string,
    input: UpdateModuleInput
  ) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, organizationId },
    });

    if (!course) {
      throw AppError.notFound("Course");
    }

    const existingModule = await prisma.courseModule.findFirst({
      where: { id: moduleId, courseId },
    });

    if (!existingModule) {
      throw AppError.notFound("CourseModule");
    }

    const updated = await prisma.courseModule.update({
      where: { id: moduleId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
      },
    });

    return updated;
  }

  /**
   * Deletes a module
   */
  static async deleteModule(moduleId: string, courseId: string, organizationId: string) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, organizationId },
    });

    if (!course) {
      throw AppError.notFound("Course");
    }

    const existingModule = await prisma.courseModule.findFirst({
      where: { id: moduleId, courseId },
    });

    if (!existingModule) {
      throw AppError.notFound("CourseModule");
    }

    await prisma.courseModule.delete({
      where: { id: moduleId },
    });

    return { id: moduleId, deleted: true };
  }

  /**
   * Lesson Management: Creates a lesson within a module
   */
  static async createLesson(
    moduleId: string,
    courseId: string,
    organizationId: string,
    input: CreateLessonInput
  ) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, organizationId },
    });

    if (!course) {
      throw AppError.notFound("Course");
    }

    const module = await prisma.courseModule.findFirst({
      where: { id: moduleId, courseId },
    });

    if (!module) {
      throw AppError.notFound("CourseModule");
    }

    // Optional verification of contentProject
    if (input.contentProjectId) {
      const project = await prisma.contentProject.findFirst({
        where: { id: input.contentProjectId, organizationId },
      });
      if (!project) {
        throw AppError.notFound("ContentProject");
      }
    }

    const lesson = await prisma.lesson.create({
      data: {
        moduleId,
        contentProjectId: input.contentProjectId,
        title: input.title,
        description: input.description,
        orderIndex: input.orderIndex,
        contentType: input.contentType,
      },
    });

    return lesson;
  }

  /**
   * Updates a lesson
   */
  static async updateLesson(
    lessonId: string,
    moduleId: string,
    organizationId: string,
    input: UpdateLessonInput
  ) {
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        moduleId,
        module: {
          course: {
            organizationId,
          },
        },
      },
    });

    if (!lesson) {
      throw AppError.notFound("Lesson");
    }

    if (input.contentProjectId) {
      const project = await prisma.contentProject.findFirst({
        where: { id: input.contentProjectId, organizationId },
      });
      if (!project) {
        throw AppError.notFound("ContentProject");
      }
    }

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.orderIndex !== undefined ? { orderIndex: input.orderIndex } : {}),
        ...(input.contentType !== undefined ? { contentType: input.contentType } : {}),
        ...(input.contentProjectId !== undefined ? { contentProjectId: input.contentProjectId } : {}),
      },
    });

    return updated;
  }

  /**
   * Deletes a lesson
   */
  static async deleteLesson(lessonId: string, moduleId: string, organizationId: string) {
    const lesson = await prisma.lesson.findFirst({
      where: {
        id: lessonId,
        moduleId,
        module: {
          course: {
            organizationId,
          },
        },
      },
    });

    if (!lesson) {
      throw AppError.notFound("Lesson");
    }

    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    return { id: lessonId, deleted: true };
  }
}
