import type { LMSIntegration, SyncActivity } from "../types/integration.types";

export const initialLMSIntegrations: LMSIntegration[] = [
  {
    id: "moodle-1",
    name: "Moodle Cloud",
    code: "moodle",
    logo: "m",
    type: "Native REST Plugin",
    status: "Connected",
    lastSync: "18 min ago",
    itemsSynced: 24,
    health: "Healthy",
  },
  {
    id: "canvas-1",
    name: "Canvas LMS",
    code: "canvas",
    logo: "C",
    type: "Native integration",
    status: "Disconnected",
  },
  {
    id: "blackboard-1",
    name: "Blackboard Learn",
    code: "blackboard",
    logo: "B",
    type: "LTI 1.3",
    status: "Disconnected",
  },
  {
    id: "docebo-1",
    name: "Docebo",
    code: "docebo",
    logo: "D",
    type: "SCORM Cloud",
    status: "Disconnected",
  },
  {
    id: "custom-1",
    name: "Custom LMS",
    code: "custom",
    logo: "<>",
    type: "API connection",
    status: "Disconnected",
  },
];

export const initialSyncActivities: SyncActivity[] = [
  { id: "sync-1", contentTitle: "Workplace Safety Essentials", action: "Published to Moodle", time: "18 min ago", success: true },
  { id: "sync-2", contentTitle: "Data Privacy Fundamentals", action: "Sync completed", time: "Yesterday", success: true },
  { id: "sync-3", contentTitle: "Customer Success Playbook", action: "Content updated", time: "Apr 24", success: true },
  { id: "sync-4", contentTitle: "Product Knowledge Check", action: "Sync failed", time: "Apr 22", success: false },
];
