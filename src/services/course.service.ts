import { ApiClient, ApiResponse } from "./api-client.js";
import type { Course } from "../types/course.types.js";
import { initialCourses } from "../mocks/courses.mock.js";

export class CourseService {
  static async getCourses(organizationId?: string): Promise<ApiResponse<Course[]>> {
    const endpoint = organizationId ? `/organizations/${organizationId}/courses` : "/courses";
    return ApiClient.get<Course[]>(endpoint, initialCourses);
  }

  static async getCourseById(courseId: string, organizationId?: string): Promise<ApiResponse<Course | undefined>> {
    const endpoint = organizationId ? `/organizations/${organizationId}/courses/${courseId}` : `/courses/${courseId}`;
    const fallback = initialCourses.find((c) => c.id === courseId);
    return ApiClient.get<Course | undefined>(endpoint, fallback);
  }

  static async createCourse(
    course: Partial<Course> & { workspaceId?: string },
    organizationId?: string
  ): Promise<ApiResponse<Course>> {
    const endpoint = organizationId ? `/organizations/${organizationId}/courses` : "/courses";
    const newCourse: Course = {
      id: course.id || `course-${Date.now()}`,
      title: course.title || "New Safety Course",
      code: course.code || "COURSE 01",
      coverIndex: course.coverIndex ?? 0,
      status: course.status || "Draft",
      modulesCount: course.modulesCount ?? 0,
      durationMinutes: course.durationMinutes ?? 45,
      learnersCount: course.learnersCount ?? 0,
      completionRate: course.completionRate ?? 0,
    };
    return ApiClient.post<Course>(endpoint, course, newCourse);
  }

  static async deleteCourse(courseId: string, organizationId?: string): Promise<ApiResponse<boolean>> {
    const endpoint = organizationId ? `/organizations/${organizationId}/courses/${courseId}` : `/courses/${courseId}`;
    return ApiClient.delete<boolean>(endpoint, true);
  }
}
