import { useState } from "react";
import { Search, Sparkles, Clock3, ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { contentTypes } from "../../mocks/content.mock";

export function CreateContent() {
  const { navigate, notify } = useApp();
  const { createProject } = useContent();
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filtered = contentTypes.filter((t) => {
    const matchesQuery = t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.desc.toLowerCase().includes(query.toLowerCase()) ||
      t.type.toLowerCase().includes(query.toLowerCase());
    const matchesCat = !categoryFilter || (categoryFilter === "popular" ? t.popular : true);
    return matchesQuery && matchesCat;
  });

  const handleSelectType = (name: string, type: string, color: string) => {
    const newProject = createProject({
      title: `Untitled ${name}`,
      type: name,
      color: color === "emerald" ? "quiz" : color === "indigo" ? "leadership" : color === "violet" ? "customer" : "safety",
    });

    notify(`Created new ${name} project draft`);

    if (name.includes("Question") || name === "Multiple Choice") {
      navigate("quiz");
    } else {
      navigate("editor");
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="CONTENT AUTHORING"
        title="What would you like to create?"
        subtitle="Choose a content type to start building your learning experience."
      />

      <div className="create-tools">
        <div className="search-field large">
          <Search size={18} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search content types…"
          />
        </div>
        <button
          className={`btn secondary ${categoryFilter === "popular" ? "active" : ""}`}
          onClick={() => setCategoryFilter(categoryFilter === "popular" ? null : "popular")}
          type="button"
        >
          <Sparkles size={16} />
          Recommended
        </button>
        <button
          className="btn secondary"
          onClick={() => notify("Showing recently used content formats")}
          type="button"
        >
          <Clock3 size={16} />
          Recently used
        </button>
      </div>

      <section>
        <div className="section-heading">
          <div>
            <h2>Popular content types</h2>
            <p>Flexible formats for courses, training, and assessments</p>
          </div>
        </div>

        <div className="type-gallery">
          {filtered.map((t, i) => {
            const Icon = t.icon;
            return (
              <button
                className="type-card"
                key={t.name}
                onClick={() => handleSelectType(t.name, t.type, t.color)}
                type="button"
              >
                <div className={`type-visual ${t.color}`}>
                  <div className="visual-window">
                    <Icon size={34} />
                    <div>
                      <i />
                      <i />
                      <i />
                    </div>
                  </div>
                  {i < 3 && <span className="popular-label">Popular</span>}
                </div>
                <div className="type-card-copy">
                  <div>
                    <span>{t.type}</span>
                    <h3>{t.name}</h3>
                    <p>{t.desc}</p>
                  </div>
                  <ChevronRight size={18} />
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
