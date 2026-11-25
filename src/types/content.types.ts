import type { LucideIcon } from "lucide-react";

export type Route =
  | "dashboard"
  | "library"
  | "courses"
  | "create"
  | "editor"
  | "quiz"
  | "preview"
  | "export"
  | "media"
  | "integrations"
  | "analytics"
  | "team"
  | "settings"
  | "distributor"
  | "super-admin"
  | "help";

export type ModalType = "import" | "export" | "delete" | null;

export type ProjectStatus = "Published" | "Draft" | "Review";

export interface ContentProject {
  id: string;
  title: string;
  type: string;
  status: ProjectStatus;
  date: string;
  owner: string;
  progress: number;
  color: string;
  version?: number;
  description?: string;
  contentTypeId?: string;
}

export interface H5PContentType {
  id: string;
  name: string;
  desc: string;
  icon: LucideIcon;
  color: string;
  type: string;
  popular?: boolean;
}

export interface NavItem {
  id: Route;
  label: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}
