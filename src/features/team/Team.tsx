import { useState } from "react";
import { Plus, Search, SlidersHorizontal, MoreHorizontal } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { initialTeamMembers } from "../../mocks/team.mock";

export function Team() {
  const { notify } = useApp();
  const [memberSearch, setMemberSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All roles");

  const filtered = initialTeamMembers.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
      m.email.toLowerCase().includes(memberSearch.toLowerCase());
    const matchesRole = roleFilter === "All roles" || m.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <>
      <PageHeader
        title="Team members"
        subtitle="Manage collaborators, roles, and workspace access."
      >
        <button
          className="btn primary"
          onClick={() => notify("Team invitation modal opened — demonstration mode")}
          type="button"
        >
          <Plus size={16} />
          Invite member
        </button>
      </PageHeader>

      <section className="panel">
        <div className="toolbar inset">
          <div className="search-field">
            <Search size={16} />
            <input
              placeholder="Search members…"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
          </div>
          <button
            className="btn secondary"
            onClick={() => {
              const roles = ["All roles", "Administrator", "Content creator", "Reviewer", "Viewer"];
              const nextIdx = (roles.indexOf(roleFilter) + 1) % roles.length;
              setRoleFilter(roles[nextIdx]);
              notify(`Filtered by: ${roles[nextIdx]}`);
            }}
            type="button"
          >
            <SlidersHorizontal size={16} />
            {roleFilter}
          </button>
        </div>

        <div className="data-table team-table">
          <div className="table-row header">
            <span>Member</span>
            <span>Role</span>
            <span>Projects</span>
            <span>Last active</span>
            <span>Status</span>
            <span />
          </div>

          {filtered.map((x) => (
            <div className="table-row" key={x.id}>
              <span>
                <div className={`avatar ${x.avatarColor}`}>
                  {x.name
                    .split(" ")
                    .map((y) => y[0])
                    .join("")}
                </div>
                <span>
                  <b>{x.name}</b>
                  <small>{x.email}</small>
                </span>
              </span>
              <span>
                <StatusBadge status={x.role} />
              </span>
              <span>{x.projectsCount}</span>
              <span>{x.lastActive}</span>
              <span>
                <StatusBadge status={x.status} />
              </span>
              <span>
                <button
                  className="icon-button"
                  onClick={() => notify(`Permissions menu for ${x.name}`)}
                  type="button"
                  aria-label="Member options"
                >
                  <MoreHorizontal size={17} />
                </button>
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
