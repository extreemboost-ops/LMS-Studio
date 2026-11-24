# 08 - Required Schema Corrections & Refinements

**Project:** SCORM & H5P Authoring Studio  
**Audit Phase:** 02.1 — Database Architecture Validation & Production Readiness Audit  
**Purpose:** Formal, Surgical Specification of Identified Schema Improvements  

---

## 1. Summary of Identified Corrections

All 6 issues identified during the technical audit are cataloged below with severity, affected model/field, architectural reasoning, and exact DDL diffs:

---

### Issue 1: Missing Assets & Semantics in `H5PLibrary`
- **Severity:** High
- **Affected Model:** `H5PLibrary`
- **Why it is a problem:** The H5P specification requires dynamic injection of library JavaScript, CSS, and editor semantics trees (`semantics.json`). Storing these in the database avoids reading the filesystem on every iframe render and enables dynamic authoring form generation.
- **Recommended Correction:** Add `preloadedJs`, `preloadedCss`, `semantics`, and `language` JSONB columns.
- **Requires Schema Change:** YES
- **Prisma Schema Diff:**
```prisma
model H5PLibrary {
  ...
  preloadedJs         Json?                  @default("[]") @map("preloaded_js") @db.JsonB
  preloadedCss        Json?                  @default("[]") @map("preloaded_css") @db.JsonB
  semantics           Json?                  @db.JsonB
  language            Json?                  @db.JsonB
  ...
}
```

---

### Issue 2: Missing Standard CMI Elements in `SCORMRuntimeRecord`
- **Severity:** High
- **Affected Model:** `SCORMRuntimeRecord`
- **Why it is a problem:** Certified LMS integration requires distinguishing `cmi.mode` (`normal`, `review`, `browse`), `cmi.credit` (`credit`, `no-credit`), `cmi.scaled_passing_score`, and `cmi.launch_data`. Without these, post-test reviews could overwrite passing scores.
- **Recommended Correction:** Add the four standard CMI runtime columns.
- **Requires Schema Change:** YES
- **Prisma Schema Diff:**
```prisma
model SCORMRuntimeRecord {
  ...
  cmiMode              String?         @default("normal") @map("cmi_mode") @db.VarChar(20)
  cmiCredit            String?         @default("credit") @map("cmi_credit") @db.VarChar(20)
  scaledPassingScore   Decimal?        @map("scaled_passing_score") @db.Decimal(4, 3)
  cmiLaunchData        String?         @map("cmi_launch_data") @db.Text
  ...
}
```

---

### Issue 3: Direct Multi-Tenant Key on `LearningAttempt`
- **Severity:** High
- **Affected Model:** `LearningAttempt`
- **Why it is a problem:** Under high concurrent learner volume, verifying tenant authorization on `LearningAttempt` required joining through `Learner` to `Organization`. Having direct `organizationId` allows single-column tenant matching and high-performance RLS filtering.
- **Recommended Correction:** Add `organizationId` foreign key and relationship to `Organization`.
- **Requires Schema Change:** YES
- **Prisma Schema Diff:**
```prisma
model LearningAttempt {
  id               String               @id @default(uuid()) @db.Uuid
  organizationId   String               @map("organization_id") @db.Uuid
  ...
  organization     Organization         @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  ...
  @@index([organizationId, status])
}
```

---

### Issue 4: Distributed Worker Locking & Idempotency in `BackgroundJob`
- **Severity:** Medium
- **Affected Model:** `BackgroundJob`
- **Why it is a problem:** In multi-worker or containerized deployments, workers polling `background_jobs` could pick up the same SCORM export job simultaneously, causing duplicate packaging jobs and storage conflicts.
- **Recommended Correction:** Add `idempotencyKey`, `lockedBy`, and `lockedAt` fields.
- **Requires Schema Change:** YES
- **Prisma Schema Diff:**
```prisma
model BackgroundJob {
  ...
  idempotencyKey  String?       @unique @map("idempotency_key") @db.VarChar(100)
  lockedBy        String?       @map("locked_by") @db.VarChar(100)
  lockedAt        DateTime?     @map("locked_at")
  ...
}
```

---

### Issue 5: Missing Foreign Key B-Tree Indexes
- **Severity:** Medium
- **Affected Models:** `Lesson`, `ContentVersion`, `ContentElement`, `MediaUsage`, `SCORMContentMapping`, `LMSDeployment`, `LearningAttempt`, `AuditLog`.
- **Why it is a problem:** Relational foreign keys without corresponding B-Tree indexes cause full table scans on parent lookups and cascades.
- **Recommended Correction:** Add explicit indexes to every un-indexed foreign key.
- **Requires Schema Change:** YES
- **Prisma Schema Diff:**
```prisma
// In Lesson:
@@index([contentProjectId])

// In ContentVersion:
@@index([h5pLibraryId])

// In ContentElement:
@@index([documentId])

// In MediaUsage:
@@index([elementId])

// In SCORMContentMapping:
@@index([elementId])

// In LMSDeployment:
@@index([courseId])
@@index([contentProjectId])
@@index([scormPackageId])

// In LearningAttempt:
@@index([scormPackageId])

// In AuditLog:
@@index([userId])
```

---

### Issue 6: Prisma v7 Datasource URL Schema Configuration
- **Severity:** High
- **Affected File:** `prisma/schema.prisma`
- **Why it is a problem:** Prisma CLI v7 deprecates `url = env("DATABASE_URL")` directly inside `schema.prisma`.
- **Recommended Correction:** Maintain `datasource db { provider = "postgresql" }` and manage connection parameters via client constructor / `prisma.config.ts`.
- **Requires Schema Change:** YES (Verified and applied).
