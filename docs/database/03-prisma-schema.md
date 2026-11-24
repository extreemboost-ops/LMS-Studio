# 03 - Complete Prisma Schema Proposal & Entity Documentation

**Project:** SCORM & H5P Authoring Studio  
**Phase:** 02 — Database Architecture & Schema Design  
**Schema File Location:** `prisma/schema.prisma`  

---

## 1. Schema Design Philosophy

The Prisma schema has been designed with strict adherence to:
1. **Relational Integrity:** Explicit foreign keys with `@relation`, defining cascade rules (`onDelete: Cascade` for subordinate child entities, `onDelete: Restrict` for critical references such as author/creators, and `onDelete: SetNull` for non-critical lookups).
2. **Column Naming Consistency:** Models use idiomatic PascalCase in Prisma while mapping to snake_case table and column names in PostgreSQL using `@map` and `@@map`.
3. **Optimized Typing:** Exact SQL types (`@db.Uuid`, `@db.VarChar`, `@db.Text`, `@db.JsonB`, `@db.Decimal(5, 2)`, `@db.BigInt`).
4. **Tenant Isolation:** High-cardinality multi-tenant models carry foreign keys to `Organization` and/or `Workspace`, indexed with composite keys (`[organizationId, id]` or `[organizationId, status]`).

---

## 2. Model Index & Categorization

| # | Model Name | SQL Table Name | Category | Primary Key | Description |
| :- | :--- | :--- | :--- | :--- | :--- |
| 1 | `Organization` | `organizations` | Auth & Tenancy | UUID | Tenant root entity with quota and plan |
| 2 | `User` | `users` | Auth & Tenancy | UUID | System user account identity |
| 3 | `OrganizationMember` | `organization_members` | Auth & Tenancy | UUID | User-to-organization membership and status |
| 4 | `Role` | `roles` | Auth & Tenancy | UUID | System & tenant-specific RBAC roles |
| 5 | `Permission` | `permissions` | Auth & Tenancy | UUID | Granular platform permission flags |
| 6 | `RolePermission` | `role_permissions` | Auth & Tenancy | Composite | Many-to-many permission assignment |
| 7 | `Workspace` | `workspaces` | Auth & Tenancy | UUID | Isolated workspace container within tenant |
| 8 | `Course` | `courses` | Content | UUID | Curriculum learning path container |
| 9 | `CourseModule` | `course_modules` | Content | UUID | Module grouping inside courses |
| 10 | `Lesson` | `lessons` | Content | UUID | Individual lesson linking to projects |
| 11 | `ContentProject` | `content_projects` | Content | UUID | Authoring project (Presentation, Video, Book, etc.) |
| 12 | `ContentDocument` | `content_documents` | Content | UUID | Structured draft/published authoring document |
| 13 | `ContentVersion` | `content_versions` | Content | UUID | Immutable milestone snapshot payload |
| 14 | `ContentElement` | `content_elements` | Content | UUID | Slide, question, hotspot, or layout node |
| 15 | `ContentRevision` | `content_revisions` | Content | UUID | Incremental autosave audit diff log |
| 16 | `H5PContent` | `h5p_contents` | H5P Engine | UUID | H5P content instance with parameter JSON |
| 17 | `H5PLibrary` | `h5p_libraries` | H5P Engine | UUID | H5P library package definition |
| 18 | `H5PLibraryDependency` | `h5p_library_dependencies` | H5P Engine | UUID | Dependency graph between libraries |
| 19 | `H5PContentLibrary` | `h5p_content_libraries` | H5P Engine | UUID | Active libraries loaded by H5P content |
| 20 | `H5PPackageImport` | `h5p_package_imports` | H5P Engine | UUID | Incoming `.h5p` archive extraction audit |
| 21 | `H5PPackageExport` | `h5p_package_exports` | H5P Engine | UUID | Outgoing `.h5p` artifact distribution record |
| 22 | `MediaAsset` | `media_assets` | Media | UUID | Uploaded media file record |
| 23 | `MediaFolder` | `media_folders` | Media | UUID | Hierarchical folder tree in media library |
| 24 | `MediaMetadata` | `media_metadata` | Media | UUID | Video/audio technical attributes |
| 25 | `MediaUsage` | `media_usages` | Media | UUID | References tracking asset usage across slides |
| 26 | `SCORMPackage` | `scorm_packages` | SCORM | UUID | Packaged SCORM distribution artifact |
| 27 | `SCORMExportJob` | `scorm_export_jobs` | SCORM | UUID | Background packaging job tracker |
| 28 | `SCORMManifest` | `scorm_manifests` | SCORM | UUID | SCORM `imsmanifest.xml` and metadata |
| 29 | `SCORMRuntimeConfiguration` | `scorm_runtime_configurations` | SCORM | UUID | SCORM launch, mastery score and tracking settings |
| 30 | `SCORMContentMapping` | `scorm_content_mappings` | SCORM | UUID | SCO item identifier mapping to elements |
| 31 | `LMSPlatform` | `lms_platforms` | Integrations | UUID | LMS platform catalog (Moodle, Canvas, etc.) |
| 32 | `LMSConnection` | `lms_connections` | Integrations | UUID | Tenant-specific LMS connection endpoint |
| 33 | `LMSDeployment` | `lms_deployments` | Integrations | UUID | Course/Package deployment in external LMS |
| 34 | `LMSActivityLog` | `lms_activity_logs` | Integrations | UUID | Synchronous/asynchronous sync event audit |
| 35 | `Learner` | `learners` | Tracking | UUID | Learner identity profile |
| 36 | `Enrollment` | `enrollments` | Tracking | UUID | Course enrollment and final grade |
| 37 | `LearningAttempt` | `learning_attempts` | Tracking | UUID | High-level attempt record with score/time |
| 38 | `LearningSession` | `learning_sessions` | Tracking | UUID | Physical browser session sitting |
| 39 | `AssessmentResult` | `assessment_results` | Tracking | UUID | Question-level responses and points |
| 40 | `LearnerProgress` | `learner_progresses` | Tracking | UUID | Progress percentages and slides viewed |
| 41 | `SCORMRuntimeRecord` | `scorm_runtime_records` | Tracking | UUID | Strict SCORM 1.2 / 2004 CMI data record |
| 42 | `BackgroundJob` | `background_jobs` | Operations | UUID | System async worker job queue |
| 43 | `AuditLog` | `audit_logs` | Operations | UUID | Security and compliance audit trail |
| 44 | `Notification` | `notifications` | Operations | UUID | In-app user notifications |
| 45 | `StorageUsage` | `storage_usages` | Operations | UUID | Periodic storage quota snapshots |

---

## 3. Schema File Pointer

The authoritative declarative source is placed in:  
`prisma/schema.prisma`

All relationships, cascading behaviors, composite unique keys, and column typings have been structured for PostgreSQL 16+ compatibility.
