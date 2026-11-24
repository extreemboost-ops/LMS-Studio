# 06 - H5P Core Engine Data Model & Dependency Architecture

**Project:** SCORM & H5P Authoring Studio  
**Phase:** 02 — Database Architecture & Schema Design  
**Compliance Standard:** H5P Core Specification (v1.24+)  

---

## 1. H5P Specification & Relational Mapping

In the H5P architecture, learning content is composed of a root library (e.g., `H5P.InteractiveVideo 1.24`) which recursively requires sub-libraries (e.g., `H5P.Video 1.6`, `H5P.MultiChoice 1.16`, `H5P.JoubelUI 1.3`, `FontAwesome 4.5`).

The database design normalizes this structure into:
1. `H5PLibrary`: Normalized registry of installed library packages.
2. `H5PLibraryDependency`: Directed acyclic graph (DAG) representing dependencies between libraries.
3. `H5PContent`: Instance of an H5P interaction tied to a `ContentProject`.
4. `H5PContentLibrary`: The exact subset of libraries loaded by a specific content instance.
5. `H5PPackageImport` & `H5PPackageExport`: Tracking `.h5p` zip archives entering and leaving the system.

---

## 2. Library Identification & Semantic Versioning

H5P libraries are identified by:
- `machineName`: Alphanumeric namespace identifier (e.g. `H5P.CoursePresentation`, `H5P.InteractiveVideo`).
- `majorVersion`: Breaking changes in semantics or runtime behavior.
- `minorVersion`: Backwards-compatible feature additions.
- `patchVersion`: Bug fixes and patch releases.

### Database Unique Constraint:
```sql
CONSTRAINT uq_h5p_libraries_machine_version UNIQUE (machine_name, major_version, minor_version);
```
*Note: In the H5P standard, content built for `1.24.0` runs automatically on `1.24.5` because patch versions never alter semantics. Therefore, the database stores the installed patch version while keying libraries by `[machineName, majorVersion, minorVersion]`.*

---

## 3. Dependency Types

The `H5PLibraryDependency` model enforces the three standard H5P dependency categories:

| Dependency Type | Enum Value | Purpose | Example |
| :--- | :--- | :--- | :--- |
| **Preloaded** | `PRELOADED` | Core CSS & JS files bundled and injected into iframe before runtime execution. | `FontAwesome 4.5`, `H5P.JoubelUI 1.3` |
| **Dynamic** | `DYNAMIC` | Optional sub-libraries loaded conditionally at runtime based on learner choices. | `H5P.Summary 1.10` loaded at end of video |
| **Editor** | `EDITOR` | Libraries strictly required by authoring forms and widgets in the studio workspace. | `H5PEditor.InteractiveVideo 1.24` |

---

## 4. Content Parameters & Semantics (`content.json`)

Inside `H5PContent`, content parameters are split into:
- `parameters (JSONB)`: The complete JSON document authored in the studio canvas (matching `content/content.json` in an `.h5p` archive).
- `filteredParameters (JSONB)`: Sanitized HTML/script-safe parameters generated for untrusted learner display.
- `metadata (JSONB)`: Licensing, author, copyright, and title metadata matching H5P `metadata` object standards.

### Example Schema of `parameters` for Interactive Video:
```json
{
  "video": {
    "files": [
      {
        "path": "https://cdn.studio.local/media/office-safety.mp4",
        "mime": "video/mp4"
      }
    ]
  },
  "interactiveVideo": {
    "interactions": [
      {
        "x": 45.2,
        "y": 62.1,
        "duration": { "from": 18, "to": 32 },
        "action": {
          "library": "H5P.MultiChoice 1.16",
          "params": {
            "question": "Which action should you take first when you notice a spill?",
            "answers": [
              { "text": "Place a warning sign and report it", "correct": true },
              { "text": "Walk around it and continue working", "correct": false }
            ]
          }
        }
      }
    ]
  }
}
```

---

## 5. Safe Library Upgrade Strategy

When a new library patch or minor version is uploaded (e.g. `H5P.InteractiveVideo 1.25` replacing `1.24`):
1. **Side-by-side Installation:** Both versions coexist in `h5p_libraries`.
2. **Existing Content Stability:** Existing `H5PContent` records continue referencing `1.24` via foreign key without interruption.
3. **Upgrade Migration Tool:** An explicit upgrade routine can validate the existing `parameters` JSON against the new version's `upgrades.js` / `semantics.json` script before switching foreign keys.
