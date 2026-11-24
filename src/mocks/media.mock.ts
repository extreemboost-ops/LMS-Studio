import type { MediaAsset } from "../types/media.types";

export const initialMediaAssets: MediaAsset[] = [
  { id: "m-1", name: "Team workshop", type: "image", size: "2.4 MB", uploadedAt: "Today" },
  { id: "m-2", name: "Safety briefing", type: "video", size: "18.4 MB", duration: "00:54", uploadedAt: "Yesterday" },
  { id: "m-3", name: "Office floor plan", type: "image", size: "1.8 MB", uploadedAt: "3 days ago" },
  { id: "m-4", name: "Welcome narration", type: "audio", size: "4.2 MB", uploadedAt: "Apr 25" },
  { id: "m-5", name: "Brand guidelines", type: "document", size: "3.1 MB", uploadedAt: "Apr 23" },
  { id: "m-6", name: "Emergency exit", type: "image", size: "980 KB", uploadedAt: "Apr 20" },
  { id: "m-7", name: "Leadership session", type: "video", size: "32.6 MB", duration: "01:24", uploadedAt: "Apr 18" },
  { id: "m-8", name: "Course certificate", type: "document", size: "640 KB", uploadedAt: "Apr 15" },
];
