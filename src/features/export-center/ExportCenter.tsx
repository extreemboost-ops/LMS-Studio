import { useState } from "react";
import { Clock3, FileArchive, Check, ShieldCheck, Download } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import { PageHeader } from "../../components/ui/PageHeader";
import { PanelTitle } from "../../components/ui/PanelTitle";
import type { ExportFormat } from "../../types/scorm.types";

export function ExportCenter() {
  const { setModal, notify } = useApp();
  const { activeProject, slides, questions } = useContent();

  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("SCORM 2004");
  const [packageName, setPackageName] = useState(
    activeProject.title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
  );
  const [passingScore, setPassingScore] = useState(80);

  const exports: [ExportFormat, string, string][] = [
    ["Native H5P", "Reusable .h5p package", "H5P"],
    ["SCORM 1.2", "Maximum LMS compatibility", "1.2"],
    ["SCORM 2004", "Advanced tracking and sequencing", "2004"],
  ];

  return (
    <>
      <PageHeader
        title="Export center"
        subtitle="Package your content for delivery in any compatible learning platform."
      >
        <button
          className="btn secondary"
          onClick={() => notify("Viewing 30-day package export audit log")}
          type="button"
        >
          <Clock3 size={16} />
          Export history
        </button>
      </PageHeader>

      <div className="export-layout">
        <div>
          <div className="section-heading compact">
            <div>
              <h2>Choose package format</h2>
              <p>Select the standard required by your learning platform.</p>
            </div>
          </div>

          <div className="export-cards">
            {exports.map(([name, desc, tag]) => (
              <button
                onClick={() => setSelectedFormat(name)}
                className={selectedFormat === name ? "selected" : ""}
                key={name}
                type="button"
              >
                <div className="package-icon">
                  <FileArchive size={25} />
                  <span>{tag}</span>
                </div>
                <div>
                  <h3>{name}</h3>
                  <p>{desc}</p>
                </div>
                <div className="select-ring">
                  {selectedFormat === name && <Check size={13} />}
                </div>
                {name === "SCORM 2004" && <span className="recommended">Recommended</span>}
              </button>
            ))}
          </div>

          <section className="panel export-config">
            <PanelTitle title="Package configuration" />
            <div className="form-grid">
              <label>
                <span>Package name</span>
                <input
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                />
              </label>

              <label>
                <span>Version</span>
                <select defaultValue="1.0.0">
                  <option value="1.0.0">1.0.0</option>
                  <option value="1.1.0">1.1.0</option>
                  <option value="2.0.0">2.0.0</option>
                </select>
              </label>

              <label className="full">
                <span>Description</span>
                <textarea defaultValue={activeProject.description || "Essential workplace safety training for all employees."} />
              </label>

              <label>
                <span>Launch behavior</span>
                <select defaultValue="new-window">
                  <option value="new-window">Open in new window</option>
                  <option value="lms-frame">Open in LMS frame</option>
                </select>
              </label>

              <label>
                <span>Completion criteria</span>
                <select defaultValue="complete-and-quiz">
                  <option value="complete-and-quiz">Complete content and pass quiz</option>
                  <option value="view-all">View all slides</option>
                </select>
              </label>

              <label>
                <span>Passing score</span>
                <div className="input-with-unit">
                  <input
                    type="number"
                    value={passingScore}
                    onChange={(e) => setPassingScore(Number(e.target.value))}
                    min={0}
                    max={100}
                  />
                  <span>%</span>
                </div>
              </label>

              <label>
                <span>Tracking mode</span>
                <select defaultValue="completion-score">
                  <option value="completion-score">Completion and score</option>
                  <option value="completion-only">Completion only</option>
                </select>
              </label>
            </div>
          </section>
        </div>

        <aside className="export-summary">
          <div className="summary-head">
            <div className="package-big">
              <FileArchive size={29} />
            </div>
            <h2>{selectedFormat}</h2>
            <p>{selectedFormat === "Native H5P" ? ".h5p package" : ".zip package"}</p>
          </div>

          <div className="validation">
            <ShieldCheck size={18} />
            <div>
              <b>Ready to export</b>
              <span>All validation checks passed</span>
            </div>
          </div>

          <ul>
            <li>
              <Check size={16} />
              Content structure valid
            </li>
            <li>
              <Check size={16} />
              All media available
            </li>
            <li>
              <Check size={16} />
              Accessibility metadata added
            </li>
            <li>
              <Check size={16} />
              Tracking configured
            </li>
          </ul>

          <div className="summary-details">
            <div>
              <span>Estimated size</span>
              <b>24.8 MB</b>
            </div>
            <div>
              <span>Slides</span>
              <b>{slides.length}</b>
            </div>
            <div>
              <span>Interactions</span>
              <b>8</b>
            </div>
            <div>
              <span>Questions</span>
              <b>{questions.length}</b>
            </div>
          </div>

          <button
            className="btn primary full"
            onClick={() => setModal("export")}
            type="button"
          >
            <Download size={16} />
            Generate package
          </button>
          <p className="prototype-disclaimer">Package is validated and compiled asynchronously into a standard SCORM/H5P zip container.</p>
        </aside>
      </div>
    </>
  );
}
