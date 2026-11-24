# 06 - Storage Quotas, Media Assets & Background Jobs Audit

**Project:** SCORM & H5P Authoring Studio  
**Audit Phase:** 02.1 — Database Architecture Validation & Production Readiness Audit  
**Scope:** Object Storage Mapping, Quota Enforcement, and Distributed Background Worker Reliability  

---

## 1. Executive Summary

An operational audit was conducted on `MediaAsset`, `MediaFolder`, `StorageUsage`, `SCORMExportJob`, and `BackgroundJob`.

The schema effectively models storage quotas and file assets. However, the background job queue was identified as lacking **distributed worker locking mechanisms** and **idempotency keys**, which could lead to duplicate export processing in clustered production environments.

---

## 2. Storage Quota Accounting & Quota Enforcement

### 2.1 Quota Verification
- `Organization.storageQuotaBytes`: Defaults to 100 GB (`107374182400` bytes).
- `StorageUsage`: Records periodic snapshots of `totalBytesUsed`, broken down by `videoBytes`, `imageBytes`, `audioBytes`, `documentBytes`, and `packageBytes`.
- **Finding:** **CORRECT.** Using `BigInt` prevents 32-bit integer overflow (which occurs at ~2.14 GB), safely supporting multi-terabyte tenant quotas.

### 2.2 Orphan Media Cleanup Strategy
- When slides or projects are deleted, the files in S3/Cloud Storage must not be left unmanaged.
- **Workflow Recommendation for Phase 03:**
  - A scheduled background job (`CLEANUP_ORPHAN_MEDIA`) queries:
    ```sql
    SELECT m.id, m.storage_key 
    FROM media_assets m 
    LEFT JOIN media_usages u ON m.id = u.media_asset_id 
    WHERE u.id IS NULL AND m.updated_at < NOW() - INTERVAL '30 days';
    ```
  - Unreferenced media files can be safely archived or permanently purged following customer retention rules.

---

## 3. Background Job Queue & Worker Concurrency Audit

### Issue JOB-01: Missing Distributed Worker Locking & Idempotency
- **Severity:** Medium.
- **Affected Model:** `BackgroundJob`.
- **Why it is a problem:**
  1. *Duplicate Processing:* In a multi-worker backend deployment (e.g. 3 Node.js worker containers), multiple workers executing `SELECT * FROM background_jobs WHERE status = 'QUEUED'` can pick up the identical SCORM export task simultaneously, wasting compute and generating duplicate S3 upload conflicts.
  2. *Duplicate Submission:* If an author clicks "Generate Package" twice rapidly, two duplicate packaging jobs are queued for the exact same version snapshot.
- **Recommended Correction:**
  - Add `idempotencyKey String? @unique @map("idempotency_key") @db.VarChar(100)` to `BackgroundJob`.
  - Add `lockedBy String? @map("locked_by") @db.VarChar(100)` and `lockedAt DateTime? @map("locked_at")` to `BackgroundJob`.
- **Worker Execution Pattern:**
  ```sql
  -- Atomic worker claim in Phase 03
  UPDATE background_jobs 
  SET status = 'PROCESSING', locked_by = :workerId, locked_at = NOW() 
  WHERE id = (
    SELECT id FROM background_jobs 
    WHERE status = 'QUEUED' 
    ORDER BY priority DESC, created_at ASC 
    LIMIT 1 
    FOR UPDATE SKIP LOCKED
  );
  ```
- **Requires Schema Change:** YES.

---

## 4. Job Retry & Error Handling

- `attempts Int @default(0)`
- `maxAttempts Int @default(3)`
- `errorLog String? @db.Text`
- **Verification:** **CORRECT.** Supports exponential backoff retries. If `attempts >= maxAttempts`, the job is marked `FAILED` and an in-app `Notification` is automatically triggered for the requesting user.
