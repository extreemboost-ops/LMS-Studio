import { FolderKanban, Boxes, FileArchive, UsersRound } from "lucide-react";
import type { StorageMetrics } from "../types/media.types";

export const dashboardStatCards = [
  { label: "Total projects", value: "48", hint: "+6 this month", icon: FolderKanban, color: "blue" },
  { label: "H5P packages", value: "31", hint: "64.5% of content", icon: Boxes, color: "indigo" },
  { label: "SCORM exports", value: "126", hint: "+18 this month", icon: FileArchive, color: "green" },
  { label: "Active learners", value: "2,842", hint: "+12.4% vs last month", icon: UsersRound, color: "violet" },
];

export const exportActivityBars = [32, 46, 39, 62, 55, 74, 68, 92, 76, 100, 84, 112];

export const storageMetricsMock: StorageMetrics = {
  usedGB: 68.2,
  totalGB: 100,
  percentUsed: 68,
  uploadedFilesCount: 238,
  breakdown: {
    videoGB: 38.4,
    imageGB: 18.7,
    otherGB: 11.1,
  },
};
