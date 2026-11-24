# Content Engine API Reference

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.3 — Course Authoring, Content Projects & Interactive Content Engine  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Overview & Authentication

All endpoints are versioned under `/api/v1` and require:
1. `Authorization: Bearer <JWT_ACCESS_TOKEN>`
2. Verified tenant membership (validated via URL `:organizationId` route parameter).
3. The required RBAC permission for the operation.

---

## 2. Course Endpoints (`/api/v1/organizations/:organizationId/courses`)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | `content:view` | Lists all courses in organization (filterable by `workspaceId`, `status`) |
| `POST` | `/` | `content:create` | Creates a new course in a verified workspace |
| `GET` | `/:courseId` | `content:view` | Retrieves full course hierarchy with modules and lessons |
| `PATCH` | `/:courseId` | `content:edit` | Updates course metadata (title, code, status, theme) |
| `DELETE` | `/:courseId` | `content:delete` | Deletes course and its cascaded modules and lessons |

### Module & Lesson Sub-Endpoints

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/:courseId/modules` | `content:edit` | Creates a module within a course |
| `PATCH` | `/:courseId/modules/:moduleId` | `content:edit` | Updates module title, description, or orderIndex |
| `DELETE` | `/:courseId/modules/:moduleId` | `content:edit` | Deletes a module and its lessons |
| `POST` | `/:courseId/modules/:moduleId/lessons` | `content:edit` | Creates a lesson within a module |
| `PATCH` | `/:courseId/modules/:moduleId/lessons/:lessonId` | `content:edit` | Updates lesson title or linked contentProject |
| `DELETE` | `/:courseId/modules/:moduleId/lessons/:lessonId` | `content:edit` | Deletes a lesson |

---

## 3. Content Project Endpoints (`/api/v1/organizations/:organizationId/projects`)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | `content:view` | Lists interactive content projects (filters: `workspaceId`, `status`, `contentType`, `search`) |
| `POST` | `/` | `content:create` | Creates interactive project with starter document and slide element |
| `GET` | `/:projectId` | `content:view` | Retrieves project with document settings and element hierarchy |
| `PATCH` | `/:projectId` | `content:edit` | Updates project metadata (title, description, status, theme) |
| `POST` | `/:projectId/duplicate` | `content:create` | Deep clones project, document, and element tree with remapped IDs |
| `DELETE` | `/:projectId` | `content:delete` | Deletes project and its cascaded tree |
| `PUT` | `/:projectId/document` | `content:edit` | Updates project document settings and presentation metadata |
| `POST` | `/:projectId/elements` | `content:edit` | Creates an element (slide, question, hotspot, media) in project |
| `PATCH` | `/:projectId/elements/:elementId` | `content:edit` | Updates an element's configuration or order |
| `DELETE` | `/:projectId/elements/:elementId` | `content:edit` | Deletes an element and its child elements |
| `POST` | `/:projectId/elements/reorder` | `content:edit` | Batched reordering of elements within project |
| `POST` | `/:projectId/versions` | `content:publish` | Creates an immutable published version snapshot |
| `GET` | `/:projectId/versions` | `content:view` | Lists historical version snapshots |
