import { useState, useRef } from "react";
import {
  Upload,
  CloudUpload,
  Search,
  SlidersHorizontal,
  FileImage,
  Film,
  FileAudio,
  FileText,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import { PageHeader } from "../../components/ui/PageHeader";

export function MediaLibrary() {
  const { notify } = useApp();
  const { mediaItems, addMediaAsset, updateMediaAsset, deleteMediaAsset } = useContent();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterType, setFilterType] = useState<string>("All media");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const filtered = mediaItems.filter((m) => {
    const matchesType = filterType === "All media" || m.type === filterType.toLowerCase();
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleFilesUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach((file) => addMediaAsset(file));
    notify(
      files.length === 1
        ? `Uploaded “${files[0].name}” to media library`
        : `Uploaded ${files.length} files to media library`
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilesUpload(e.target.files);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFilesUpload(e.dataTransfer.files);
  };

  const startRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const saveRename = (id: string) => {
    if (editingName.trim()) {
      updateMediaAsset(id, { name: editingName.trim() });
      notify("Media asset renamed");
    }
    setEditingId(null);
  };

  return (
    <>
      <input
        type="file"
        multiple
        accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <PageHeader
        title="Media library"
        subtitle="Manage reusable images, video, audio, and documents."
      >
        <button
          className="btn primary"
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Upload size={16} />
          Upload files
        </button>
      </PageHeader>

      <div
        className="upload-zone"
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          cursor: "pointer",
          borderColor: isDragging ? "#2563eb" : undefined,
          background: isDragging ? "#eff6ff" : undefined,
          transition: "all 0.15s ease",
        }}
      >
        <div>
          <CloudUpload size={24} />
        </div>
        <b>{isDragging ? "Drop files to upload now" : "Drop files here to upload"}</b>
        <span>or click to browse · Up to 500 MB per file</span>
      </div>

      <div className="toolbar">
        <div className="search-field">
          <Search size={16} />
          <input
            placeholder="Search media…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-set">
          {["All media", "Image", "Video", "Audio", "Document"].map((x) => (
            <button
              key={x}
              className={filterType === x ? "active" : ""}
              onClick={() => setFilterType(x)}
              type="button"
            >
              {x}
            </button>
          ))}
        </div>

        <button
          className="btn secondary"
          onClick={() => {
            setFilterType("All media");
            setSearchQuery("");
            notify("Filters cleared");
          }}
          type="button"
        >
          <SlidersHorizontal size={16} />
          Reset
        </button>
      </div>

      <div className="media-grid">
        {filtered.map((m, i) => (
          <article className="media-card" key={m.id || m.name}>
            <div className={`media-preview m${i % 8}`} style={{ overflow: "hidden" }}>
              {m.type === "image" && m.url ? (
                <img
                  src={m.url}
                  alt={m.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : m.type === "video" && m.url ? (
                <video
                  src={m.url}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  muted
                />
              ) : m.type === "image" ? (
                <FileImage size={24} />
              ) : m.type === "video" ? (
                <>
                  <Film size={24} />
                  <span className="duration">{m.duration || "00:54"}</span>
                </>
              ) : m.type === "audio" ? (
                <FileAudio size={24} />
              ) : (
                <FileText size={24} />
              )}
            </div>

            <div>
              <div>
                {editingId === m.id ? (
                  <div style={{ display: "flex", gap: "4px", alignItems: "center", width: "100%" }}>
                    <input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(m.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      autoFocus
                      style={{ flex: 1, minWidth: 0, fontSize: "12px", padding: "3px 6px" }}
                    />
                    <button
                      className="icon-button"
                      onClick={() => saveRename(m.id)}
                      title="Save name"
                      type="button"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => setEditingId(null)}
                      title="Cancel"
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <>
                    <b title={m.name}>{m.name}</b>
                    <div style={{ display: "flex", gap: "2px" }}>
                      <button
                        className="icon-button"
                        onClick={() => startRename(m.id, m.name)}
                        title="Rename media"
                        type="button"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="icon-button"
                        onClick={() => {
                          deleteMediaAsset(m.id);
                          notify(`Deleted “${m.name}”`);
                        }}
                        title="Delete media"
                        type="button"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </>
                )}
              </div>
              <span>
                {m.type.toUpperCase()} · {m.size}
              </span>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
