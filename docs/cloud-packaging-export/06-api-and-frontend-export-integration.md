# API Specification & Frontend Export Modal Integration

## 1. REST Endpoints Specification

### A. Initiate Export Job
- **Endpoint**: `POST /api/v1/export/jobs`
- **Headers**: `Content-Type: application/json`, `Cookie: access_token=...`
- **Request Body**:
  ```json
  {
    "projectId": "11111111-1111-4111-a111-111111111111",
    "packageName": "workplace-safety-2026",
    "format": "SCORM 2004",
    "version": "1.0.0",
    "passingScore": 80,
    "launchBehavior": "new-window"
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "success": true,
    "statusCode": 201,
    "message": "Export job initiated and packaged successfully",
    "data": {
      "id": "job-d8a1c944",
      "packageName": "workplace-safety-2026.zip",
      "format": "SCORM 2004",
      "status": "ready",
      "progress": 100,
      "createdAt": "2026-11-22T02:15:00.000Z",
      "downloadUrl": "/api/v1/storage/download/eyJzdG9yYWdlS2V5I...",
      "fileSize": "18.4 MB"
    }
  }
  ```

### B. Query Export Job Status
- **Endpoint**: `GET /api/v1/export/jobs/:jobId`
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "statusCode": 200,
    "data": {
      "id": "job-d8a1c944",
      "status": "COMPLETED",
      "progress": 100,
      "result": {
        "downloadUrl": "/api/v1/storage/download/eyJzdG9yYWdlS2V5I...",
        "fileSizeBytes": 19293792,
        "checksumSha256": "4f9a0c2e..."
      }
    }
  }
  ```

### C. Download Binary Package
- **Endpoint**: `GET /api/v1/storage/download/:token`
- **Headers Returned**:
  - `Content-Type`: `application/zip`
  - `Content-Disposition`: `attachment; filename="workplace-safety-2026.zip"`
  - `Content-Length`: `19293792`
  - `Cache-Control`: `private, no-transform, no-store`

---

## 2. Frontend UI Integration

### `ExportCenter.tsx`
- Preserves all Figma Make classes: `.export-layout`, `.export-cards`, `.package-icon`, `.select-ring`, `.recommended`, `.export-config`, `.form-grid`, `.export-summary`.
- Format selectors: Native H5P, SCORM 1.2, SCORM 2004.
- Dynamic package name, version, passing score stepper, tracking mode.
- Triggers `setModal("export")` upon user confirmation.

### `ModalLayer.tsx` (`modal === "export"`)
- Renders the confirmation dialog with live configuration summary.
- Invokes `ExportService.startExportJob(config)`.
- Updates modal UI dynamically to "Package Ready" upon successful bundling.
- Provides a direct `<a download>` trigger pointing to `downloadUrl`.
