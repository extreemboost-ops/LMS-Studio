import { UsersRound, Target, Gauge, Clock3 } from "lucide-react";
import type { StatMetric, FormatCompletion, TopPerformingContent } from "../types/analytics.types";

export const analyticsKpis: StatMetric[] = [
  { label: "Learners", value: "2,842", change: "+12.4%", icon: UsersRound },
  { label: "Completion rate", value: "78.6%", change: "+4.2%", icon: Target },
  { label: "Average score", value: "86.2%", change: "+2.8%", icon: Gauge },
  { label: "Learning time", value: "1,284h", change: "+18.3%", icon: Clock3 },
];

export const formatCompletionData: FormatCompletion[] = [
  { format: "Presentation", percentage: 84, color: "blue" },
  { format: "Interactive video", percentage: 79, color: "indigo" },
  { format: "Assessments", percentage: 74, color: "cyan" },
  { format: "Books", percentage: 69, color: "slate" },
];

export const topPerformingContent: TopPerformingContent[] = [
  { id: "tp-1", title: "Workplace Safety Essentials", color: "safety", learnersCount: 832, completionRate: 92, averageScore: 94, learningTime: "12m" },
  { id: "tp-2", title: "Data Privacy Fundamentals", color: "privacy", learnersCount: 708, completionRate: 86, averageScore: 91, learningTime: "15m" },
  { id: "tp-3", title: "Customer Success Playbook", color: "customer", learnersCount: 584, completionRate: 80, averageScore: 88, learningTime: "18m" },
  { id: "tp-4", title: "Product Knowledge Check", color: "quiz", learnersCount: 460, completionRate: 74, averageScore: 85, learningTime: "21m" },
];
