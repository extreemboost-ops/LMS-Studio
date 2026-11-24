# Course Authoring & Content Engine Architecture

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.3 — Course Authoring, Content Projects & Interactive Content Engine  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Overview & Objective

Phase 03.3 implements the core course authoring, interactive content projects, and hierarchical element tree engine for the SCORM & H5P Authoring Studio.

Building upon the zero-trust multi-tenant backend foundation established in Phase 03.1 and Phase 03.2, this milestone enables instructors, authors, and instructional designers to:
1. Construct structured, modular curricula organized by **Courses**, **Modules**, and **Lessons**.
2. Author standalone interactive content projects (**ContentProjects**) across multiple formats (Course Presentations, Interactive Videos, Question Sets, Interactive Books, Branching Scenarios).
3. Manage interactive slide and chapter element hierarchies (**ContentDocuments** and **ContentElements**).
4. Publish immutable, tamper-proof version snapshots (**ContentVersions**) and track author edit histories (**ContentRevisions**).
5. Enforce strict organization-level multi-tenancy and Role-Based Access Control (RBAC) across all content endpoints.

---

## 2. Domain Model Architecture

The architecture maps directly to the approved PostgreSQL schema in `prisma/schema.prisma`:

```
+-----------------------------------------------------------------------------------+
|                                  ORGANIZATION                                     |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                   WORKSPACE                                       |
+-----------------------------------------------------------------------------------+
           |                                                      |
           v                                                      v
+-----------------------+                              +-----------------------+
|        COURSE         |                              |    CONTENT PROJECT    |
+-----------------------+                              +-----------------------+
           |                                                      |
           v                                                      |--> ContentDocument
+-----------------------+                                         |--> ContentElements
|     COURSE MODULE     |                                         |--> ContentVersions
+-----------------------+                                         |--> ContentRevisions
           |                                                      |
           v                                                      |
+-----------------------+                                         |
|        LESSON         |-----------------------------------------+
+-----------------------+   (Optional link to interactive content project)
```

---

## 3. Core Engine Components

### 3.1 Course Management (`server/src/modules/courses/`)
- Courses represent structured learning paths with a curriculum hierarchy: Course -> Modules -> Lessons.
- Each course belongs to a verified `Workspace` within the tenant's `Organization`.
- Lessons can link optionally to interactive `ContentProject` entities, connecting syllabus progression to interactive assessments.

### 3.2 Content Projects Engine (`server/src/modules/content/`)
- Manages authoring containers for H5P-compatible and SCORM-compatible interactive experiences.
- Supports 10 distinct content types: `PRESENTATION`, `INTERACTIVE_VIDEO`, `INTERACTIVE_BOOK`, `QUESTION_SET`, `MULTI_CHOICE`, `DRAG_DROP`, `FILL_BLANKS`, `TRUE_FALSE`, `FLASHCARDS`, `IMAGE_HOTSPOTS`.
- Supports project duplication with deep cloning of document settings and element trees with remapped hierarchical IDs.

### 3.3 Hierarchical Element Tree
- Implements a parent-child recursive tree structure for interactive elements (`CHAPTER`, `SLIDE`, `QUESTION`, `HOTSPOT`, `MEDIA`, `INTERACTION`).
- Allows dynamic reordering and nesting within chapters or slides.

### 3.4 Versioning & Immutability
- Every publish event serializes the entire document and element tree into an immutable JSONB `snapshotPayload` in `ContentVersion`.
- Subsequent edits to live drafts never mutate historical published snapshots.
