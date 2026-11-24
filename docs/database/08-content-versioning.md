# 08 - Content Versioning, Revision History & Immutability Architecture

**Project:** SCORM & H5P Authoring Studio  
**Phase:** 02 — Database Architecture & Schema Design  

---

## 1. The Core Versioning Challenge

Learning content authoring has two conflicting requirements:
1. **High-Frequency Auto-Save (Drafting):** Authors edit text, drag hotspots, and tweak question points every few seconds. These micro-edits must be recorded without creating heavy duplicate snapshot blobs.
2. **Strict Compliance & LMS Immutability (Publishing & Exporting):** Once a course or module is exported to SCORM or synced to Moodle/Canvas, the runtime package must be 100% frozen. If an author later edits a slide in draft mode, enrolled learners must continue receiving the exact version they registered for.

---

## 2. Three-Tier Versioning Model

The platform implements a three-tier versioning architecture:

```
Tier 1: Incremental Micro-Revisions (ContentRevision)
  └── Lightweight JSON diffs on every auto-save (Undo / Redo / Audit trail)

Tier 2: Active Working Document (ContentDocument)
  └── The authoritative, editable draft state currently open in the studio

Tier 3: Immutable Milestone Versions (ContentVersion)
  └── Complete frozen JSON snapshot + locked H5P library dependencies
        ├── SCORMPackage (Generates from ContentVersion)
        ├── H5PPackageExport (Generates from ContentVersion)
        └── LMSDeployment (Deploys from ContentVersion)
```

---

## 3. Entity Responsibilities & Lifecycles

### 3.1 `ContentRevision` (Micro-Revisions)
- **Lifecycle:** Created every time an author pauses typing or repositions an element (debounced at 3-second intervals).
- **Storage:** Stores only the delta (`diffPayload: JSONB`) and author attribution (`authorId`).
- **Use Case:** Powers the Undo / Redo buttons (`<Undo2 />`, `<Redo2 />` in `AuthoringWorkspace`) and revision timelines without duplicating media or unchanged slides.

### 3.2 `ContentDocument` (Active Draft)
- **Lifecycle:** One active draft document per project.
- **Storage:** Stores current configuration, metadata, and references `content_elements`.
- **Use Case:** Real-time state rendered in the 3-panel authoring workspace.

### 3.3 `ContentVersion` (Frozen Snapshot)
- **Lifecycle:** Created when an author clicks "Publish", "Generate Version", or triggers an export.
- **Storage:** Full self-contained snapshot (`snapshotPayload: JSONB`) containing all slides, questions, hotspots, media URLs, and library semantic versions at that exact millisecond.
- **Immutability Constraint:** Database triggers prevent any `UPDATE` or `DELETE` on `content_versions` if referenced by active `SCORMPackage` or `LMSDeployment` records.

---

## 4. Recoverability & Version Rollback Strategy

When an author selects "Revert to Version 14":
1. The historical `ContentVersion` record (`versionNumber = 14`) is read from `content_versions`.
2. A **new revision** is created (`revisionNumber = 19`).
3. The active `ContentDocument` and `content_elements` are updated to match Version 14's snapshot payload.
4. **Historical integrity is preserved:** Version 14, Version 15, Version 16, Version 17, and Version 18 remain untouched in the database.

---

## 5. Export Traceability (SCORM & H5P)

Every `SCORMPackage` and `H5PPackageExport` explicitly references `contentVersionId`:
```prisma
model SCORMPackage {
  ...
  contentVersionId  String         @db.Uuid
  contentVersion    ContentVersion @relation(fields: [contentVersionId], references: [id], onDelete: Restrict)
}
```
`onDelete: Restrict` prevents any administrator from accidentally deleting a published content version if SCORM ZIP packages or LMS deployments depend on it.
