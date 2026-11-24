# Interactive Content Projects Engine

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.3 — Course Authoring, Content Projects & Interactive Content Engine  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Content Project Domain Architecture

A `ContentProject` is an interactive instructional design project capable of running natively in the browser, inside H5P players, or exported as SCORM 1.2 / 2004 e-learning packages.

### 1.1 Supported Content Types (`ProjectContentType`)

| Content Type Enum | Display Name | Instructional Pattern |
| :--- | :--- | :--- |
| `PRESENTATION` | Course Presentation | Multi-slide interactive presentation with embedded questions, audio, and media |
| `INTERACTIVE_VIDEO` | Interactive Video | Video stream with timed popup interactions, hotspots, and knowledge checks |
| `INTERACTIVE_BOOK` | Interactive Book | Multi-chapter e-book containing rich text, multimedia, and quizzes |
| `QUESTION_SET` | Question Set | Graded assessment consisting of multiple sequential questions |
| `MULTI_CHOICE` | Multiple Choice | Single-question standalone quiz interaction |
| `DRAG_DROP` | Drag and Drop | Spatial drag-and-drop question with drop zones |
| `FILL_BLANKS` | Fill in the Blanks | Cloze test requiring text input or selection |
| `TRUE_FALSE` | True / False | Binary decision question |
| `FLASHCARDS` | Flashcards | Flip-card terminology and concept study aid |
| `IMAGE_HOTSPOTS` | Image Hotspots | High-resolution image with clickable exploratory hotspots |

---

## 2. Project Lifecycle & Status Transitions

```
[Create Project] ---> DRAFT ---> (Submit for Review) ---> REVIEW
                                                             |
[Published Snapshot] <--- PUBLISHED <--- (Approved) <-------+
        |
        v
    ARCHIVED
```

- **DRAFT:** Work-in-progress. Authors can edit slide text, add questions, and reorder elements.
- **REVIEW:** Content frozen for instructional review and QA.
- **PUBLISHED:** Active version locked. Live lessons link to this version.
- **ARCHIVED:** Retired or superseded content.

---

## 3. Project Duplication Invariant

Authors frequently duplicate existing templates or certified courses. `ContentService.duplicateProject` guarantees deep cloning integrity:
1. Clones the `ContentProject` record with title `${source.title} (Copy)`.
2. Clones the active `ContentDocument` with matching metadata and settings.
3. Remaps the entire `ContentElement` hierarchy:
   - Allocates new UUIDs for all elements.
   - Preserves parent-child relationships using an in-memory ID map (`idMap.set(oldId, newId)`).
   - Re-assigns `parentId` to the corresponding newly cloned parent ID.
