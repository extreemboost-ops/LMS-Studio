# 03 - H5P Core Engine Compatibility & Library Architecture Audit

**Project:** SCORM & H5P Authoring Studio  
**Audit Phase:** 02.1 — Database Architecture Validation & Production Readiness Audit  
**Compliance Standard:** H5P Core Specification (v1.24+) & Library JSON Schema  

---

## 1. Executive Summary

A deep technical validation was performed comparing the schema models (`H5PContent`, `H5PLibrary`, `H5PLibraryDependency`, `H5PContentLibrary`, `H5PPackageImport`, `H5PPackageExport`) against the official H5P Core specifications.

While the relational model correctly handles dependency graphs and instance parameters, the audit identified **four critical missing fields** in `H5PLibrary` that would prevent a real H5P runtime or editor from functioning without heavy disk file reading.

---

## 2. Gap Analysis: Official `library.json` vs. `H5PLibrary` Model

In the H5P ecosystem, every library package includes a `library.json` manifest. Comparing the specification to the current `H5PLibrary` model revealed key omissions:

```
H5P library.json Manifest                    Current H5PLibrary Model
├── title                                  ├── title (Present)
├── machineName                            ├── machineName (Present)
├── majorVersion, minorVersion, patchVersion ├── majorVersion, minorVersion, patchVersion (Present)
├── runnable, fullscreen                   ├── runnable, fullscreen (Present)
├── preloadedJs (Array of JS paths)       ├── ❌ MISSING
├── preloadedCss (Array of CSS paths)      ├── ❌ MISSING
├── semantics (Editor schema tree)         ├── ❌ MISSING
└── language (Translation dictionary)      ├── ❌ MISSING
```

### Detailed Issue Evaluation:

#### Issue H5P-01: Missing `preloadedJs` and `preloadedCss`
- **Severity:** High.
- **Affected Model:** `H5PLibrary`.
- **Why it is a problem:** When an H5P player initializes an interaction inside an iframe, it reads `preloadedJs` and `preloadedCss` from every required library to generate `<script>` and `<link>` tags in the exact dependency order. Without these fields in the database, the backend would be forced to read the filesystem on every single learner request.
- **Recommended Correction:** Add `preloadedJs Json? @default("[]") @map("preloaded_js") @db.JsonB` and `preloadedCss Json? @default("[]") @map("preloaded_css") @db.JsonB` to `H5PLibrary`.
- **Requires Schema Change:** YES.

#### Issue H5P-02: Missing `semantics`
- **Severity:** High.
- **Affected Model:** `H5PLibrary`.
- **Why it is a problem:** `semantics.json` is the cornerstone of the H5P Editor. It describes the fields, types, widgets, labels, validation rules, and default values needed to render the authoring form for that library. Without storing `semantics` in the database, authoring workspaces cannot dynamically render editors for new or updated libraries.
- **Recommended Correction:** Add `semantics Json? @db.JsonB` to `H5PLibrary`.
- **Requires Schema Change:** YES.

#### Issue H5P-03: Missing `language`
- **Severity:** Medium.
- **Affected Model:** `H5PLibrary`.
- **Why it is a problem:** Localization in H5P relies on translation files stored per library (`language/en.json`, `language/es.json`).
- **Recommended Correction:** Add `language Json? @db.JsonB` to `H5PLibrary`.
- **Requires Schema Change:** YES.

---

## 3. Dependency Resolution & Cycle Detection Audit

### 3.1 Directed Acyclic Graph (DAG) Structure
The `H5PLibraryDependency` model links `libraryId` to `requiredLibraryId` with `dependencyType` (`PRELOADED`, `DYNAMIC`, `EDITOR`):
- **Verification:** **CORRECT.** The composite unique key `@@unique([libraryId, requiredLibraryId, dependencyType])` prevents duplicate dependency entries.
- **Cycle Prevention:** While the relational schema allows recursive self-referencing relations, dependency cycles (e.g. A requires B, B requires A) violate H5P packing standards. The backend ingestion service in Phase 03 must enforce topological sorting (Kahn's algorithm) upon package upload to guarantee no cyclical dependencies exist before writing rows.

### 3.2 Instance-to-Library Mapping (`H5PContentLibrary`)
- **Verification:** **CORRECT.** When a content instance is saved, all libraries utilized in the interaction (both preloaded and dynamically required) are recorded in `h5p_content_libraries`. This ensures that when packing an `.h5p` archive for export, the export builder packages the complete set of required library folders without missing dependencies.

---

## 4. Parameter Trees & Schema Transformation (`content.json`)

The `H5PContent` model appropriately separates:
1. `parameters`: Raw authored JSON matching `content/content.json`.
2. `filteredParameters`: Sanitized JSON stripped of malicious script injection.
3. `metadata`: Standard H5P licensing, authors, copyright, and title structure.

### JSON Storage Validation:
- The parameters are modeled as `@db.JsonB`, enabling PostgreSQL to index nested keys (e.g., questions, interactions, hotspot coordinates) via GIN indexes.

---

## 5. Audit Conclusion

The overall architectural approach to H5P normalization is sound. Incorporating `preloadedJs`, `preloadedCss`, `semantics`, and `language` into `H5PLibrary` elevates the schema from theoretical compatibility to full production compliance with official H5P Core engines.
