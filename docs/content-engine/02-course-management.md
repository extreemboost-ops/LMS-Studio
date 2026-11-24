# Course, Module & Lesson Management

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.3 — Course Authoring, Content Projects & Interactive Content Engine  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Course Domain Architecture

Courses represent the highest-level educational curriculum unit in the studio. They organize instructional materials into sequential modules and lessons.

### 1.1 Course Entity Definition
- `id`: UUID (Primary Key)
- `organizationId`: UUID (Multi-tenant ownership)
- `workspaceId`: UUID (Workspace boundary)
- `title`: VarChar(255) (e.g. "Workplace Fire Safety & Evacuation 2026")
- `code`: VarChar(50) (e.g. "SAFETY 101")
- `description`: Text (Course syllabus overview)
- `coverImage`: VarChar(512) (Cover image URL)
- `coverColorIndex`: Int (Figma Make theme color palette index, 0-10)
- `status`: CourseStatus (`DRAFT`, `PUBLISHED`, `ARCHIVED`)
- `version`: Int (Curriculum version counter)
- `createdById`: UUID (User who created the course)

---

## 2. Module & Lesson Hierarchy

### 2.1 Course Modules (`CourseModule`)
Modules group related lessons into cohesive chapters:
- `id`: UUID
- `courseId`: UUID (Foreign key referencing `Course.id` with `onDelete: Cascade`)
- `title`: VarChar(255) (e.g. "Module 1: Combustion Dynamics")
- `description`: Text
- `orderIndex`: Int (Sequential sorting index within course)

### 2.2 Lessons (`Lesson`)
Lessons contain the individual learning activities:
- `id`: UUID
- `moduleId`: UUID (Foreign key referencing `CourseModule.id` with `onDelete: Cascade`)
- `contentProjectId`: UUID (Optional foreign key referencing `ContentProject.id` with `onDelete: SetNull`)
- `title`: VarChar(255) (e.g. "Lesson 1.1: Chemical Fire Extinguishers")
- `description`: Text
- `orderIndex`: Int (Sequential sorting index within module)
- `contentType`: VarChar(50) (e.g. "presentation", "video", "quiz")

---

## 3. Business Logic & Invariants

1. **Workspace & Tenant Verification:**  
   When creating a course, `CourseService.createCourse` validates that the target `workspaceId` belongs to the authenticated user's `organizationId`. Cross-tenant workspace assignment is impossible.
2. **Cascading Hierarchy:**  
   Deleting a course automatically cascades and removes all child modules and lessons without leaving orphan records in the database.
3. **Safe Content Linking:**  
   Lessons can link to a `ContentProject`. If a linked content project is deleted, the lesson's `contentProjectId` is automatically set to `NULL` via `onDelete: SetNull`, preserving the lesson record in the curriculum.
