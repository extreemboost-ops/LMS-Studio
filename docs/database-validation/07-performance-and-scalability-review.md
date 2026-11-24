# 07 - Performance, Scalability & Concurrency Review

**Project:** SCORM & H5P Authoring Studio  
**Audit Phase:** 02.1 — Database Architecture Validation & Production Readiness Audit  
**Target:** High-Throughput Learner Telemetry & Multi-Tenant Scaling  

---

## 1. Executive Summary

A comprehensive performance assessment was conducted focusing on the high-concurrency demands of e-learning platforms. The primary scalability bottleneck in learning management systems is not authoring (which is low-frequency OLTP), but **learner runtime telemetry** during large-scale enterprise rollouts (e.g. 10,000 learners simultaneously taking a compliance course).

---

## 2. High-Frequency SCORM Commit Bottleneck & Mitigation

### 2.1 The Write-Amplification Threat
- In standard SCORM packages, the browser sends `LMSSetValue` calls on every slide transition, question click, and timer tick, followed by `LMSCommit`.
- In a cohort of 5,000 learners, this can generate **300 to 800 database writes per second**.
- If every commit triggers synchronous table updates across multiple normalized tracking tables, database connection pools quickly saturate.

### 2.2 Architectural Mitigations:
1. **Client-Side Heartbeat Debouncing:** The frontend SCORM runtime adapter debounces non-critical state saves (like `cmi.location` and `cmi.suspend_data`) to 30-second intervals or page unloads.
2. **Minimal Index Overhead on `scorm_runtime_records`:**
   - The `scorm_runtime_records` table carries **only one unique index** (`attempt_id`).
   - Maintaining minimal indexes on write-heavy tables prevents PostgreSQL from spending excessive CPU re-indexing B-Trees on every `UPDATE`.
3. **Dedicated Connection Pooling via PgBouncer:**
   - Dedicated connection pool allocating separate worker connection slots for learner commits vs authoring studio queries.

---

## 3. Large JSONB Payloads & PostgreSQL TOAST

### 3.1 Content Snapshots (`ContentVersion.snapshotPayload`)
- Large course presentations containing 30 slides with rich questions and media references can produce JSON snapshots between 2 MB and 8 MB.
- **PostgreSQL TOAST Mechanism:** PostgreSQL automatically handles column values exceeding 2 KB using The Oversized-Attribute Storage Technique (TOAST):
  - Values are compressed (typically achieving 65–80% compression ratio for JSON).
  - Compressed chunks are stored out-of-line in separate TOAST tables.
  - Normal queries selecting metadata (`SELECT id, version_number, title FROM content_versions`) do **not** read or decompress the TOAST payload, maintaining lightning-fast query speeds for version lists.

---

## 4. Query Pagination & B-Tree Index Coverage

### 4.1 Content Library Infinite Scroll / Pagination
- In `content_projects`, querying:
  ```sql
  SELECT * FROM content_projects 
  WHERE organization_id = :orgId AND workspace_id = :wsId 
  ORDER BY updated_at DESC LIMIT 20 OFFSET 0;
  ```
- **Index Optimization:** A composite index `(organization_id, workspace_id, updated_at DESC)` ensures an index-only scan, eliminating in-memory sorting.

### 4.2 Learner Analytics Aggregations
- Queries aggregating average scores and completion percentages filter on `(content_project_id, status)`:
  - Backed by composite index `@@index([contentProjectId, status])` on `learning_attempts`.

---

## 5. Audit Conclusion

The schema exhibits clean separation between low-frequency complex relational structures (authoring, roles, courses) and high-throughput append/update tables (runtime records, attempts, sessions). With connection pooling and client-side heartbeat debouncing, the database is architectured to support 10,000+ concurrent active learners.
