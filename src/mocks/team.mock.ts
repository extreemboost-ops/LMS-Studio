import type { TeamMember, UserProfile } from "../types/user.types";

export const initialTeamMembers: TeamMember[] = [
  { id: "tm-1", name: "Alex Kim", email: "alex@acme.edu", role: "Administrator", projectsCount: 24, lastActive: "Now", status: "Active", avatarColor: "teal" },
  { id: "tm-2", name: "Maya Chen", email: "maya@acme.edu", role: "Content creator", projectsCount: 18, lastActive: "12 min ago", status: "Active", avatarColor: "purple" },
  { id: "tm-3", name: "Priya Shah", email: "priya@acme.edu", role: "Reviewer", projectsCount: 11, lastActive: "2 hours ago", status: "Active", avatarColor: "teal" },
  { id: "tm-4", name: "Noah Williams", email: "noah@acme.edu", role: "Content creator", projectsCount: 16, lastActive: "Yesterday", status: "Active", avatarColor: "purple" },
  { id: "tm-5", name: "Leo Martin", email: "leo@acme.edu", role: "Viewer", projectsCount: 4, lastActive: "Apr 24", status: "Active", avatarColor: "teal" },
];

export const currentUserProfile: UserProfile = {
  id: "user-1",
  firstName: "Alex",
  lastName: "Kim",
  email: "alex@acme.edu",
  jobTitle: "Learning Experience Lead",
  timeZone: "Pacific Time (UTC−08:00)",
  avatarText: "AK",
};
