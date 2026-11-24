export interface Course {
  id: string;
  title: string;
  code: string;
  coverIndex: number;
  status: "Published" | "Draft";
  modulesCount: number;
  durationMinutes: number;
  learnersCount: number;
  completionRate: number;
}
