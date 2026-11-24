import type { LucideIcon } from "lucide-react";

export interface StatMetric {
  label: string;
  value: string;
  change: string;
  icon: LucideIcon;
  color?: string;
}

export interface EngagementPoint {
  date: string;
  value: number;
}

export interface FormatCompletion {
  format: string;
  percentage: number;
  color: string;
}

export interface TopPerformingContent {
  id: string;
  title: string;
  color: string;
  learnersCount: number;
  completionRate: number;
  averageScore: number;
  learningTime: string;
}
