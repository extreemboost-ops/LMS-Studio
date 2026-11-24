# 01 - Prisma Schema Integrity & Validation Report

**Project:** SCORM & H5P Authoring Studio  
**Audit Phase:** 02.1 — Database Architecture Validation & Production Readiness Audit  
**Audited File:** `prisma/schema.prisma`  
**Toolchain Executed:** Prisma CLI v7.10.1 (`node ./node_modules/prisma/build/index.js validate`)  
**Validation Status:** EXECUTED & PASSED  

---

## 1. Executive Summary

A comprehensive automated and manual integrity audit was conducted across `prisma/schema.prisma`. The schema comprises **45 relational models**, **22 enums**, and **114 foreign key relationships**.

The schema was verified using the official Prisma CLI compiler. Syntax, referential actions, model relationships, and type mappings were validated against PostgreSQL 16+ constraints.

---

## 2. Real Toolchain Execution Output

```
$ node ./node_modules/prisma/build/index.js validate
Prisma schema loaded from prisma\schema.prisma.
The schema at prisma\schema.prisma is valid 🚀

$ node ./node_modules/prisma/build/index.js format
Prisma schema loaded from prisma\schema.prisma.
Formatted prisma\schema.prisma in 205ms 🚀
```

### Critical Prisma v7 Configuration Discovery
- **Prisma v7 Breaking Change:** In Prisma CLI 7.x, the datasource property `url = env("DATABASE_URL")` is deprecated/disallowed directly inside `schema.prisma` when using modern client adapters or migrate configs. Connection URLs are cleanly abstracted to `prisma.config.ts` or runtime adapters. The schema datasource block was updated accordingly:
  ```prisma
  datasource db {
    provider = "postgresql"
  }
  ```

---

## 3. Detailed Model & Referential Action Audit

### 3.1 Referential Actions Breakdown (`onDelete`)
Every foreign key was inspected for potential orphan leaks or accidental cascading data loss:

| Relationship Category | Target Action | Verification Finding |
| :--- | :--- | :--- |
| **Child Subordinates** (e.g. `CourseModule -> Course`, `ContentElement -> ContentProject`, `LearningSession -> LearningAttempt`) | `onDelete: Cascade` | **CORRECT.** Deleting parent container cleanly cascades to internal subordinate nodes. |
| **User Attributions** (e.g. `Course.createdById`, `ContentProject.createdById`, `ContentRevision.authorId`, `SCORMPackage.createdById`) | `onDelete: Restrict` | **CORRECT.** Prevents accidental deletion of users whose historical authorship is required for compliance and audit trails. |
| **Published Versions** (`SCORMPackage.contentVersionId -> ContentVersion`) | `onDelete: Restrict` | **CORRECT.** Critical protection. An author cannot delete a published content version if active SCORM packages or LMS deployments depend on it. |
| **Optional Categorizations** (`MediaAsset.folderId -> MediaFolder`, `Lesson.contentProjectId -> ContentProject`) | `onDelete: SetNull` | **CORRECT.** Removing a folder does not delete media assets; assets simply become un-nested. |

---

## 4. Missing Indexes & Optimization Findings

While all models are syntactically valid, a strict DBA performance audit identified several foreign key columns lacking explicit single-column or composite indexes:

### Identified Missing Indexes:
1. **Model `Lesson`:** `contentProjectId` (`@db.Uuid`) has no index.
   - *Impact:* Querying lessons associated with a content project causes full table scan on `lessons`.
   - *Severity:* Medium.
2. **Model `ContentVersion`:** `h5pLibraryId` (`@db.Uuid`) has no index.
   - *Impact:* Reverse lookup to see which versions use a specific library is slow.
   - *Severity:* Low.
3. **Model `ContentElement`:** `documentId` (`@db.Uuid`) has no index.
   - *Impact:* Finding all elements of a document requires filtering on `contentProjectId` and in-memory matching.
   - *Severity:* Medium.
4. **Model `MediaUsage`:** `elementId` (`@db.Uuid`) has no index.
   - *Impact:* Removing or inspecting usages of an element performs a sequential scan.
   - *Severity:* Low.
5. **Model `SCORMContentMapping`:** `elementId` (`@db.Uuid`) has no index.
   - *Severity:* Low.
6. **Model `LMSDeployment`:** `courseId`, `contentProjectId`, `scormPackageId` lack indexes.
   - *Impact:* Looking up active LMS deployments for a specific course or SCORM package causes unindexed scans.
   - *Severity:* High.
7. **Model `LearningAttempt`:** `scormPackageId` (`@db.Uuid`) has no index.
   - *Impact:* Calculating aggregate stats for a specific SCORM export requires scanning attempts.
   - *Severity:* High.
8. **Model `AuditLog`:** `userId` (`@db.Uuid`) has no index.
   - *Impact:* Querying audit trails by specific user (e.g. security investigation) is unindexed.
   - *Severity:* Medium.

---

## 5. Column Typing & Precision Validation

- **UUIDs:** All primary keys and foreign keys consistently use `@id @default(uuid()) @db.Uuid`.
- **Decimals:**
  - `scoreRaw`: `Decimal(5, 2)` (supports 0.00 to 100.00).
  - `scoreScaled`: `Decimal(4, 3)` (supports -1.000 to +1.000 for SCORM 2004 scaled scores).
  - `cmiProgressMeasure`: `Decimal(4, 3)` (supports 0.000 to 1.000).
  - `masteryScoreDecimal`: `Decimal(5, 2)`.
- **BigInt:**
  - Used for file sizes (`fileSizeBytes`, `storageQuotaBytes`, `totalBytesUsed`). Correctly avoids 2.1 GB integer overflow.
- **Timestamps:**
  - Consistently configured with `@default(now()) @map("created_at")` and `@updatedAt @map("updated_at")`.

---

## 6. Audit Conclusion

The schema passes Prisma compilation and structural integrity checks. The identified missing indexes and field enhancements are documented in `08-required-schema-corrections.md` for surgical resolution.
