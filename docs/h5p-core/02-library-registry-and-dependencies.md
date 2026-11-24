# H5P Library Registry & Dependency DAG Resolution

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.4 — H5P Core Engine Integration & Library Management  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Library Identification & Semantic Versioning

In the H5P ecosystem, libraries follow strict semantic versioning rules:
- `machineName`: Dot-separated identifier (e.g. `H5P.InteractiveVideo`, `H5P.JoubelUI`).
- `majorVersion`: Breaking changes in runtime contracts or semantics structure.
- `minorVersion`: Backwards-compatible feature additions.
- `patchVersion`: Bug fixes that never alter semantics or public APIs.

### 1.1 Uniqueness Invariant
```sql
CONSTRAINT uq_h5p_libraries_machine_version UNIQUE (machine_name, major_version, minor_version);
```
Content built for `H5P.InteractiveVideo 1.24.0` runs seamlessly on `1.24.8` because patch updates are strictly backwards-compatible. Patch upgrades update the existing record's `patchVersion` and preloaded asset paths without breaking dependent content instances.

---

## 2. Topological Dependency DAG Resolution

When an H5P player loads in a client browser or iframe, scripts and stylesheets must be injected into the document in exact dependency order (prerequisites first, root library last).

### 2.1 Resolution Algorithm
The resolver in `H5PLibraryService.resolveAssetHierarchy` performs a depth-first traversal of the `H5PLibraryDependency` directed acyclic graph:

```
[FontAwesome 4.5] (Base CSS)
        ^
        | requires
[H5P.JoubelUI 1.3] (UI Controls)      [H5P.Video 1.6] (Player Adapter)
        ^                                      ^
        | requires                             | requires
        +------------------+-------------------+
                           |
               [H5P.InteractiveVideo 1.24] (Root Runnable Library)
```

### 2.2 Resolution Output
1. **Topological Order:** `FontAwesome 4.5` -> `H5P.JoubelUI 1.3` -> `H5P.Video 1.6` -> `H5P.InteractiveVideo 1.24`.
2. **Ordered Styles:** Deduplicated array of preloaded CSS paths.
3. **Ordered Scripts:** Deduplicated array of preloaded JS paths.
4. **Cycle Detection:** Visited set prevents infinite loops in circular dependency edge cases.
