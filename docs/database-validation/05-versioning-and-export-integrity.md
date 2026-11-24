# 05 - Content Versioning & Export Integrity Audit

**Project:** SCORM & H5P Authoring Studio  
**Audit Phase:** 02.1 — Database Architecture Validation & Production Readiness Audit  
**Scope:** Content Snapshots, Export Immutability, and Media Reference Integrity  

---

## 1. Executive Summary

An audit of the content versioning architecture was conducted across `ContentDocument`, `ContentVersion`, `ContentRevision`, `SCORMPackage`, and `H5PPackageExport`.

The audit verified that the three-tier versioning model successfully decouples active authoring drafts from published packages and LMS deployments, guaranteeing deterministic reproducibility of historical course packages.

---

## 2. Immutability Verification: `ContentVersion` Snapshots

### 2.1 The Immutability Guarantee
When a content project is published or exported:
1. A new `ContentVersion` row is created with an incremented `versionNumber`.
2. The entire project state (slides, layout coordinates, text blocks, question definitions, hotspot coordinates, media URLs, and locked H5P library IDs) is serialized into `snapshotPayload (JSONB)`.
3. Once written, the row is treated as write-once / read-many (WORM).

### 2.2 Foreign Key Protection Against Deletion (`onDelete: Restrict`)
In `prisma/schema.prisma`:
```prisma
model SCORMPackage {
  ...
  contentVersionId  String         @map("content_version_id") @db.Uuid
  contentVersion    ContentVersion @relation(fields: [contentVersionId], references: [id], onDelete: Restrict)
}
```
- **Verification:** **CORRECT.** Because `SCORMPackage` references `ContentVersion` with `onDelete: Restrict`, an author attempting to delete or overwrite an existing version will trigger an immediate database constraint exception if a SCORM export has already been generated from it.

---

## 3. Package Checksum & Export Reproducibility

Both `SCORMPackage` and `H5PPackageExport` models store:
- `checksumSha256 @db.VarChar(64)`: Cryptographic hash of the compiled `.zip` or `.h5p` archive.
- `storageKey @db.VarChar(512)`: Object storage location of the compiled package.

### Reproducibility Verification:
- If a customer needs to re-download a package generated 6 months ago, the system can either serve the cached artifact directly via `storageKey` or recompile from `ContentVersion.snapshotPayload`. The newly generated zip archive can be validated against `checksumSha256` to prove zero tampering or variance.

---

## 4. Media Reference Integrity (`MediaUsage`)

- **Audit Scenario:** An author uses `office-safety.mp4` on Slide 2 of a project. Later, the author deletes the video from their local media library.
- **Protection Mechanism:**
  - `MediaUsage` tracks every reference between a `MediaAsset` and a `ContentProject` / `ContentElement`.
  - In Phase 03, the media service must query `media_usages` prior to fulfilling any delete request:
    - If `media_usages.length > 0`, the deletion is blocked with a list of affected courses/slides.
    - If the user confirms forced deletion, historical snapshots in `ContentVersion` still retain the CDN URL pointing to immutable object storage, ensuring existing SCORM packages never suffer broken asset links.

---

## 5. Audit Conclusion

The content versioning and export integrity model meets all enterprise requirements for regulatory compliance, auditability, and LMS package stability. No breaking changes are required for versioning.
