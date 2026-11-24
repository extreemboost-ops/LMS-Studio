# PHASE 02 — Enterprise Database Architecture & Schema Design

Continue development of the existing SCORM & H5P Studio project.

The frontend architecture has already been implemented and documented.

Your task is to design a complete, production-grade relational database architecture for the platform.

## 1. First Inspect Existing Architecture

Read the following documentation:

- docs/ui/01-current-codebase-audit.md
- docs/ui/02-frontend-architecture.md
- docs/ui/03-component-inventory.md
- docs/ui/05-state-management.md
- docs/ui/06-api-integration-readiness.md

Inspect all existing TypeScript interfaces in src/types/.

Understand existing frontend data models before designing database entities.

Do not unnecessarily duplicate existing models.

## 2. Database Technology

Use:

- PostgreSQL
- Prisma ORM
- TypeScript

Design the database for a multi-tenant SaaS architecture.

Organizations must have isolated data.

Users may belong to multiple organizations with different roles.

## 3. Required Database Modules

Design complete relational models for:

### Authentication & Organizations
- User
- Organization
- OrganizationMember
- Role
- Permission
- RolePermission
- Workspace

### Courses & Content
- Course
- CourseModule
- Lesson
- ContentProject
- ContentDocument
- ContentVersion
- ContentElement
- ContentRevision

### H5P Engine
- H5PContent
- H5PLibrary
- H5PLibraryDependency
- H5PContentLibrary
- H5PPackageImport
- H5PPackageExport

Support H5P library metadata, versions, dependencies and content references.

### Media Management
- MediaAsset
- MediaFolder
- MediaUsage
- MediaMetadata

### SCORM
- SCORMPackage
- SCORMExportJob
- SCORMManifest
- SCORMRuntimeConfiguration
- SCORMContentMapping

Support SCORM 1.2 and SCORM 2004 as distinct versions.

### LMS Integrations
- LMSPlatform
- LMSConnection
- LMSDeployment
- LMSActivityLog

### Learner Tracking
- Learner
- Enrollment
- LearningAttempt
- LearningSession
- AssessmentResult
- LearnerProgress
- SCORMRuntimeRecord

Design tracking models with the differences between SCORM 1.2 and SCORM 2004 in mind.

### System Management
- BackgroundJob
- AuditLog
- Notification
- StorageUsage

## 4. Database Design Requirements

For every model define:

- Primary key
- Foreign keys
- Required fields
- Optional fields
- Data types
- Unique constraints
- Indexes
- Relationships
- Cascade behavior

Use UUID identifiers where appropriate.

Include createdAt and updatedAt fields where appropriate.

Use JSONB only for genuinely flexible structures such as H5P content parameters, SCORM runtime data or configurable content documents.

Do not store everything in generic JSON fields.

Ensure organization-level isolation and authorization.

## 5. Content Versioning

Design a reliable content versioning system.

Requirements:

- Every saved content revision must be identifiable.
- Previous versions must remain recoverable.
- Draft and published states must be supported.
- SCORM exports must reference the exact content version used to generate them.
- H5P packages must preserve their relevant library dependency versions.

## 6. SCORM Tracking Architecture

Design storage for:

- Learner ID
- Registration / attempt ID
- SCO identifier
- Completion status
- Success status
- Score raw
- Score scaled
- Score minimum
- Score maximum
- Session time
- Total time
- Suspend data
- Bookmark / location
- Entry mode
- Exit mode
- Interaction records

Preserve the differences between SCORM 1.2 and SCORM 2004 data models.

Avoid designing a schema that loses SCORM-specific runtime information.

## 7. H5P Architecture

Design a normalized structure for:

- H5P package metadata
- Content JSON
- Library metadata
- Library versions
- Required dependencies
- Preloaded dependencies
- Editor dependencies
- Installed libraries
- Content-to-library mappings

Support future library updates without silently breaking existing content.

## 8. Deliverables

Create:

docs/database/
- 01-database-architecture.md
- 02-entity-relationship-diagram.md
- 03-prisma-schema.md
- 04-indexing-strategy.md
- 05-multitenancy-security.md
- 06-h5p-data-model.md
- 07-scorm-tracking-model.md
- 08-content-versioning.md
- 09-database-migration-plan.md

Include Mermaid ER diagrams.

Prepare a complete Prisma schema proposal.

## 9. Execution Restrictions

This phase is database architecture and schema planning.

Do not implement the complete backend yet.

Do not destroy or modify the existing frontend.

Do not replace the existing frontend interfaces without documenting the reason.

Do not generate fake database records.

Do not assume H5P or SCORM integration already exists.

Do not use generic JSON fields as a substitute for proper relational modeling.

Do not start migrations until the schema has been reviewed.

At the end, provide:

1. Complete entity inventory.
2. Relationship overview.
3. Prisma schema.
4. ER diagram.
5. Indexing strategy.
6. Tenant isolation strategy.
7. SCORM tracking design.
8. H5P dependency design.
9. Potential scalability issues.

Wait for approval before Phase 03.