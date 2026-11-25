import { Boxes, PanelLeftClose, PanelLeftOpen, ChevronDown } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useBranding } from "../../context/BrandingContext";
import { navGroups } from "../../mocks/content.mock";

export function Sidebar() {
  const { route, navigate, sidebarOpen, setSidebarOpen, mobileNav } = useApp();
  const { organization, openAuthModal } = useAuth();
  const { branding } = useBranding();

  const orgName = organization?.name || "Acme Learning";
  const orgPlan = organization?.plan || "Business plan";
  const orgInitials = orgName.substring(0, 2).toUpperCase();

  return (
    <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"} ${mobileNav ? "mobile-open" : ""}`}>
      <div className="brand">
        <div className="brand-mark">
          {branding.isWhiteLabeled && branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.appName}
              style={{ width: 22, height: 22, objectFit: "contain", borderRadius: 4 }}
            />
          ) : (
            <Boxes size={20} strokeWidth={2.3} />
          )}
        </div>
        {sidebarOpen && (
          <div className="brand-copy">
            <b>{branding.appName}</b>
            <span>{branding.appSubtitle}</span>
          </div>
        )}
        <button
          className="icon-button collapse-btn"
          onClick={() => setSidebarOpen((prev) => !prev)}
          aria-label="Toggle sidebar"
          type="button"
        >
          {sidebarOpen ? <PanelLeftClose size={17} /> : <PanelLeftOpen size={17} />}
        </button>
      </div>

      <nav className="side-nav">
        {navGroups.map((group, index) => (
          <div className="nav-group" key={index}>
            {group.label && sidebarOpen && <div className="nav-label">{group.label}</div>}
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${route === item.id ? "active" : ""}`}
                  onClick={() => navigate(item.id)}
                  title={item.label}
                  type="button"
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="workspace-card" onClick={() => openAuthModal("register")} title="Manage Organization & Workspaces" style={{ cursor: "pointer" }}>
        {sidebarOpen ? (
          <>
            <div className="workspace-row">
              <div className="avatar org">{orgInitials}</div>
              <div>
                <b>{orgName}</b>
                <span>{orgPlan}</span>
              </div>
              <ChevronDown size={15} />
            </div>
            <div className="storage-mini">
              <div>
                <span>Storage</span>
                <b>68%</b>
              </div>
              <div className="progress">
                <i style={{ width: "68%" }} />
              </div>
            </div>
          </>
        ) : (
          <div className="avatar org">{orgInitials}</div>
        )}
      </div>
    </aside>
  );
}
