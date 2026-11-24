import { useState } from "react";
import { Import, Plus, Search, SlidersHorizontal, Columns3, List, Pencil, MoreHorizontal, Copy, Download, Trash2 } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { ProjectThumb } from "../../components/ui/ProjectThumb";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { EmptyState } from "../../components/ui/EmptyState";

export function ContentLibrary() {
  const { navigate, setModal, setModalTargetId, search, setSearch, notify } = useApp();
  const { projects, setActiveProjectById, duplicateProject } = useContent();

  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState("All content");
  const [menu, setMenu] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "title" | "progress">("date");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const filtered = projects
    .filter((p) => {
      const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.type.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filter === "All content" || p.status === filter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "progress") return b.progress - a.progress;
      return 0; // retain default order
    });

  const handleEdit = (id: string) => {
    setActiveProjectById(id);
    navigate("editor");
  };

  const handleDuplicate = (id: string, title: string) => {
    duplicateProject(id);
    setMenu(null);
    notify(`Created duplicate of “${title}”`);
  };

  const handleOpenExport = (id: string) => {
    setModalTargetId(id);
    setModal("export");
    setMenu(null);
  };

  const handleOpenDelete = (id: string) => {
    setModalTargetId(id);
    setModal("delete");
    setMenu(null);
  };

  return (
    <>
      <PageHeader
        title="Content library"
        subtitle="Create, manage, and organize your interactive learning content."
      >
        <button className="btn secondary" onClick={() => setModal("import")} type="button">
          <Import size={16} />
          Import H5P
        </button>
        <button className="btn primary" onClick={() => navigate("create")} type="button">
          <Plus size={16} />
          New content
        </button>
      </PageHeader>

      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            placeholder="Search content…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-set">
          {["All content", "Published", "Draft", "Review"].map((x) => (
            <button
              className={filter === x ? "active" : ""}
              onClick={() => setFilter(x)}
              key={x}
              type="button"
            >
              {x}
              {x === "All content" && <span>{projects.length}</span>}
            </button>
          ))}
        </div>

        <div className="relative">
          <button
            className={`btn secondary ${showFilterDropdown ? "active" : ""}`}
            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
            type="button"
          >
            <SlidersHorizontal size={16} />
            Sort: {sortBy === "date" ? "Recent" : sortBy === "title" ? "Title" : "Progress"}
          </button>
          {showFilterDropdown && (
            <div className="popover-menu" style={{ right: 0, top: "100%", marginTop: 6, zIndex: 40 }}>
              <button
                onClick={() => {
                  setSortBy("date");
                  setShowFilterDropdown(false);
                }}
                type="button"
              >
                Sort by Recent
              </button>
              <button
                onClick={() => {
                  setSortBy("title");
                  setShowFilterDropdown(false);
                }}
                type="button"
              >
                Sort by Title
              </button>
              <button
                onClick={() => {
                  setSortBy("progress");
                  setShowFilterDropdown(false);
                }}
                type="button"
              >
                Sort by Completion %
              </button>
            </div>
          )}
        </div>

        <div className="view-toggle">
          <button
            className={view === "grid" ? "active" : ""}
            onClick={() => setView("grid")}
            title="Grid View"
            type="button"
          >
            <Columns3 size={17} />
          </button>
          <button
            className={view === "list" ? "active" : ""}
            onClick={() => setView("list")}
            title="List View"
            type="button"
          >
            <List size={17} />
          </button>
        </div>
      </div>

      {filtered.length ? (
        <div className={view === "grid" ? "library-grid" : "library-list"}>
          {filtered.map((p) => (
            <article className="content-card" key={p.id}>
              <button
                className="card-preview"
                onClick={() => handleEdit(p.id)}
                type="button"
                title={`Edit ${p.title}`}
              >
                <ProjectThumb variant={p.color} />
                <StatusBadge status={p.status} />
              </button>

              <div className="card-body">
                <div className="card-kicker">{p.type}</div>
                <h3>{p.title}</h3>
                <div className="card-meta">
                  <div className="avatar tiny">
                    {p.owner === "You"
                      ? "AK"
                      : p.owner
                          .split(" ")
                          .map((x) => x[0])
                          .join("")}
                  </div>
                  <span>{p.owner}</span>
                  <i /> <span>{p.date}</span>
                </div>
                <div className="card-progress">
                  <div>
                    <span>Content complete</span>
                    <b>{p.progress}%</b>
                  </div>
                  <div className="progress">
                    <i style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="btn secondary"
                  onClick={() => handleEdit(p.id)}
                  type="button"
                >
                  <Pencil size={15} />
                  Edit
                </button>
                <div className="relative">
                  <button
                    className="icon-button"
                    onClick={() => setMenu(menu === p.id ? null : p.id)}
                    type="button"
                    aria-label="More options"
                  >
                    <MoreHorizontal size={17} />
                  </button>
                  {menu === p.id && (
                    <div className="popover-menu">
                      <button
                        onClick={() => handleDuplicate(p.id, p.title)}
                        type="button"
                      >
                        <Copy size={15} />
                        Duplicate
                      </button>
                      <button
                        onClick={() => handleOpenExport(p.id)}
                        type="button"
                      >
                        <Download size={15} />
                        Export
                      </button>
                      <button
                        className="danger"
                        onClick={() => handleOpenDelete(p.id)}
                        type="button"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No content found"
          text="Try a different search term or clear your filters."
          actionLabel="Clear filters"
          onAction={() => {
            setSearch("");
            setFilter("All content");
          }}
        />
      )}
    </>
  );
}
