# 06 — SCORM Engine API Reference

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.5 — SCORM 1.2 & 2004 Runtime & Packaging Engine  
**Base URL:** `/api/v1`  

---

## 1. SCORM Packaging & Export Endpoints

### 1.1 Export Project to SCORM Package
- **Endpoint:** `POST /organizations/:organizationId/projects/:projectId/scorm/export`
- **Permissions:** `requireAuth`, `resolveTenantContext`, `requirePermission("content:publish")`
- **Request Body:**
```json
{
  "format": "SCORM_2004_4TH_EDITION",
  "packageTitle": "Chemical Safety Protocols",
  "versionString": "1.0.0",
  "launchBehavior": "NEW_WINDOW",
  "completionCriteria": "BOTH",
  "passingScorePercent": 80,
  "trackingMode": "SCORE_AND_STATUS",
  "masteryScoreDecimal": 0.80,
  "timeLimitAction": "continue,no message"
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "packageId": "b1a2c3d4-...",
    "jobId": "e5f6g7h8-...",
    "format": "SCORM_2004_4TH_EDITION",
    "title": "Chemical Safety Protocols",
    "version": "1.0.0",
    "manifestIdentifier": "MANIFEST-PROJ01-1700000000",
    "checksumSha256": "4a7d...391e",
    "storageKey": "organizations/.../scorm/MANIFEST-PROJ01-1700000000.zip",
    "fileSizeBytes": "12582912",
    "launchFile": "index.html",
    "status": "ready",
    "progress": 100
  }
}
```

### 1.2 List Packages for Organization
- **Endpoint:** `GET /organizations/:organizationId/scorm/packages`
- **Query Params:** `?projectId=uuid` (optional filter)
- **Permissions:** `requireAuth`, `resolveTenantContext`, `requirePermission("content:view")`

### 1.3 Get Package Details
- **Endpoint:** `GET /organizations/:organizationId/scorm/packages/:packageId`
- **Permissions:** `requireAuth`, `resolveTenantContext`, `requirePermission("content:view")`

### 1.4 Download Manifest XML
- **Endpoint:** `GET /organizations/:organizationId/scorm/packages/:packageId/manifest`
- **Content-Type:** `application/xml`
- **Permissions:** `requireAuth`, `resolveTenantContext`, `requirePermission("content:view")`

---

## 2. SCORM Runtime & Learner Tracking Endpoints

### 2.1 Initialize Runtime Session
- **Endpoint:** `POST /organizations/:organizationId/scorm/runtime/initialize`
- **Request Body:**
```json
{
  "learnerId": "11111111-1111-4111-a111-111111111111",
  "contentProjectId": "22222222-2222-4222-a222-222222222222",
  "scormStandard": "SCORM_2004_4TH_EDITION",
  "mode": "normal",
  "credit": "credit"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "sessionId": "s-12345",
    "attemptId": "a-12345",
    "attemptNumber": 1,
    "status": "INCOMPLETE",
    "scormStandard": "SCORM_2004_4TH_EDITION",
    "cmi": {
      "cmi._version": "1.0",
      "cmi.completion_status": "incomplete",
      "cmi.success_status": "unknown",
      "cmi.location": "",
      "cmi.score.scaled": "",
      "cmi.total_time": "PT0S"
    }
  }
}
```

### 2.2 Commit Runtime Session (Immediate Zero-Debounce)
- **Endpoint:** `POST /organizations/:organizationId/scorm/runtime/commit`
- **Request Body:**
```json
{
  "attemptId": "11111111-1111-4111-a111-111111111111",
  "scormStandard": "SCORM_2004_4TH_EDITION",
  "location": "slide-4",
  "suspendData": "state:slide-4;answers:[1,0,1]",
  "completionStatus": "completed",
  "successStatus": "passed",
  "scoreRaw": 95,
  "scoreScaled": 0.95,
  "sessionTime": "PT5M30S"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "persistedAt": "2026-11-20T20:17:00.000Z",
    "totalTimeSeconds": 330,
    "status": "PASSED",
    "scoreRaw": 95,
    "scoreScaled": 0.95,
    "location": "slide-4"
  }
}
```

### 2.3 Terminate Runtime Session
- **Endpoint:** `POST /organizations/:organizationId/scorm/runtime/terminate`
- **Request Body:**
```json
{
  "attemptId": "11111111-1111-4111-a111-111111111111",
  "scormStandard": "SCORM_2004_4TH_EDITION",
  "sessionTime": "PT0S",
  "exit": "normal"
}
```

---

## 3. Generic Frontend Export Endpoint

### 3.1 Start Export Job (Matches Export Modal)
- **Endpoint:** `POST /api/v1/export/jobs`
- **Request Body:**
```json
{
  "format": "SCORM 2004",
  "packageName": "Worker Safety 101",
  "version": "1.0",
  "passingScore": 80
}
```
- **Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "job-1700000000",
    "packageName": "Worker Safety 101.zip",
    "format": "SCORM 2004",
    "status": "ready",
    "progress": 100,
    "createdAt": "2026-11-20T20:17:00.000Z",
    "fileSize": "18.4 MB"
  }
}
```
