import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from "react";
import type { ContentProject } from "../types/content.types";
import type { Slide, SlideElement, Hotspot, EditorSyncStatus } from "../types/editor.types";
import type { Question } from "../types/quiz.types";
import type { MediaAsset } from "../types/media.types";
import type { LMSIntegration, SyncActivity } from "../types/integration.types";
import { initialProjects, initialSlides, initialQuestions } from "../mocks/content.mock";
import { initialMediaAssets } from "../mocks/media.mock";
import { initialLMSIntegrations, initialSyncActivities } from "../mocks/integration.mock";
import { EditorSyncService } from "../services/editor-sync.service";

interface ContentContextValue {
  projects: ContentProject[];
  activeProject: ContentProject;
  slides: Slide[];
  activeSlideId: string;
  activeElementId: string | null;
  questions: Question[];
  activeQuestionId: number;
  mediaItems: MediaAsset[];
  integrations: LMSIntegration[];
  syncActivities: SyncActivity[];
  saveStatus: EditorSyncStatus;
  canUndo: boolean;
  canRedo: boolean;

  // Projects
  setActiveProjectById: (id: string) => void;
  updateActiveProject: (updates: Partial<ContentProject>) => void;
  createProject: (template: { title: string; type: string; color: string }) => ContentProject;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  saveCurrentProject: () => Promise<void>;

  // Slides & Canvas Elements
  setActiveSlideId: (id: string) => void;
  setActiveElementId: (id: string | null) => void;
  addSlide: () => void;
  updateSlide: (id: string, updates: Partial<Slide>) => void;
  deleteSlide: (id: string) => void;
  updateSlideElement: (slideId: string, elementId: string, updates: Partial<SlideElement>) => void;
  addSlideElement: (slideId: string, element: SlideElement) => void;
  removeSlideElement: (slideId: string, elementId: string) => void;

  // Hotspots
  addHotspot: (slideId: string, elementId: string) => void;
  updateHotspot: (slideId: string, elementId: string, hotspotId: string, updates: Partial<Hotspot>) => void;
  removeHotspot: (slideId: string, elementId: string, hotspotId: string) => void;

  // History Stack
  undo: () => void;
  redo: () => void;

  // Quiz Questions
  setActiveQuestionId: (id: number) => void;
  addQuestion: () => void;
  duplicateQuestion: (id: number) => void;
  updateQuestion: (id: number, updates: Partial<Question>) => void;
  deleteQuestion: (id: number) => void;

  // Media & Integrations
  addMediaAsset: (file: File) => void;
  toggleLMSConnection: (id: string) => void;
}

const ContentContext = createContext<ContentContextValue | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ContentProject[]>(initialProjects);
  const [activeProject, setActiveProject] = useState<ContentProject>(initialProjects[0]);
  const [slides, setSlides] = useState<Slide[]>(initialSlides);
  const [activeSlideId, setActiveSlideId] = useState<string>("slide-2");
  const [activeElementId, setActiveElementId] = useState<string | null>("elem-1");
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [activeQuestionId, setActiveQuestionId] = useState<number>(1);
  const [mediaItems, setMediaItems] = useState<MediaAsset[]>(initialMediaAssets);
  const [integrations, setIntegrations] = useState<LMSIntegration[]>(initialLMSIntegrations);
  const [syncActivities, setSyncActivities] = useState<SyncActivity[]>(initialSyncActivities);
  const [saveStatus, setSaveStatus] = useState<EditorSyncStatus>("saved");

  // History stacks
  const [undoStack, setUndoStack] = useState<Slide[][]>([]);
  const [redoStack, setRedoStack] = useState<Slide[][]>([]);
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to record history before mutating slides
  const pushHistory = (currentSlides: Slide[]) => {
    setUndoStack((prev) => [...prev.slice(-25), currentSlides]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [slides, ...prev]);
    setSlides(previous);
    triggerAutosave();
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setUndoStack((prev) => [...prev, slides]);
    setSlides(next);
    triggerAutosave();
  };

  // Debounced autosave
  const triggerAutosave = () => {
    setSaveStatus("saving");
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(async () => {
      try {
        await EditorSyncService.saveProject(activeProject.id, {
          title: activeProject.title,
          status: activeProject.status,
          slides,
        });
        setSaveStatus("saved");
      } catch {
        setSaveStatus("saved"); // gracefully fall back
      }
    }, 800);
  };

  const saveCurrentProject = async () => {
    setSaveStatus("saving");
    try {
      await EditorSyncService.saveProject(activeProject.id, {
        title: activeProject.title,
        status: activeProject.status,
        slides,
      });
      setSaveStatus("saved");
    } catch {
      setSaveStatus("saved");
    }
  };

  const setActiveProjectById = (id: string) => {
    const found = projects.find((p) => p.id === id);
    if (found) {
      setActiveProject(found);
    }
  };

  const updateActiveProject = (updates: Partial<ContentProject>) => {
    setActiveProject((prev) => {
      const updated = { ...prev, ...updates };
      setProjects((list) => list.map((p) => (p.id === prev.id ? updated : p)));
      return updated;
    });
    triggerAutosave();
  };

  const createProject = (template: { title: string; type: string; color: string }) => {
    const newProj: ContentProject = {
      id: `proj-${Date.now()}`,
      title: template.title,
      type: template.type,
      status: "Draft",
      date: "Just now",
      owner: "You",
      progress: 0,
      color: template.color || "safety",
      version: 1,
    };
    setProjects((prev) => [newProj, ...prev]);
    setActiveProject(newProj);
    return newProj;
  };

  const duplicateProject = (id: string) => {
    const source = projects.find((p) => p.id === id);
    if (!source) return;
    const clone: ContentProject = {
      ...source,
      id: `proj-${Date.now()}`,
      title: `${source.title} (Copy)`,
      status: "Draft",
      date: "Just now",
      owner: "You",
      progress: 0,
    };
    setProjects((prev) => [clone, ...prev]);
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    if (activeProject.id === id && projects.length > 1) {
      const remaining = projects.filter((p) => p.id !== id);
      setActiveProject(remaining[0]);
    }
  };

  const addSlide = () => {
    pushHistory(slides);
    const num = slides.length + 1;
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      chapterId: "ch-1",
      num,
      title: `Lesson 0${num} · New topic`,
      type: "Course slide",
      elements: [
        {
          id: `elem-${Date.now()}`,
          type: "text",
          name: "Text Block",
          textContent: "Double click to edit this text content.",
        },
      ],
    };
    setSlides((prev) => [...prev, newSlide]);
    setActiveSlideId(newSlide.id);
    setActiveElementId(newSlide.elements[0].id);
    triggerAutosave();
  };

  const updateSlide = (id: string, updates: Partial<Slide>) => {
    pushHistory(slides);
    setSlides((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    triggerAutosave();
  };

  const deleteSlide = (id: string) => {
    if (slides.length <= 1) return;
    pushHistory(slides);
    const filtered = slides.filter((s) => s.id !== id);
    setSlides(filtered);
    if (activeSlideId === id) {
      setActiveSlideId(filtered[0].id);
    }
    triggerAutosave();
  };

  const updateSlideElement = (
    slideId: string,
    elementId: string,
    updates: Partial<SlideElement>
  ) => {
    pushHistory(slides);
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        return {
          ...s,
          elements: s.elements.map((el) => (el.id === elementId ? { ...el, ...updates } : el)),
        };
      })
    );
    triggerAutosave();
  };

  const addSlideElement = (slideId: string, element: SlideElement) => {
    pushHistory(slides);
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        return { ...s, elements: [...s.elements, element] };
      })
    );
    setActiveElementId(element.id);
    triggerAutosave();
  };

  const removeSlideElement = (slideId: string, elementId: string) => {
    pushHistory(slides);
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        return { ...s, elements: s.elements.filter((el) => el.id !== elementId) };
      })
    );
    setActiveElementId(null);
    triggerAutosave();
  };

  const addHotspot = (slideId: string, elementId: string) => {
    pushHistory(slides);
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        return {
          ...s,
          elements: s.elements.map((el) => {
            if (el.id !== elementId) return el;
            const currentHotspots = el.hotspots || [];
            const nextNum = currentHotspots.length + 1;
            const newHotspot: Hotspot = {
              id: `hs-${Date.now()}`,
              number: nextNum,
              label: `Hotspot ${nextNum} · Interaction zone`,
              description: `Description for interactive hotspot ${nextNum}`,
              top: `${Math.min(80, 20 + nextNum * 15)}%`,
              left: `${Math.min(80, 25 + nextNum * 15)}%`,
            };
            return {
              ...el,
              hotspots: [...currentHotspots, newHotspot],
            };
          }),
        };
      })
    );
    triggerAutosave();
  };

  const updateHotspot = (
    slideId: string,
    elementId: string,
    hotspotId: string,
    updates: Partial<Hotspot>
  ) => {
    pushHistory(slides);
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        return {
          ...s,
          elements: s.elements.map((el) => {
            if (el.id !== elementId) return el;
            return {
              ...el,
              hotspots: (el.hotspots || []).map((h) =>
                h.id === hotspotId ? { ...h, ...updates } : h
              ),
            };
          }),
        };
      })
    );
    triggerAutosave();
  };

  const removeHotspot = (slideId: string, elementId: string, hotspotId: string) => {
    pushHistory(slides);
    setSlides((prev) =>
      prev.map((s) => {
        if (s.id !== slideId) return s;
        return {
          ...s,
          elements: s.elements.map((el) => {
            if (el.id !== elementId) return el;
            return {
              ...el,
              hotspots: (el.hotspots || []).filter((h) => h.id !== hotspotId),
            };
          }),
        };
      })
    );
    triggerAutosave();
  };

  const addQuestion = () => {
    const nextId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;
    const newQ: Question = {
      id: nextId,
      title: "Untitled question",
      type: "Multiple choice",
      points: 2,
      explanation: "Add explanation text for learners.",
      correctFeedback: "Correct! That is the right response.",
      options: [
        { id: `opt-${nextId}-1`, text: "Option A", isCorrect: true },
        { id: `opt-${nextId}-2`, text: "Option B", isCorrect: false },
      ],
    };
    setQuestions((prev) => [...prev, newQ]);
    setActiveQuestionId(nextId);
  };

  const duplicateQuestion = (id: number) => {
    const target = questions.find((q) => q.id === id);
    if (!target) return;
    const nextId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) + 1 : 1;
    const duplicated: Question = {
      ...target,
      id: nextId,
      title: `${target.title} (Copy)`,
      options: target.options.map((opt, idx) => ({
        ...opt,
        id: `opt-${nextId}-${idx + 1}-${Date.now()}`,
      })),
    };
    setQuestions((prev) => [...prev, duplicated]);
    setActiveQuestionId(nextId);
  };

  const updateQuestion = (id: number, updates: Partial<Question>) => {
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const deleteQuestion = (id: number) => {
    if (questions.length <= 1) return;
    const filtered = questions.filter((q) => q.id !== id);
    setQuestions(filtered);
    if (activeQuestionId === id) {
      setActiveQuestionId(filtered[0].id);
    }
  };

  const addMediaAsset = (file: File) => {
    const newAsset: MediaAsset = {
      id: `m-${Date.now()}`,
      name: file.name,
      type: file.type.includes("video")
        ? "video"
        : file.type.includes("image")
          ? "image"
          : file.type.includes("audio")
            ? "audio"
            : "document",
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      uploadedAt: "Just now",
    };
    setMediaItems((prev) => [newAsset, ...prev]);
  };

  const toggleLMSConnection = (id: string) => {
    setIntegrations((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const isConnected = item.status === "Connected";
          return {
            ...item,
            status: isConnected ? "Disconnected" : "Connected",
            health: isConnected ? undefined : "Healthy",
            lastSync: isConnected ? undefined : "Just now",
            itemsSynced: isConnected ? 0 : 24,
          };
        }
        return item;
      })
    );
  };

  return (
    <ContentContext.Provider
      value={{
        projects,
        activeProject,
        slides,
        activeSlideId,
        activeElementId,
        questions,
        activeQuestionId,
        mediaItems,
        integrations,
        syncActivities,
        saveStatus,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        setActiveProjectById,
        updateActiveProject,
        createProject,
        duplicateProject,
        deleteProject,
        saveCurrentProject,
        setActiveSlideId,
        setActiveElementId,
        addSlide,
        updateSlide,
        deleteSlide,
        updateSlideElement,
        addSlideElement,
        removeSlideElement,
        addHotspot,
        updateHotspot,
        removeHotspot,
        undo,
        redo,
        setActiveQuestionId,
        addQuestion,
        duplicateQuestion,
        updateQuestion,
        deleteQuestion,
        addMediaAsset,
        toggleLMSConnection,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
}

export function useContent(): ContentContextValue {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error("useContent must be used within a ContentProvider");
  }
  return context;
}
