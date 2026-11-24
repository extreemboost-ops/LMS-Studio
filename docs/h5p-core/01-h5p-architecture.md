# H5P Core Engine Integration Architecture

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.4 — H5P Core Engine Integration & Library Management  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Overview & Compliance Standard

Phase 03.4 implements the **H5P Core Engine and Library Registry** for the SCORM & H5P Authoring Studio, in strict accordance with the official **H5P Core Specification (v1.24+)**.

H5P is a modular e-learning framework where content types (e.g. Course Presentations, Interactive Videos, Question Sets) are defined by standalone reusable libraries. Each library encapsulates:
1. `library.json`: Manifest declaring machine name, semantic version, and runtime dependencies.
2. `semantics.json`: Schema defining the parameters structure and authoring form widgets.
3. Preloaded assets: Core CSS and JavaScript scripts executed inside the client player.
4. Language definitions: Localization files for internationalized interfaces.

---

## 2. Architectural Components

```
+-----------------------------------------------------------------------------------+
|                            H5P CORE BACKEND SUBSYSTEM                             |
+-----------------------------------------------------------------------------------+
                                         |
     +-----------------------------------+-----------------------------------+
     |                                   |                                   |
     v                                   v                                   v
+-----------------------+     +-----------------------+     +-----------------------+
|   LIBRARY REGISTRY    |     |  SEMANTICS VALIDATOR  |     |   CONTENT INSTANCE    |
| (h5p-library.service) |     |   (h5p-semantics.ts)  |     | (h5p-content.service) |
+-----------------------+     +-----------------------+     +-----------------------+
     |                                   |                                   |
     |--> Installs & registers           |--> Parses semantics.json          |--> Connects to ContentProject
     |    libraries                      |--> Validates required fields      |--> Stores raw parameters
     |--> Enforces semantic              |--> Type checks values             |--> Produces sanitized
     |    versioning [name, maj, min]    |--> Sanitizes HTML/XSS                  filteredParameters
     |--> Traverses dependency DAG       |--> Produces safe                  |--> Resolves player asset
     |--> Resolves preloaded JS/CSS           filteredParameters                  bundle (CSS/JS)
```

---

## 3. Relational Database Mapping

The subsystem maps directly to the normalized PostgreSQL models in `prisma/schema.prisma`:
- **`H5PLibrary`:** Normalized catalog of installed libraries keyed by `@@unique([machineName, majorVersion, minorVersion])`.
- **`H5PLibraryDependency`:** Directed edges in the dependency graph categorized by `H5PDependencyType` (`PRELOADED`, `DYNAMIC`, `EDITOR`).
- **`H5PContent`:** Content instance linked 1:1 to `ContentProject`, storing `parameters` (raw JSON) and `filteredParameters` (sanitized JSON).
- **`H5PContentLibrary`:** Subset of libraries required by a specific content instance.
- **`H5PPackageImport`:** Tracking `.h5p` zip package upload and validation jobs.
