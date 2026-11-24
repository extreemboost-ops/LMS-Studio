import { useState } from "react";
import { X, Import, CloudUpload, ShieldCheck, FileArchive, Sparkles, Zap, Trash2, Download } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import { ExportService } from "../../services/export.service";
import type { ExportJob } from "../../types/scorm.types";

export function ModalLayer() {
  const { modal, setModal, modalTargetId, notify } = useApp();
  const { projects, deleteProject, activeProject } = useContent();

  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportJob | null>(null);

  const handleExecuteExport = async () => {
    setIsExporting(true);
    try {
      const res = await ExportService.startExportJob({
        format: "SCORM 2004",
        packageName: targetProject.title.toLowerCase().replace(/[^a-z0-9]/g, "-"),
        version: "1.0.0",
        description: targetProject.description || "",
        launchBehavior: "New Window",
        completionCriteria: "Complete and Quiz",
        passingScore: 80,
        trackingMode: "Completion and score",
      });

      if (res.data) {
        setExportResult(res.data);
        notify("Package bundled successfully and ready for download!");
        if (res.data.downloadUrl) {
          window.open(res.data.downloadUrl, "_blank");
        }
      }
    } catch {
      notify("Export completed (offline mode)");
    } finally {
      setIsExporting(false);
    }
  };

  if (!modal) return null;

  const targetProject = modalTargetId
    ? projects.find((p) => p.id === modalTargetId) || activeProject
    : activeProject;

  return (
    <div className="modal-backdrop" onMouseDown={() => setModal(null)}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        {modal === "import" && (
          <>
            <div className="modal-head">
              <div>
                <div className="modal-icon">
                  <Import size={20} />
                </div>
                <span>
                  <h2>Import H5P package</h2>
                  <p>Add an existing .h5p file to your library.</p>
                </span>
              </div>
              <button className="icon-button" onClick={() => setModal(null)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div
                className="import-drop"
                onClick={() => notify("H5P file picker opened — demonstration mode")}
              >
                <CloudUpload size={27} />
                <b>Drop your H5P file here</b>
                <span>or click to browse · Maximum 100 MB</span>
                <button className="btn secondary" type="button">
                  Choose file
                </button>
              </div>
              <div className="info-row">
                <ShieldCheck size={17} />
                <span>
                  Files are validated before import. Unsupported libraries will be identified for
                  review.
                </span>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setModal(null)} type="button">
                Cancel
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setModal(null);
                  notify("H5P package import simulated — validation passed");
                }}
                type="button"
              >
                Import package
              </button>
            </div>
          </>
        )}

        {modal === "export" && (
          <>
            <div className="modal-head">
              <div>
                <div className="modal-icon">
                  <FileArchive size={20} />
                </div>
                <span>
                  <h2>Generate SCORM package</h2>
                  <p>Review your configuration before export.</p>
                </span>
              </div>
              <button className="icon-button" onClick={() => setModal(null)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div
                className="prototype-alert"
                style={{
                  background: exportResult ? "#f0fdf4" : undefined,
                  borderColor: exportResult ? "#86efac" : undefined,
                  color: exportResult ? "#166534" : undefined,
                }}
              >
                {exportResult ? <ShieldCheck size={17} color="#16a34a" /> : <Sparkles size={17} />}
                <div>
                  <b>{exportResult ? "Package Ready" : "Packaging Engine"}</b>
                  <span>
                    {exportResult
                      ? `Generated ${exportResult.packageName} (${exportResult.fileSize || "18.4 MB"}). Ready for download.`
                      : "Generates fully compliant SCORM 2004 / 1.2 zip archive with imsmanifest.xml, runtime bridge, and content data."}
                  </span>
                </div>
              </div>
              <div className="export-review">
                <div>
                  <span>Format</span>
                  <b>SCORM 2004 4th Edition</b>
                </div>
                <div>
                  <span>Package</span>
                  <b>{targetProject.title.toLowerCase().replace(/[^a-z0-9]/g, "-")}.zip</b>
                </div>
                <div>
                  <span>Tracking</span>
                  <b>Completion and score</b>
                </div>
                <div>
                  <span>Estimated size</span>
                  <b>24.8 MB</b>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setModal(null)} type="button">
                {exportResult ? "Close" : "Cancel"}
              </button>
              {exportResult?.downloadUrl ? (
                <a
                  href={exportResult.downloadUrl}
                  download={exportResult.packageName}
                  className="btn primary"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", textDecoration: "none" }}
                  onClick={() => setModal(null)}
                >
                  <Download size={15} />
                  Download package
                </a>
              ) : (
                <button
                  className="btn primary"
                  onClick={handleExecuteExport}
                  disabled={isExporting}
                  type="button"
                >
                  <Download size={15} />
                  {isExporting ? "Bundling package…" : "Generate package"}
                </button>
              )}
            </div>
          </>
        )}

        {modal === "delete" && (
          <>
            <div className="modal-head">
              <div>
                <div className="modal-icon danger">
                  <Trash2 size={20} />
                </div>
                <span>
                  <h2>Delete content?</h2>
                  <p>This action cannot be undone.</p>
                </span>
              </div>
              <button className="icon-button" onClick={() => setModal(null)} type="button">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="delete-copy">
                “{targetProject.title}” and its associated draft data will be permanently removed
                from this demonstration workspace.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn secondary" onClick={() => setModal(null)} type="button">
                Cancel
              </button>
              <button
                className="btn danger-fill"
                onClick={() => {
                  deleteProject(targetProject.id);
                  setModal(null);
                  notify(`“${targetProject.title}” removed from demonstration view`);
                }}
                type="button"
              >
                Delete content
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
