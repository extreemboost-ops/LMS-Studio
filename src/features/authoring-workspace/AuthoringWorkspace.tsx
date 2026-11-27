import { useState, useEffect, useRef } from "react";
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
    updateSlide,
    deleteSlide,
    reorderSlides,
    activeElementId,
    setActiveElementId,
    updateSlideElement,
    addSlideElement,
    removeSlideElement,
    addHotspot,
    updateHotspot,
    removeHotspot,
    addMediaAsset,
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
  const [draggedSlideId, setDraggedSlideId] = useState<string | null>(null);
  const mediaInputRef = useRef<HTMLInputElement | null>(null);

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

  // Keyboard shortcut integration (Ctrl+Z, Ctrl+Y, Ctrl+S, Delete/Backspace, Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveCurrentProject();
        notify("Project saved successfully");
        return;
      }

      if (isTyping) return;

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
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (activeElementId && currentSlide.elements.length > 0) {
          e.preventDefault();
          removeSlideElement(currentSlide.id, activeElementId);
          notify("Selected element deleted");
        }
      } else if (e.key === "Escape") {
        setSelectedHotspotNum(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canUndo,
    canRedo,
    undo,
    redo,
    saveCurrentProject,
    notify,
    activeElementId,
    currentSlide.id,
    currentSlide.elements.length,
    removeSlideElement,
  ]);

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
    notify("Image element added to slide");
  };

  const handleAddVideoElement = () => {
    const newEl: SlideElement = {
      id: `elem-${Date.now()}`,
      type: "video",
      name: "Interactive video",
      mediaFile: "training-video.mp4",
      mediaDuration: "01:00",
      mediaSize: "12.0 MB",
      altText: "Interactive instructional video",
      showControls: true,
      autoplay: false,
      allowSeeking: true,
      loopVideo: false,
      width: 720,
      cornerRadius: 12,
      showShadow: true,
      hotspots: [
        { id: `hs-${Date.now()}`, number: 1, label: "Hotspot 1 · Key point", left: "30%", top: "45%" },
      ],
    };
    addSlideElement(currentSlide.id, newEl);
    setActiveTool("pointer");
    notify("Interactive video added to slide");
  };

  const handleReplaceMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const asset = addMediaAsset(file);
    updateSlideElement(currentSlide.id, activeElement.id, {
      mediaFile: file.name,
      mediaSize: asset.size,
      mediaUrl: asset.url,
    });
    notify(`Replaced media with ${file.name}`);
    e.target.value = "";
  };

  const handleCanvasFileDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files[0];
    const asset = addMediaAsset(file);
    if (asset.type === "video") {
      addSlideElement(currentSlide.id, {
        id: `elem-${Date.now()}`,
        type: "video",
        name: file.name,
        mediaFile: file.name,
        mediaUrl: asset.url,
        mediaSize: asset.size,
        altText: `Video: ${file.name}`,
        showControls: true,
        width: 720,
        cornerRadius: 12,
        showShadow: true,
        hotspots: [],
      });
      notify(`Added video “${file.name}” to slide`);
    } else if (asset.type === "image") {
      addSlideElement(currentSlide.id, {
        id: `elem-${Date.now()}`,
        type: "image",
        name: file.name,
        mediaFile: file.name,
        mediaUrl: asset.url,
        mediaSize: asset.size,
        altText: `Image: ${file.name}`,
        width: 520,
        cornerRadius: 8,
        showShadow: true,
      });
      notify(`Added image “${file.name}” to slide`);
    }
  };

  const startResizeElement = (e: React.MouseEvent, el: SlideElement) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = el.width ?? 680;

    const onMove = (moveEvent: MouseEvent) => {
      const delta = (moveEvent.clientX - startX) / zoomScale;
      const nextWidth = Math.max(260, Math.min(920, Math.round(startWidth + delta)));
      updateSlideElement(currentSlide.id, el.id, { width: nextWidth });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const startDragHotspot = (
    e: React.MouseEvent,
    elId: string,
    hsId: string,
    hsNum: number,
    hsLabel: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedHotspotNum(hsNum);
    const container = (e.currentTarget as HTMLElement).parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();

    const onMove = (moveEvent: MouseEvent) => {
      const xPct = Math.max(5, Math.min(95, Math.round(((moveEvent.clientX - rect.left) / rect.width) * 100)));
      const yPct = Math.max(5, Math.min(95, Math.round(((moveEvent.clientY - rect.top) / rect.height) * 100)));
      updateHotspot(currentSlide.id, elId, hsId, { left: `${xPct}%`, top: `${yPct}%` });
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      notify(`Updated position for ${hsLabel}`);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const selectedHotspot = (activeElement.hotspots || []).find(
    (hs) => hs.number === selectedHotspotNum
  );

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
                draggable
                onDragStart={() => setDraggedSlideId(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedSlideId && draggedSlideId !== s.id) {
                    reorderSlides(draggedSlideId, s.id);
                    notify(`Moved "${s.title}"`);
                  }
                  setDraggedSlideId(null);
                }}
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
                  handleAddVideoElement();
                }}
                title="Add interactive video"
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

          <div
            className="canvas-stage"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasFileDrop}
          >
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
                <input
                  value={currentSlide.title}
                  onChange={(e) => updateSlide(currentSlide.id, { title: e.target.value })}
                  aria-label="Slide title"
                  style={{
                    width: "100%",
                    border: "1px dashed transparent",
                    background: "transparent",
                    fontSize: "24px",
                    fontWeight: 700,
                    color: "#0f172a",
                    padding: "2px 4px",
                    marginLeft: "-4px",
                    borderRadius: "6px",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#93c5fd")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />
                <input
                  value={
                    currentSlide.subtitle ??
                    "Learn how to spot common hazards before they lead to an incident."
                  }
                  onChange={(e) => updateSlide(currentSlide.id, { subtitle: e.target.value })}
                  aria-label="Slide subtitle"
                  placeholder="Enter slide subtitle or learning objective..."
                  style={{
                    width: "100%",
                    border: "1px dashed transparent",
                    background: "transparent",
                    fontSize: "13px",
                    color: "#64748b",
                    padding: "2px 4px",
                    marginLeft: "-4px",
                    marginBottom: "10px",
                    borderRadius: "6px",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#93c5fd")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "transparent")}
                />

                {/* Render all elements on current slide */}
                {currentSlide.elements.length === 0 ? (
                  <div
                    style={{
                      padding: "36px 20px",
                      border: "2px dashed #cbd5e1",
                      borderRadius: "12px",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: "13px",
                    }}
                  >
                    This slide has no elements yet. Use the toolbar above to add a Text block, Image, or Interactive Video.
                  </div>
                ) : (
                  currentSlide.elements.map((el) => {
                    const isSelected = el.id === activeElement.id;

                    if (el.type === "text") {
                      return (
                        <div
                          key={el.id}
                          onClick={() => setActiveElementId(el.id)}
                          style={{
                            position: "relative",
                            width: el.width ? `${Math.min(el.width, 920)}px` : "100%",
                            maxWidth: "100%",
                            padding: "14px 16px",
                            marginBottom: "12px",
                            borderRadius: `${el.cornerRadius ?? 8}px`,
                            border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            background: "#ffffff",
                            boxShadow: el.showShadow ? "0 8px 24px rgba(15,23,42,0.08)" : "none",
                            cursor: "pointer",
                          }}
                        >
                          <textarea
                            value={el.textContent || ""}
                            onChange={(e) =>
                              updateSlideElement(currentSlide.id, el.id, {
                                textContent: e.target.value,
                              })
                            }
                            placeholder="Type slide text content here..."
                            rows={3}
                            style={{
                              width: "100%",
                              border: "none",
                              outline: "none",
                              resize: "vertical",
                              fontSize: "14px",
                              lineHeight: 1.5,
                              color: "#1e293b",
                              background: "transparent",
                              fontFamily: "inherit",
                            }}
                          />
                          {isSelected && (
                            <i
                              className="handle br"
                              onMouseDown={(e) => startResizeElement(e, el)}
                              style={{ cursor: "nwse-resize" }}
                              title="Drag to resize width"
                            />
                          )}
                        </div>
                      );
                    }

                    if (el.type === "image") {
                      return (
                        <div
                          key={el.id}
                          onClick={() => setActiveElementId(el.id)}
                          style={{
                            position: "relative",
                            width: el.width ? `${Math.min(el.width, 920)}px` : "100%",
                            maxWidth: "100%",
                            padding: el.mediaUrl ? "8px" : "18px",
                            marginBottom: "12px",
                            borderRadius: `${el.cornerRadius ?? 8}px`,
                            border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            background: "#f8fafc",
                            boxShadow: el.showShadow ? "0 8px 24px rgba(15,23,42,0.08)" : "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            cursor: "pointer",
                          }}
                        >
                          {el.mediaUrl ? (
                            <img
                              src={el.mediaUrl}
                              alt={el.altText || el.name}
                              style={{
                                width: "100%",
                                maxHeight: "260px",
                                objectFit: "contain",
                                borderRadius: `${Math.max(0, (el.cornerRadius ?? 8) - 4)}px`,
                              }}
                            />
                          ) : (
                            <>
                              <ImagePlus size={22} color="#2563eb" />
                              <div style={{ flex: 1 }}>
                                <b style={{ fontSize: "13px", display: "block", color: "#0f172a" }}>
                                  {el.name} ({el.mediaFile || "image.png"})
                                </b>
                                <small style={{ fontSize: "12px", color: "#64748b" }}>
                                  {el.altText || "Click to edit image properties on the right panel"}
                                </small>
                              </div>
                            </>
                          )}
                          {isSelected && (
                            <i
                              className="handle br"
                              onMouseDown={(e) => startResizeElement(e, el)}
                              style={{ cursor: "nwse-resize" }}
                              title="Drag to resize width"
                            />
                          )}
                        </div>
                      );
                    }

                    // Default: Interactive Video Element Canvas
                    return (
                      <div
                        key={el.id}
                        onClick={() => setActiveElementId(el.id)}
                        className={`interactive-video ${isSelected ? "selected-element" : ""}`}
                        style={{
                          width: el.width ? `${Math.min(el.width, 920)}px` : undefined,
                          maxWidth: "100%",
                          borderRadius: `${el.cornerRadius ?? 12}px`,
                          boxShadow: el.showShadow ? "0 20px 40px rgba(0,0,0,0.4)" : "none",
                          border: isSelected
                            ? "2px solid #2563eb"
                            : el.showBorder
                            ? "2px solid #3b82f6"
                            : "none",
                          marginBottom: "12px",
                        }}
                      >
                        <div className="video-scene">
                          {el.mediaUrl ? (
                            <video
                              src={el.mediaUrl}
                              controls={el.showControls ?? true}
                              autoPlay={el.autoplay ?? false}
                              loop={el.loopVideo ?? false}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                position: "relative",
                                zIndex: 1,
                              }}
                            />
                          ) : (
                            <>
                              <div className="scene-desk" />
                              <div className="scene-window" />
                              <div className="scene-person" />
                            </>
                          )}

                          {(el.hotspots || []).map((hs, idx) => {
                            const hotspotClass =
                              idx === 0 ? "h1" : idx === 1 ? "h2" : idx === 2 ? "h3" : "";
                            return (
                              <button
                                key={hs.id}
                                className={`hotspot ${hotspotClass} ${
                                  selectedHotspotNum === hs.number ? "active" : ""
                                }`}
                                style={{
                                  ...(hs.left || hs.top
                                    ? { left: hs.left || "45%", top: hs.top || "45%" }
                                    : {}),
                                  zIndex: 5,
                                  cursor: "grab",
                                }}
                                onMouseDown={(e) =>
                                  startDragHotspot(e, el.id, hs.id, hs.number, hs.label)
                                }
                                title={`${hs.label} (drag to move)`}
                                type="button"
                              >
                                {hs.number}
                              </button>
                            );
                          })}
                        </div>

                        {!el.mediaUrl && (
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
                        )}

                        {!el.mediaUrl && (el.showControls ?? true) && (
                          <div className="video-controls">
                            <span>{playing ? "00:18" : "00:00"}</span>
                            <div>
                              <i style={{ width: playing ? "34%" : "0%" }} />
                            </div>
                            <span>{el.mediaDuration || "00:54"}</span>
                            <button
                              type="button"
                              onClick={() => setRightOpen(true)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "inherit",
                                cursor: "pointer",
                                display: "grid",
                                placeItems: "center",
                              }}
                            >
                              <Settings size={14} />
                            </button>
                          </div>
                        )}

                        {isSelected && (
                          <>
                            <div className="selection-label">{el.name || "Interactive video"}</div>
                            <i className="handle tl" onMouseDown={(e) => startResizeElement(e, el)} />
                            <i className="handle tr" onMouseDown={(e) => startResizeElement(e, el)} />
                            <i className="handle bl" onMouseDown={(e) => startResizeElement(e, el)} />
                            <i className="handle br" onMouseDown={(e) => startResizeElement(e, el)} title="Drag to resize" />
                          </>
                        )}
                      </div>
                    );
                  })
                )}

                <div className="canvas-hint">
                  <MousePointer2 size={15} />
                  <span>Click any title, text block, or hotspot to edit directly.</span>
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

          <input
            ref={mediaInputRef}
            type="file"
            accept="video/*,image/*,audio/*"
            style={{ display: "none" }}
            onChange={handleReplaceMedia}
          />

          <div className="properties-scroll">
            {rightTab === "General" && (
              <>
                <PropertySection title="Slide details">
                  <label>Slide title</label>
                  <input
                    value={currentSlide.title}
                    onChange={(e) => updateSlide(currentSlide.id, { title: e.target.value })}
                  />
                  <label>Slide subtitle</label>
                  <input
                    value={currentSlide.subtitle || ""}
                    placeholder="Learning objective or summary"
                    onChange={(e) => updateSlide(currentSlide.id, { subtitle: e.target.value })}
                  />
                </PropertySection>

                {activeElement.type === "text" ? (
                  <PropertySection title="Text block">
                    <label>Element name</label>
                    <input
                      value={activeElement.name || ""}
                      onChange={(e) =>
                        updateSlideElement(currentSlide.id, activeElement.id, {
                          name: e.target.value,
                        })
                      }
                    />
                    <label>Text content</label>
                    <textarea
                      rows={5}
                      value={activeElement.textContent || ""}
                      onChange={(e) =>
                        updateSlideElement(currentSlide.id, activeElement.id, {
                          textContent: e.target.value,
                        })
                      }
                      placeholder="Enter text content..."
                    />
                    <button
                      type="button"
                      className="btn secondary full"
                      onClick={() => {
                        removeSlideElement(currentSlide.id, activeElement.id);
                        notify("Element removed");
                      }}
                    >
                      <Trash2 size={14} /> Remove text block
                    </button>
                  </PropertySection>
                ) : activeElement.type === "image" ? (
                  <PropertySection title="Image source">
                    <label>Element name</label>
                    <input
                      value={activeElement.name || ""}
                      onChange={(e) =>
                        updateSlideElement(currentSlide.id, activeElement.id, {
                          name: e.target.value,
                        })
                      }
                    />
                    <label>Image file</label>
                    <div className="media-input">
                      <div>
                        <ImagePlus size={18} />
                      </div>
                      <span>
                        <b>{activeElement.mediaFile || "image.png"}</b>
                        <small>{activeElement.mediaSize || "Ready"}</small>
                      </span>
                      <button type="button" onClick={() => mediaInputRef.current?.click()}>
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
                    />
                    <button
                      type="button"
                      className="btn secondary full"
                      onClick={() => {
                        removeSlideElement(currentSlide.id, activeElement.id);
                        notify("Image removed");
                      }}
                    >
                      <Trash2 size={14} /> Remove image
                    </button>
                  </PropertySection>
                ) : (
                  <>
                    <PropertySection title="Video source">
                      <label>Media file</label>
                      <div className="media-input">
                        <div>
                          <Film size={18} />
                        </div>
                        <span>
                          <b>{activeElement.mediaFile || "office-safety.mp4"}</b>
                          <small>
                            {activeElement.mediaDuration || "54 sec"} ·{" "}
                            {activeElement.mediaSize || "18.4 MB"}
                          </small>
                        </span>
                        <button type="button" onClick={() => mediaInputRef.current?.click()}>
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
                              outline:
                                selectedHotspotNum === hs.number ? "2px solid #2563eb" : "none",
                            }}
                          >
                            <span>{hs.number}</span>
                            <b>{hs.label}</b>
                            <GripVertical size={14} />
                          </button>
                        ))}
                      </div>

                      {selectedHotspot && (
                        <div
                          style={{
                            marginTop: "10px",
                            padding: "10px",
                            borderRadius: "8px",
                            background: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <label>Hotspot {selectedHotspot.number} label</label>
                          <input
                            value={selectedHotspot.label}
                            onChange={(e) =>
                              updateHotspot(currentSlide.id, activeElement.id, selectedHotspot.id, {
                                label: e.target.value,
                              })
                            }
                          />
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                            <label>
                              <small>Left %</small>
                              <input
                                value={selectedHotspot.left || "50%"}
                                onChange={(e) =>
                                  updateHotspot(
                                    currentSlide.id,
                                    activeElement.id,
                                    selectedHotspot.id,
                                    { left: e.target.value }
                                  )
                                }
                              />
                            </label>
                            <label>
                              <small>Top %</small>
                              <input
                                value={selectedHotspot.top || "50%"}
                                onChange={(e) =>
                                  updateHotspot(
                                    currentSlide.id,
                                    activeElement.id,
                                    selectedHotspot.id,
                                    { top: e.target.value }
                                  )
                                }
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            className="btn secondary full"
                            onClick={() => {
                              removeHotspot(currentSlide.id, activeElement.id, selectedHotspot.id);
                              setSelectedHotspotNum(null);
                              notify(`Hotspot ${selectedHotspot.number} deleted`);
                            }}
                          >
                            <Trash2 size={13} /> Delete hotspot
                          </button>
                        </div>
                      )}

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
