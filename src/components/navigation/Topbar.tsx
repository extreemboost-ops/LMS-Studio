import { Menu, ChevronRight, Search, HelpCircle, Bell, ChevronDown, LogIn } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import type { Route } from "../../types/content.types";

const routeTitles: Record<Route, string> = {
  dashboard: "Dashboard",
  library: "Content Library",
  courses: "Courses",
  create: "Create Content",
  editor: "Authoring Workspace",
  quiz: "Quiz Editor",
  preview: "Preview",
  export: "Export Center",
  media: "Media Library",
  integrations: "LMS Integrations",
  analytics: "Analytics",
  team: "Team Members",
  distributor: "Distributor Hub",
  "super-admin": "SaaS Command",
  settings: "Settings",
  help: "Help & Support",
};

export function Topbar() {
  const { route, search, setSearch, mobileNav, setMobileNav, navigate, notify } = useApp();
  const { user, isAuthenticated, openAuthModal } = useAuth();

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U"
    : "AK";
  const fullName = user ? `${user.firstName} ${user.lastName}` : "Alex Kim";
  const roleName = user?.role || "Admin";

  return (
    <header className="topbar">
      <button
        className="icon-button mobile-menu"
        onClick={() => setMobileNav((prev) => !prev)}
        aria-label="Open mobile navigation"
        type="button"
      >
        <Menu size={20} />
      </button>

      <div className="breadcrumbs">
        <span>Workspace</span>
        <ChevronRight size={14} />
        <b>{routeTitles[route] || "Workspace"}</b>
      </div>

      <div className="top-actions">
        <div className="global-search">
          <Search size={17} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anything…"
          />
          <kbd>⌘ K</kbd>
        </div>

        <button
          className="icon-button hide-mobile"
          onClick={() => navigate("help")}
          title="Help & Support"
          type="button"
        >
          <HelpCircle size={19} />
        </button>

        <button
          className="icon-button notification"
          onClick={() => notify("You have no unread notifications")}
          title="Notifications"
          type="button"
        >
          <Bell size={19} />
          <i />
        </button>

        {isAuthenticated ? (
          <button
            className="profile-button"
            onClick={() => navigate("settings")}
            title="View Profile Settings"
            type="button"
          >
            <div className="avatar">{initials}</div>
            <div>
              <b>{fullName}</b>
              <span>{roleName}</span>
            </div>
            <ChevronDown size={14} />
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={() => openAuthModal("login")}
            style={{ padding: "6px 12px", fontSize: 13 }}
            type="button"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
