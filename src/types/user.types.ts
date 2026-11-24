export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "Administrator" | "Content creator" | "Reviewer" | "Viewer";
  projectsCount: number;
  lastActive: string;
  status: "Active" | "Invited" | "Suspended";
  avatarColor: "purple" | "teal";
}

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  timeZone: string;
  avatarText: string;
}
