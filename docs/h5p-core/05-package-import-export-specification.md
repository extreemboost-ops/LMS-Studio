# H5P Package Import & Export Specification

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.4 — H5P Core Engine Integration & Library Management  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Package Archive Structure (`.h5p`)

An `.h5p` file is a ZIP archive adhering to the following internal layout:

```
package.h5p (ZIP Archive)
  |-- h5p.json                     (Root package manifest)
  |-- content/
  |     +-- content.json           (Authored content parameters)
  |     +-- images/                (Embedded image assets)
  |     +-- videos/                (Embedded video assets)
  |     +-- audios/                (Embedded audio tracks)
  |-- H5P.InteractiveVideo-1.24/   (Bundled library folder)
  |     +-- library.json
  |     +-- semantics.json
  |     +-- js/
  |     +-- css/
  +-- H5P.Video-1.6/
```

---

## 2. Manifest Validation Rules (`h5p.json`)

The package service enforces the following validation checks via `H5PPackageService.validateManifest`:
1. **JSON Object Root:** Rejects malformed or corrupted JSON text.
2. **Title Requirement:** Must include a non-empty `title` string.
3. **Main Library String:** Must match the format `Library.MachineName Major.Minor` (e.g. `H5P.InteractiveVideo 1.24`).
4. **Preloaded Dependencies:** Array of library dependencies specifying `machineName`, `majorVersion`, and `minorVersion`.

---

## 3. Dependency Verification Pre-Flight

Before extracting an uploaded archive, `H5PPackageService.checkMissingDependencies` checks the installed library catalog:
- If all required libraries are already installed in `h5p_libraries`, the package can be unpacked directly into a new `ContentProject`.
- If any required library is missing, the import job lists the missing libraries and either extracts them from the archive bundle or flags them to the user.

---

## 4. Import Job Lifecycle (`H5PPackageImport`)

Package imports are managed asynchronously:
```
[POST /h5p/import] ---> QUEUED ---> PROCESSING ---> COMPLETED
                                              |
                                              +---> FAILED (With validationErrors JSONB)
```
- Tracks file size in bytes (`fileSizeBytes`), user ID (`createdById`), and workspace ID (`workspaceId`).
