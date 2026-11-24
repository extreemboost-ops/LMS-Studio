import { useState } from "react";
import { Search, WandSparkles, Pencil, FileArchive, Link2, BarChart3, UserRound, ChevronRight, MessageSquareText } from "lucide-react";
import { useApp } from "../../context/AppContext";

export function Help() {
  const { notify } = useApp();
  const [helpQuery, setHelpQuery] = useState("");

  const articles = [
    ["Getting started", "Set up your workspace and create your first project.", WandSparkles],
    ["Content authoring", "Build interactive, accessible learning experiences.", Pencil],
    ["Publishing & export", "Package H5P and SCORM content for your LMS.", FileArchive],
    ["LMS integrations", "Connect, publish, and keep content in sync.", Link2],
    ["Analytics & reports", "Understand learner progress and performance.", BarChart3],
    ["Account & billing", "Manage your plan, team, and organization.", UserRound],
  ];

  const filtered = articles.filter(
    ([title, desc]) =>
      (title as string).toLowerCase().includes(helpQuery.toLowerCase()) ||
      (desc as string).toLowerCase().includes(helpQuery.toLowerCase()),
  );

  return (
    <>
      <div className="help-hero">
        <span>HELP CENTER</span>
        <h1>How can we help?</h1>
        <p>Find answers, guides, and practical resources for building great learning.</p>
        <div className="help-search">
          <Search size={18} />
          <input
            placeholder="Search help articles…"
            value={helpQuery}
            onChange={(e) => setHelpQuery(e.target.value)}
          />
          <kbd>↵</kbd>
        </div>
      </div>

      <div className="help-grid">
        {filtered.map(([a, b, Icon]) => {
          const IconComp = Icon as typeof WandSparkles;
          return (
            <button
              key={a as string}
              onClick={() => notify(`Opening documentation: ${a as string}`)}
              type="button"
            >
              <div>
                <IconComp size={20} />
              </div>
              <h3>{a as string}</h3>
              <p>{b as string}</p>
              <span>
                Browse articles <ChevronRight size={14} />
              </span>
            </button>
          );
        })}
      </div>

      <div className="support-strip">
        <div>
          <MessageSquareText size={22} />
          <span>
            <b>Still need help?</b>
            <small>Our support team typically replies within one business day.</small>
          </span>
        </div>
        <button
          className="btn primary"
          onClick={() => notify("Support contact form opened")}
          type="button"
        >
          Contact support
        </button>
      </div>
    </>
  );
}
