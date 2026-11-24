import { useState, useRef } from "react";
import { Upload, CloudUpload, Search, SlidersHorizontal, FileImage, Film, FileAudio, FileText, MoreHorizontal } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import { PageHeader } from "../../components/ui/PageHeader";

export function MediaLibrary() {
  const { notify } = useApp();
  const { mediaItems, addMediaAsset } = useContent();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filterType, setFilterType] = useState<string>("All media");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = mediaItems.filter((m) => {
    const matchesType = filterType === "All media" || m.type === filterType.toLowerCase();
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      addMediaAsset(files[0]);
      notify(`Uploaded “${files[0].name}” to media storage`);
    }
  };

  const handleSimulatedDrop = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
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
          onClick={handleSimulatedDrop}
          type="button"
        >
          <Upload size={16} />
          Upload files
        </button>
      </PageHeader>

      <div className="upload-zone" onClick={handleSimulatedDrop} style={{ cursor: "pointer" }}>
        <div>
          <CloudUpload size={24} />
        </div>
        <b>Drop files here to upload</b>
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
          onClick={() => notify("Additional media filters: size, date, usage")}
          type="button"
        >
          <SlidersHorizontal size={16} />
          Filters
        </button>
      </div>

      <div className="media-grid">
        {filtered.map((m, i) => (
          <article className="media-card" key={m.id || m.name}>
            <div className={`media-preview m${i % 8}`}>
              {m.type === "image" ? (
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
                <b>{m.name}</b>
                <button
                  className="icon-button"
                  onClick={() => notify(`Asset options for “${m.name}”`)}
                  type="button"
                >
                  <MoreHorizontal size={16} />
                </button>
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
