import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Undo2,
  Redo2,
  Play,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Plus,
  GripVertical,
  MousePointer2,
  AlignLeft,
  ImagePlus,
  Video,
  SquareStack,
  BrainCircuit,
  Monitor,
  ShieldCheck,
  Pause,
  Settings,
  Film,
  SlidersHorizontal,
  X,
  List,
  Check,
  PanelLeftOpen,
  MessageSquareText,
  Trash2,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useContent } from "../../context/ContentContext";
import { PropertySection } from "../../components/ui/PropertySection";
import { ToggleRow } from "../../components/ui/ToggleRow";
import type { EditorTab, CanvasZoom, CanvasTool, SlideElement } from "../../types/editor.types";

export function AuthoringWorkspace() {
  const { navigate, setModal, notify } = useApp();
  const {
    activeProject,
    updateActiveProject,
    slides,
    activeSlideId,
    setActiveSlideId,
    addSlide,
    deleteSlide,
    activeElementId,
    setActiveElementId,
    updateSlideElement,
    addSlideElement,
    removeSlideElement,
    addHotspot,
    updateHotspot,
    removeHotspot,
    undo,
    redo,
    canUndo,
    canRedo,
    saveStatus,
    saveCurrentProject,
  } = useContent();

  const [rightTab, setRightTab] = useState<EditorTab>("General");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [selectedHotspotNum, setSelectedHotspotNum] = useState<number | null>(1);
  const [canvasZoom, setCanvasZoom] = useState<CanvasZoom>("80%");
  const [activeTool, setActiveTool] = useState<CanvasTool>("pointer");

  // Resolve current active slide
  const currentSlide = slides.find((s) => s.id === activeSlideId) || slides[0] || {
    id: "default-slide",
    chapterId: "ch-1",
    num: 1,
    title: "Lesson 01 · Welcome",
    type: "Interactive video",
    elements: [],
  };

  // Resolve active interactive element on slide
  const activeElement: SlideElement = currentSlide.elements.find((el) => el.id === activeElementId) ||
    currentSlide.elements[0] || {
      id: "elem-default",
      type: "video",
      name: "Interactive video",
      mediaFile: "office-safety.mp4",
      mediaDuration: "54 sec",
      mediaSize: "18.4 MB",
      altText: "An open-plan office showing several potential workplace hazards.",
      showControls: true,
      autoplay: false,
      allowSeeking: true,
      loopVideo: false,
      width: 920,
      cornerRadius: 12,
      showShadow: true,
      showBorder: false,
      overlayColor: "#0F172A",
      completionCriteria: "viewed",
      requireAllHotspots: true,
      includeInScore: false,
      points: 3,
      hotspots: [
        { id: "hs-1", number: 1, label: "Hotspot 1 · Loose cable", left: "17%", top: "85%" },
        { id: "hs-2", number: 2, label: "Hotspot 2 · Blocked exit", left: "90%", top: "19%" },
        { id: "hs-3", number: 3, label: "Hotspot 3 · Open drawer", left: "55%", top: "72%" },
      ],
    };

  // Keyboard shortcut integration (Ctrl+Z, Ctrl+Y, Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (canRedo) redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveCurrentProject();
        notify("Project saved successfully");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, undo, redo, saveCurrentProject, notify]);

  const handleTitleChange = (newTitle: string) => {
    updateActiveProject({ title: newTitle });
  };

  const handleHotspotClick = (num: number, label: string) => {
    setSelectedHotspotNum(num);
    notify(`Selected Hotspot ${num}: ${label}`);
  };

  const handleAddHotspotClick = () => {
    addHotspot(currentSlide.id, activeElement.id);
    notify("New hotspot interaction added to canvas");
  };

  const handleAddTextElement = () => {
    const newEl: SlideElement = {
      id: `elem-${Date.now()}`,
      type: "text",
      name: "Text Block",
      textContent: "Important safety reminder: Verify all isolation valves before inspection.",
      width: 600,
      cornerRadius: 8,
      showShadow: false,
    };
    addSlideElement(currentSlide.id, newEl);
    setActiveTool("pointer");
    notify("Text element added to slide");
  };

  const handleAddImageElement = () => {
    const newEl: SlideElement = {
      id: `elem-${Date.now()}`,
      type: "image",
      name: "Reference Diagram",
      mediaFile: "hazard-warning-symbol.png",
      altText: "Standard hazard symbol diagram",
      width: 480,
      cornerRadius: 8,
      showShadow: true,
    };
    addSlideElement(currentSlide.id, newEl);
    setActiveTool("pointer");
    notify("Image placeholder element added to slide");
  };

  const zoomScale =
    canvasZoom === "50%"
      ? 0.5
      : canvasZoom === "80%"
      ? 0.8
      : canvasZoom === "100%"
      ? 1.0
      : canvasZoom === "120%"
      ? 1.2
      : 1.0;

  // Accessibility compliance evaluation
  const hasAltText = Boolean(activeElement.altText && activeElement.altText.trim().length > 5);
  const hasHotspots = Boolean(activeElement.hotspots && activeElement.hotspots.length > 0);
  const isAccessible = hasAltText && hasHotspots;

  return (
    <div className="editor-shell">
      <header className="editor-topbar">
        <button
          className="icon-button"
          onClick={() => navigate("library")}
          title="Return to library"
          type="button"
        >
          <ArrowLeft size={19} />
        </button>

        <div className="editor-title">
          <div className="mini-brand">
            <Boxes size={16} />
          </div>
          <div>
            <input
              value={activeProject.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              title="Click to edit project title"
            />
            <span>
              <CheckCircle2 size={13} />
              {saveStatus === "saving" ? "Saving changes…" : "Saved just now"}
            </span>
          </div>
        </div>

        <div className="editor-history">
          <button
            className={`icon-button ${canUndo ? "" : "muted"}`}
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            type="button"
          >
            <Undo2 size={17} />
          </button>
          <button
            className={`icon-button ${canRedo ? "" : "muted"}`}
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            type="button"
          >
            <Redo2 size={17} />
          </button>
          <i />
          <span>Version {activeProject.version || 18}</span>
        </div>

        <div className="editor-actions">
          <div className="collaborators" title="Active collaborators">
            <div className="avatar tiny purple">MC</div>
            <div className="avatar tiny teal">PS</div>
          </div>
          <button className="btn secondary" onClick={() => navigate("preview")} type="button">
            <Play size={15} />
            Preview
          </button>
          <button className="btn primary" onClick={() => setModal("export")} type="button">
            <Download size={15} />
            Export
          </button>
          <button
            className="icon-button"
            onClick={() => notify("Project settings and export options")}
            type="button"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </header>

      <div className="editor-body">
        {/* LEFT PANEL: OUTLINE */}
        <aside className={`outline-panel ${leftOpen ? "" : "closed"}`}>
          <div className="editor-panel-head">
            <div>
              <b>Content outline</b>
              <span>{slides.length} slides · 12 min</span>
            </div>
            <button
              className="icon-button"
              onClick={() => setLeftOpen(false)}
              aria-label="Collapse outline"
              type="button"
            >
              <ChevronLeft size={17} />
            </button>
          </div>

          <div className="outline-tools">
            <button className="btn secondary full" onClick={addSlide} type="button">
              <Plus size={15} />
              Add content
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="outline-scroll">
            <div className="chapter-label">
              <ChevronDown size={14} />
              <span>CHAPTER 1</span>
              <button
                type="button"
                onClick={() => notify("Chapter 1 settings")}
                aria-label="Chapter options"
              >
                <MoreHorizontal size={15} />
              </button>
            </div>

            {slides.map((s, i) => (
              <button
                key={s.id}
                onClick={() => {
                  setActiveSlideId(s.id);
                  if (s.elements.length > 0) {
                    setActiveElementId(s.elements[0].id);
                  }
                }}
                className={`outline-item ${activeSlideId === s.id ? "selected" : ""}`}
                type="button"
              >
                <GripVertical size={14} />
                <div className={`slide-mini s${i % 4}`}>
                  <span>{s.num}</span>
                </div>
                <div>
                  <b>{s.title}</b>
                  <span>{s.type}</span>
                </div>
                {s.type.toLowerCase().includes("choice") || s.type.toLowerCase().includes("check") ? (
                  <CheckCircle2 size={14} />
                ) : null}
              </button>
            ))}

            <div className="chapter-label second">
              <ChevronRight size={14} />
              <span>CHAPTER 2</span>
              <button
                type="button"
                onClick={() => notify("Chapter 2 settings")}
                aria-label="Chapter options"
              >
                <MoreHorizontal size={15} />
              </button>
            </div>

            <button
              className="add-chapter"
              onClick={() => notify("New chapter added")}
              type="button"
            >
              <Plus size={14} />
              Add chapter
            </button>
          </div>

          <div className="outline-footer">
            <button
              onClick={() => notify("Layers panel toggled")}
              type="button"
            >
              <SquareStack size={15} />
              Layers
            </button>
            <button
              onClick={() => notify("3 reviewer comments pending")}
              type="button"
            >
              <MessageSquareText size={15} />
              Comments <span>3</span>
            </button>
          </div>
        </aside>

        {!leftOpen && (
          <button
            className="panel-reopen left"
            onClick={() => setLeftOpen(true)}
            title="Expand outline"
            type="button"
          >
            <PanelLeftOpen size={17} />
          </button>
        )}

        {/* CENTER PANEL: CANVAS */}
        <main className="canvas-area">
          <div className="canvas-toolbar">
            <div>
              <button
                className={`tool ${activeTool === "pointer" ? "active" : ""}`}
                onClick={() => setActiveTool("pointer")}
                title="Select tool"
                type="button"
              >
                <MousePointer2 size={16} />
              </button>
              <i />
              <button
                className={`tool ${activeTool === "text" ? "active" : ""}`}
                onClick={() => {
                  setActiveTool("text");
                  handleAddTextElement();
                }}
                title="Add text"
                type="button"
              >
                <AlignLeft size={16} />
              </button>
              <button
                className={`tool ${activeTool === "image" ? "active" : ""}`}
                onClick={() => {
                  setActiveTool("image");
                  handleAddImageElement();
                }}
                title="Add image"
                type="button"
              >
                <ImagePlus size={16} />
              </button>
              <button
                className={`tool ${activeTool === "video" ? "active" : ""}`}
                onClick={() => {
                  setActiveTool("video");
                  notify("Interactive video element ready");
                }}
                title="Interactive video tool"
                type="button"
              >
                <Video size={16} />
              </button>
              <button
                className={`tool ${activeTool === "question" ? "active" : ""}`}
                onClick={() => navigate("quiz")}
                title="Open quiz editor"
                type="button"
              >
                <SquareStack size={16} />
              </button>
              <button
                className={`tool ${activeTool === "ai" ? "active" : ""}`}
                onClick={() => notify("AI authoring assistant: 'Review hazards and generate questions'") }
                title="AI Authoring Assistant"
                type="button"
              >
                <BrainCircuit size={16} />
              </button>
            </div>

            <div>
              <span>{canvasZoom}</span>
              <button
                className="tool"
                onClick={() => {
                  const nextZoom =
                    canvasZoom === "50%"
                      ? "80%"
                      : canvasZoom === "80%"
                      ? "100%"
                      : canvasZoom === "100%"
                      ? "120%"
                      : "80%";
                  setCanvasZoom(nextZoom);
                }}
                title="Cycle zoom level"
                type="button"
              >
                <ChevronDown size={14} />
              </button>
              <i />
              <button
                className="tool"
                onClick={() => notify("Canvas display calibrated for 1080p rendering")}
                title="Display mode"
                type="button"
              >
                <Monitor size={16} />
              </button>
            </div>
          </div>

          <div className="canvas-stage">
            <div
              className="author-canvas"
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: "center center",
                transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <div className="canvas-header">
                <div className="canvas-logo">
                  <ShieldCheck size={18} />
                  <span>NORTHSTAR</span>
                </div>
                <span>WORKPLACE SAFETY · {String(currentSlide.num).padStart(2, "0")}</span>
              </div>

              <div className="canvas-content">
                <span className="lesson-label">LESSON 0{currentSlide.num}</span>
                <h1>{currentSlide.title}</h1>
                <p>{currentSlide.subtitle || "Learn how to spot common hazards before they lead to an incident."}</p>

                {/* Interactive Video Element Canvas */}
                <div
                  className="interactive-video selected-element"
                  style={{
                    borderRadius: `${activeElement.cornerRadius ?? 12}px`,
                    boxShadow: activeElement.showShadow ? "0 20px 40px rgba(0,0,0,0.4)" : "none",
                    border: activeElement.showBorder ? "2px solid #3b82f6" : "2px solid #2563eb",
                  }}
                >
                  <div className="video-scene">
                    <div className="scene-desk" />
                    <div className="scene-window" />
                    <div className="scene-person" />

                    {/* Hotspot Interactions */}
                    {(activeElement.hotspots || []).map((hs, idx) => {
                      const hotspotClass = idx === 0 ? "h1" : idx === 1 ? "h2" : idx === 2 ? "h3" : "";
                      return (
                        <button
                          key={hs.id}
                          className={`hotspot ${hotspotClass} ${selectedHotspotNum === hs.number ? "active" : ""}`}
                          onClick={() => handleHotspotClick(hs.number, hs.label)}
                          title={hs.label}
                          type="button"
                        >
                          {hs.number}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    className="play-button"
                    onClick={() => setPlaying(!playing)}
                    type="button"
                    aria-label={playing ? "Pause" : "Play"}
                  >
                    {playing ? (
                      <Pause size={22} fill="currentColor" />
                    ) : (
                      <Play size={22} fill="currentColor" />
                    )}
                  </button>

                  <div className="video-controls">
                    <span>{playing ? "00:18" : "00:00"}</span>
                    <div>
                      <i style={{ width: playing ? "34%" : "0%" }} />
                    </div>
                    <span>{activeElement.mediaDuration || "00:54"}</span>
                    <button
                      type="button"
                      onClick={() => notify("Video playback configuration")}
                      style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", display: "grid", placeItems: "center" }}
                    >
                      <Settings size={14} />
                    </button>
                  </div>

                  <div className="selection-label">{activeElement.name || "Interactive video"}</div>
                  <i className="handle tl" />
                  <i className="handle tr" />
                  <i className="handle bl" />
                  <i className="handle br" />
                </div>

                <div className="canvas-hint">
                  <MousePointer2 size={15} />
                  <span>Select each hotspot to explore the workspace interactions.</span>
                </div>
              </div>

              <div className="canvas-footer">
                <span
                  onClick={() => {
                    const currentIndex = slides.findIndex((s) => s.id === activeSlideId);
                    if (currentIndex > 0) setActiveSlideId(slides[currentIndex - 1].id);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  PREVIOUS
                </span>
                <div>
                  {slides.map((s) => (
                    <i
                      key={s.id}
                      className={s.id === activeSlideId ? "active" : ""}
                      onClick={() => setActiveSlideId(s.id)}
                      style={{ cursor: "pointer" }}
                    />
                  ))}
                </div>
                <span
                  onClick={() => {
                    const currentIndex = slides.findIndex((s) => s.id === activeSlideId);
                    if (currentIndex < slides.length - 1) setActiveSlideId(slides[currentIndex + 1].id);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  NEXT <ChevronRight size={13} />
                </span>
              </div>
            </div>
          </div>

          <div className="canvas-bottom">
            <span>
              Slide {currentSlide.num} of {slides.length}
            </span>
            <span>
              <ShieldCheck size={14} />
              Accessibility check: <b>{isAccessible ? "Passed" : "Action Needed"}</b>
            </span>
            <span>1920 × 1080</span>
          </div>
        </main>

        {/* RIGHT PANEL: PROPERTIES */}
        <aside className={`properties-panel ${rightOpen ? "" : "closed"}`}>
          <div className="editor-panel-head">
            <div>
              <b>{activeElement.name || "Interactive video"}</b>
              <span>Element properties</span>
            </div>
            <button
              className="icon-button"
              onClick={() => setRightOpen(false)}
              aria-label="Close properties"
              type="button"
            >
              <X size={17} />
            </button>
          </div>

          <div className="property-tabs">
            {(["General", "Style", "Behavior"] as EditorTab[]).map((t) => (
              <button
                className={rightTab === t ? "active" : ""}
                onClick={() => setRightTab(t)}
                key={t}
                type="button"
              >
                {t}
              </button>
            ))}
          </div>

          <div className="properties-scroll">
            {rightTab === "General" && (
              <>
                <PropertySection title="Video source">
                  <label>Media file</label>
                  <div className="media-input">
                    <div>
                      <Film size={18} />
                    </div>
                    <span>
                      <b>{activeElement.mediaFile || "office-safety.mp4"}</b>
                      <small>{activeElement.mediaDuration || "54 sec"} · {activeElement.mediaSize || "18.4 MB"}</small>
                    </span>
                    <button
                      type="button"
                      onClick={() => notify("Media asset picker opened")}
                    >
                      Replace
                    </button>
                  </div>
                  <label>Alternative text</label>
                  <textarea
                    value={activeElement.altText || ""}
                    onChange={(e) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        altText: e.target.value,
                      })
                    }
                    placeholder="Describe the visual content for screen readers."
                  />
                  <span className="field-help">
                    Describe the visual content for screen readers.
                  </span>
                </PropertySection>

                <PropertySection title="Playback">
                  <ToggleRow
                    label="Show controls"
                    checked={activeElement.showControls ?? true}
                    onChange={(val) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        showControls: val,
                      })
                    }
                  />
                  <ToggleRow
                    label="Autoplay"
                    checked={activeElement.autoplay ?? false}
                    onChange={(val) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        autoplay: val,
                      })
                    }
                  />
                  <ToggleRow
                    label="Allow seeking"
                    checked={activeElement.allowSeeking ?? true}
                    onChange={(val) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        allowSeeking: val,
                      })
                    }
                  />
                  <ToggleRow
                    label="Loop video"
                    checked={activeElement.loopVideo ?? false}
                    onChange={(val) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        loopVideo: val,
                      })
                    }
                  />
                </PropertySection>

                <PropertySection title="Interactive elements">
                  <div className="element-list">
                    {(activeElement.hotspots || []).map((hs) => (
                      <button
                        key={hs.id}
                        type="button"
                        onClick={() => setSelectedHotspotNum(hs.number)}
                        style={{
                          outline: selectedHotspotNum === hs.number ? "2px solid #2563eb" : "none",
                        }}
                      >
                        <span>{hs.number}</span>
                        <b>{hs.label}</b>
                        <GripVertical size={14} />
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn secondary full"
                    onClick={handleAddHotspotClick}
                    type="button"
                  >
                    <Plus size={14} />
                    Add interaction
                  </button>
                </PropertySection>
              </>
            )}

            {rightTab === "Style" && (
              <>
                <PropertySection title="Layout">
                  <label>Width</label>
                  <div className="input-with-unit">
                    <input
                      value={activeElement.width ?? 920}
                      onChange={(e) =>
                        updateSlideElement(currentSlide.id, activeElement.id, {
                          width: parseInt(e.target.value, 10) || 920,
                        })
                      }
                    />
                    <span>px</span>
                  </div>
                  <label>Corner radius</label>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    value={activeElement.cornerRadius ?? 12}
                    onChange={(e) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        cornerRadius: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </PropertySection>

                <PropertySection title="Appearance">
                  <ToggleRow
                    label="Show video shadow"
                    checked={activeElement.showShadow ?? true}
                    onChange={(val) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        showShadow: val,
                      })
                    }
                  />
                  <ToggleRow
                    label="Show border"
                    checked={activeElement.showBorder ?? false}
                    onChange={(val) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        showBorder: val,
                      })
                    }
                  />
                  <label>Overlay color</label>
                  <div className="color-input">
                    <i style={{ backgroundColor: activeElement.overlayColor || "#0F172A" }} />
                    <span>{activeElement.overlayColor || "#0F172A"}</span>
                  </div>
                </PropertySection>
              </>
            )}

            {rightTab === "Behavior" && (
              <>
                <PropertySection title="Completion">
                  <label>Mark complete when</label>
                  <select
                    value={activeElement.completionCriteria || "viewed"}
                    onChange={(e) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        completionCriteria: e.target.value as "viewed" | "interactions",
                      })
                    }
                  >
                    <option value="viewed">90% of video is viewed</option>
                    <option value="interactions">All interactions completed</option>
                  </select>
                  <ToggleRow
                    label="Require all hotspots"
                    checked={activeElement.requireAllHotspots ?? true}
                    onChange={(val) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        requireAllHotspots: val,
                      })
                    }
                  />
                </PropertySection>

                <PropertySection title="Scoring">
                  <ToggleRow
                    label="Include in score"
                    checked={activeElement.includeInScore ?? false}
                    onChange={(val) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        includeInScore: val,
                      })
                    }
                  />
                  <label>Points available</label>
                  <input
                    value={activeElement.points ?? 3}
                    onChange={(e) =>
                      updateSlideElement(currentSlide.id, activeElement.id, {
                        points: parseInt(e.target.value, 10) || 0,
                      })
                    }
                  />
                </PropertySection>
              </>
            )}
          </div>
        </aside>

        {!rightOpen && (
          <button
            className="panel-reopen right"
            onClick={() => setRightOpen(true)}
            title="Expand properties"
            type="button"
          >
            <SlidersHorizontal size={17} />
          </button>
        )}
      </div>

      <div className="editor-mobile-bar">
        <button onClick={() => setLeftOpen(!leftOpen)} type="button">
          <List size={18} />
          Outline
        </button>
        <button
          onClick={() => {
            saveCurrentProject();
            notify("Changes saved successfully");
          }}
          type="button"
        >
          <Check size={18} />
          Save
        </button>
        <button onClick={() => setRightOpen(!rightOpen)} type="button">
          <SlidersHorizontal size={18} />
          Properties
        </button>
      </div>
    </div>
  );
}
