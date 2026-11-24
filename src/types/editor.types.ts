export interface Hotspot {
  id: string;
  number: number;
  label: string;
  description?: string;
  top?: string;
  left?: string;
}

export interface SlideElement {
  id: string;
  type: "video" | "text" | "image" | "question";
  name: string;
  textContent?: string;
  mediaFile?: string;
  mediaDuration?: string;
  mediaSize?: string;
  altText?: string;
  showControls?: boolean;
  autoplay?: boolean;
  allowSeeking?: boolean;
  loopVideo?: boolean;
  width?: number;
  cornerRadius?: number;
  showShadow?: boolean;
  showBorder?: boolean;
  overlayColor?: string;
  completionCriteria?: "viewed" | "interactions";
  requireAllHotspots?: boolean;
  includeInScore?: boolean;
  points?: number;
  hotspots?: Hotspot[];
}

export interface Slide {
  id: string;
  chapterId: string;
  num: number;
  title: string;
  subtitle?: string;
  type: string;
  elements: SlideElement[];
}

export interface Chapter {
  id: string;
  title: string;
  expanded?: boolean;
}

export type EditorTab = "General" | "Style" | "Behavior";
export type DevicePreviewMode = "desktop" | "tablet" | "mobile";
export type CanvasZoom = "50%" | "80%" | "100%" | "120%" | "Fit";
export type CanvasTool = "pointer" | "text" | "image" | "video" | "question" | "ai";
export type EditorSyncStatus = "saved" | "saving" | "unsaved";
