import type { Course } from "../types/course.types";

export const initialCourses: Course[] = [
  { id: "c-1", title: "Employee Onboarding", code: "COURSE 01", coverIndex: 0, status: "Published", modulesCount: 6, durationMinutes: 35, learnersCount: 124, completionRate: 72 },
  { id: "c-2", title: "Security & Compliance", code: "COURSE 02", coverIndex: 1, status: "Published", modulesCount: 7, durationMinutes: 43, learnersCount: 207, completionRate: 77 },
  { id: "c-3", title: "Customer Excellence", code: "COURSE 03", coverIndex: 2, status: "Published", modulesCount: 8, durationMinutes: 51, learnersCount: 290, completionRate: 82 },
  { id: "c-4", title: "Leadership Essentials", code: "COURSE 04", coverIndex: 3, status: "Draft", modulesCount: 9, durationMinutes: 59, learnersCount: 373, completionRate: 87 },
];
