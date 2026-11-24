# H5P Core Engine API Reference

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.4 — H5P Core Engine Integration & Library Management  
**Date:** November 2026  
**Status:** `IMPLEMENTED & VERIFIED`

---

## 1. Library Registry Endpoints (`/api/v1/h5p/libraries`)

| Method | Endpoint | Access / Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | Public / Token | Lists registered libraries (filters: `runnable`, `search`) |
| `GET` | `/:libraryId` | Public / Token | Retrieves library details with semantics schema and dependencies |
| `GET` | `/:libraryId/assets` | Public / Token | Resolves ordered preloaded JS and CSS scripts via dependency DAG |
| `POST` | `/` | `requireAuth` (Admin/Author) | Installs or upgrades an H5P library package |

---

## 2. Project H5P Content Endpoints (`/api/v1/organizations/:organizationId/projects/:projectId/h5p`)

All routes require `requireAuth`, `resolveTenantContext`, and specific RBAC permissions.

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/` | `content:view` | Retrieves H5P content instance with parameters and player asset bundle |
| `PUT` | `/` | `content:edit` | Validates and persists H5P parameters, producing `filteredParameters` |
| `POST` | `/validate` | `content:edit` | Validates parameters against library semantics without persisting |

---

## 3. Package Import Endpoints (`/api/v1/organizations/:organizationId/h5p`)

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/import` | `content:create` | Queues an `.h5p` zip package upload and creates an `H5PPackageImport` job |
