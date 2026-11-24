# Content Versioning & Audit Revision Snapshots

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.3 — Course Authoring, Content Projects & Interactive Content Engine  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Versioning Architecture & Motivation

In enterprise learning management and SCORM/H5P distribution, learning compliance requires that published courseware packages remain **immutable**. If an author modifies a draft course, active learners enrolled in a historical SCORM attempt must not experience corrupt questions, missing slides, or altered grading criteria.

To solve this, the studio implements a dual-tier versioning and audit model:
1. **`ContentVersion` (Immutable Published Snapshots):** Produced upon explicit publish action.
2. **`ContentRevision` (Fine-Grained Audit Log):** Produced during ongoing authoring changes.

---

## 2. Immutable Snapshot Serialization (`ContentVersion`)

When `ContentService.createVersionSnapshot` is invoked:
1. The service reads the complete state of the project, its document settings, and its full element tree.
2. It serializes this snapshot into an immutable JSONB payload:
   ```json
   {
     "projectTitle": "Hazardous Materials Handling 2026",
     "contentType": "PRESENTATION",
     "themeVariant": "safety",
     "document": { "settings": { "enableAudio": true } },
     "elements": [
       { "id": "uuid-1", "name": "Slide 1", "config": {} },
       { "id": "uuid-2", "name": "Question 1", "config": { "points": 10 } }
     ],
     "publishedAt": "2026-11-21T00:30:00.000Z"
   }
   ```
3. It increments `ContentProject.currentVersionNumber` (e.g. 1 -> 2).
4. It sets `ContentProject.status = "PUBLISHED"`.
5. The `ContentVersion` record is persisted with foreign keys to `ContentProject` and `createdById`.

### 2.1 Immutability Guarantee
Because the snapshot is stored as a self-contained JSON document, future modifications or deletions of rows in `ContentElement` do not affect historical SCORM or H5P exports built from that snapshot.

---

## 3. Fine-Grained Revision Tracking (`ContentRevision`)

While `ContentVersion` tracks major releases, `ContentRevision` tracks continuous changes:
- `id`: UUID
- `contentProjectId`: UUID
- `authorId`: UUID (The user who made the edit)
- `revisionNumber`: Int (Monotonically increasing)
- `diffPayload`: JsonB (Structured change set, e.g. `{"action": "UPDATE_SLIDE", "elementId": "..."}`)
- `changeSummary`: VarChar(500) (Human-readable description)
- `createdAt`: Timestamp
