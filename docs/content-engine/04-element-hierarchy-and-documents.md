# Element Hierarchy & Document Management

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.3 — Course Authoring, Content Projects & Interactive Content Engine  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. ContentDocument & Element Relationship

A `ContentProject` contains a `ContentDocument` that defines global presentation metadata, audio settings, and theme variants. The document acts as the container for a tree of `ContentElement` records:

```
ContentProject
  |
  +--> ContentDocument (Settings, Theme, Audio, Metadata)
         |
         +--> ContentElement (CHAPTER)
                |
                +--> ContentElement (SLIDE)
                       |
                       +--> ContentElement (QUESTION)
                       +--> ContentElement (HOTSPOT)
                       +--> ContentElement (MEDIA)
```

---

## 2. Element Types & Configurations

| Element Type | Role in Hierarchy | Configuration Schema Sample |
| :--- | :--- | :--- |
| `CHAPTER` | Structural divider | `{"expanded": true, "icon": "book"}` |
| `SLIDE` | Canvas viewport | `{"background": "#1e293b", "duration": 45, "elements": []}` |
| `QUESTION` | Assessment item | `{"questionText": "...", "options": [...], "points": 10}` |
| `HOTSPOT` | Clickable hotspot | `{"top": "45%", "left": "62%", "label": "Pressure Valve"}` |
| `MEDIA` | Embedded asset | `{"mediaUrl": "...", "type": "video", "autoplay": false}` |
| `INTERACTION` | Interactive trigger | `{"trigger": "click", "action": "openModal"}` |

---

## 3. Element Operations

### 3.1 Hierarchical Creation
When adding an element via `ContentService.createElement`, if a `parentId` is specified, the service strictly validates that the parent element belongs to the exact same `contentProjectId`. Cross-project element nesting is rejected.

### 3.2 Batch Reordering
Instructional designers drag and drop slides and questions in the UI. `ContentService.reorderElements` executes an atomic transaction updating the `orderIndex` and `parentId` across all provided element IDs in a single database round-trip.

### 3.3 Cascading Deletion
Deleting a parent slide or chapter automatically deletes all nested questions, hotspots, and media via PostgreSQL's `onDelete: Cascade` foreign key relationship.
