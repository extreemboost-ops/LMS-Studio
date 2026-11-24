# 04 - Comprehensive Indexing & Performance Strategy

**Project:** SCORM & H5P Authoring Studio  
**Phase:** 02 — Database Architecture & Schema Design  
**Database Engine:** PostgreSQL 16+  

---

## 1. Indexing Philosophy

High-volume learning platforms experience two distinct query patterns:
1. **Interactive Authoring Workloads (OLTP):** High write frequency for auto-saving slide revisions, element repositioning, and question parameter updates. Queries are narrow and heavily filtered by `[organizationId, workspaceId, id]`.
2. **Learner Runtime & Telemetry Workloads (High Concurrency):** High read/write throughput during quiz submissions, slide completion ticks, and SCORM `LMSSetValue` / `LMSCommit` calls.

The indexing strategy minimizes write overhead while guaranteeing index-only scans for tenant-filtered listings, background job polling, and CMI synchronization.

---

## 2. Index Taxonomy & Registry

### 2.1 Multi-Tenant Primary Filter Indexes
Every table with an `organizationId` or `workspaceId` includes a leading index to prevent cross-tenant table scans.

| Table | Index Columns | Index Type | Purpose |
| :--- | :--- | :--- | :--- |
| `organization_members` | `(organization_id, status)` | B-Tree | Filtering active members per organization |
| `workspaces` | `(organization_id, slug)` | B-Tree Unique | Rapid workspace lookup by URL slug |
| `courses` | `(organization_id, workspaceId)` | B-Tree | Listing courses within a workspace |
| `content_projects` | `(organization_id, workspace_id)` | B-Tree | Populating Content Library |
| `content_projects` | `(status, content_type)` | B-Tree | Filtering by Published/Draft & format |
| `media_assets` | `(organization_id, asset_type)` | B-Tree | Filtering media by image/video/audio |
| `media_assets` | `(workspace_id, folder_id)` | B-Tree | Media folder tree browsing |
| `scorm_packages` | `(organization_id, format)` | B-Tree | Export history and package filtering |
| `learners` | `(organization_id, email)` | B-Tree Unique | Deduplicating learners within a tenant |
| `learners` | `(organization_id, external_learner_id)` | B-Tree Unique | LMS user ID mapping |

---

### 2.2 Content Hierarchy & Authoring Performance Indexes
The 3-panel Authoring Workspace queries elements, slides, chapters, and revisions concurrently.

| Table | Index Columns | Index Type | Purpose |
| :--- | :--- | :--- | :--- |
| `content_elements` | `(content_project_id, element_type)` | B-Tree | Fetching all slides or questions for canvas |
| `content_elements` | `(parent_id, order_index)` | B-Tree | Preserving outline ordering (chapters -> slides) |
| `content_revisions` | `(content_project_id, revision_number)` | B-Tree | Fast lookup for undo/redo and audit diffs |
| `content_versions` | `(content_project_id, version_number)` | B-Tree Unique | Immutable version retrieval |
| `course_modules` | `(course_id, order_index)` | B-Tree | Sequential module navigation |
| `lessons` | `(module_id, order_index)` | B-Tree | Sequential lesson navigation |

---

### 2.3 H5P Dependency Resolution Indexes
H5P runtime packaging requires resolving dependency trees down to patch versions.

| Table | Index Columns | Index Type | Purpose |
| :--- | :--- | :--- | :--- |
| `h5p_libraries` | `(machine_name, major_version, minor_version)` | B-Tree Unique | Semantic library lookup |
| `h5p_library_dependencies` | `(library_id, dependency_type)` | B-Tree | Fetching preloaded JS/CSS dependencies |
| `h5p_library_dependencies` | `(required_library_id)` | B-Tree | Reverse lookup for cascade updates |
| `h5p_content_libraries` | `(h5p_content_id, library_id)` | B-Tree Unique | Content-to-library binding |

---

### 2.4 SCORM Runtime & High-Concurrency Tracking Indexes
SCORM runtimes write state on every interaction and slide advance.

| Table | Index Columns | Index Type | Purpose |
| :--- | :--- | :--- | :--- |
| `learning_attempts` | `(learner_id, content_project_id, attempt_number)` | B-Tree Unique | Enforcing single active attempt sequence |
| `learning_attempts` | `(content_project_id, status)` | B-Tree | Aggregating completion stats & pass rates |
| `scorm_runtime_records` | `(attempt_id)` | B-Tree Unique | 1-to-1 join with attempt during LMSCommit |
| `assessment_results` | `(attempt_id, is_correct)` | B-Tree | Computing final test scores & question analytics |
| `learner_progresses` | `(content_project_id, progress_percent)` | B-Tree | Distribution metrics across all learners |

---

### 2.5 System Operations & Worker Polling Indexes
Background workers poll queued packaging and synchronization tasks.

| Table | Index Columns | Index Type | Purpose |
| :--- | :--- | :--- | :--- |
| `background_jobs` | `(job_type, status)` | B-Tree | Worker polling (`WHERE status = 'QUEUED'`) |
| `audit_logs` | `(organization_id, created_at DESC)` | B-Tree | Paginated security audit timeline |
| `notifications` | `(user_id, is_read)` | B-Tree | User unread notification badge count |
| `storage_usages` | `(organization_id, recorded_at DESC)` | B-Tree | Historical storage consumption graphs |

---

## 3. Advanced PostgreSQL Index Recommendations (Post-Migration)

### GIN Indexes for JSONB Parameter Searches
For H5P parameters and SCORM CMI interaction structures:
```sql
-- Fast search within H5P parameter trees
CREATE INDEX idx_h5p_contents_params_gin ON h5p_contents USING GIN (parameters);

-- Fast lookup for specific CMI interaction IDs
CREATE INDEX idx_scorm_interactions_gin ON scorm_runtime_records USING GIN (cmi_interactions_json jsonb_path_ops);
```

### Partial Indexes for High-Velocity Queue Processing
```sql
-- Highly optimized index for pending worker jobs
CREATE INDEX idx_pending_jobs ON background_jobs (priority DESC, created_at ASC) 
WHERE status = 'QUEUED';

-- Rapid unread notifications
CREATE INDEX idx_user_unread_notifications ON notifications (user_id, created_at DESC) 
WHERE is_read = FALSE;
```
