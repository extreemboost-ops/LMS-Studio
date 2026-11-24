# API Conventions & Response Contract Specification

**Project:** SCORM & H5P Authoring Studio  
**Document ID:** `docs/backend/04-api-conventions.md`  
**Milestone:** Phase 03.1 — Production Backend Foundation  
**Status:** Approved & Implemented  
**Date:** November 2026  

---

## 1. Versioned Route Prefix

All application APIs are mounted under the versioned route prefix:
```
/api/v1
```
Any breaking architectural changes in future phases can introduce `/api/v2` without disrupting existing client integrations.

---

## 2. Standardized API Response Structure

To maintain 100% parity with the existing frontend `ApiResponse<T>` contract (`src/services/api-client.ts`), all endpoints return responses encapsulated in a predictable standard envelope.

### Successful Response Format (`StandardApiResponse<T>`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": {
    "requestId": "0ead2f59-6bc8-478b-9005-eb3d28f745b1",
    "timestamp": "2026-11-20T16:16:23.377Z",
    "durationMs": 12
  }
}
```

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Request input validation failed",
    "details": [
      {
        "field": "title",
        "message": "String must contain at least 3 character(s)",
        "code": "too_small"
      }
    ]
  },
  "meta": {
    "requestId": "f5107085-d003-4e6f-8c29-615a1b598c50",
    "timestamp": "2026-11-20T16:16:24.537Z",
    "durationMs": 3
  }
}
```

---

## 3. Standard HTTP Status Codes

The API strictly adheres to standard REST semantics:

| HTTP Status | Semantic | Standard `errorCode` | Description |
|:---|:---|:---|:---|
| **200 OK** | Success | N/A | Resource retrieved, action completed, or health verified. |
| **201 Created** | Created | N/A | New entity (project, version, attempt) successfully persisted. |
| **400 Bad Request** | Bad Request | `BAD_REQUEST` | Malformed JSON, illegal parameter type. |
| **401 Unauthorized** | Unauthorized | `UNAUTHORIZED` | Missing, invalid, or expired authentication token. |
| **403 Forbidden** | Forbidden | `FORBIDDEN` | Valid token, but insufficient permissions or wrong tenant. |
| **404 Not Found** | Not Found | `NOT_FOUND` | Target entity or route does not exist. |
| **409 Conflict** | Conflict | `CONFLICT` | Entity duplicate or unique constraint collision. |
| **422 Unprocessable** | Validation Error | `VALIDATION_FAILED` | Input payload failed Zod schema checks. |
| **429 Too Many Req** | Rate Limited | `RATE_LIMIT_EXCEEDED`| Client exceeded requests per time window. |
| **500 Internal Error** | Server Error | `INTERNAL_SERVER_ERROR`| Unhandled server exception (stack redacted in production). |
| **503 Unavailable** | Dependency Down | `SERVICE_UNAVAILABLE`| Required dependency (PostgreSQL database) is offline. |

---

## 4. Input Validation with Zod

Request validation is handled declaratively using `validateRequest({ body, query, params })`:

```typescript
import { z } from "zod";
import { validateRequest } from "../../middlewares/validateRequest.js";

const createProjectSchema = z.object({
  title: z.string().min(3).max(255),
  type: z.enum([
    "PRESENTATION",
    "INTERACTIVE_VIDEO",
    "INTERACTIVE_BOOK",
    "QUESTION_SET",
    "MULTI_CHOICE",
    "DRAG_DROP",
    "FILL_BLANKS",
    "TRUE_FALSE",
    "FLASHCARDS",
    "IMAGE_HOTSPOTS",
  ]),
  description: z.string().optional(),
});

// Mounted in router:
router.post(
  "/",
  validateRequest({ body: createProjectSchema }),
  ProjectController.create
);
```

---

## 5. Standard Health & Observability Endpoints

### 1. `GET /api/v1/health`
- **Purpose:** System resource and uptime verification.
- **Payload:** Version, uptime in seconds, Node.js environment, memory consumption (`heapUsedMB`, `heapTotalMB`, `rssMB`), ISO timestamp.
- **Status:** Always returns `200 OK` if the Node.js process is responsive.

### 2. `GET /api/v1/health/database`
- **Purpose:** Active connection diagnostic with the PostgreSQL database.
- **Payload:** Database engine name, status (`UP` / `DOWN`), query latency in milliseconds, timestamp, and connection error details (if DOWN).
- **Status:** Returns `200 OK` when responsive; returns `503 Service Unavailable` when unreachable.

### 3. `GET /api/v1/health/readiness`
- **Purpose:** Container orchestrator readiness probe (e.g. Kubernetes, AWS ECS, Google Cloud Run).
- **Payload:** `ready` boolean and dependency check breakdown (`database`, `configuration`).
- **Status:** Returns `200 OK` when all dependencies are UP; returns `503 Service Unavailable` if database is down.
