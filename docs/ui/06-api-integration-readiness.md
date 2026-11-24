# 06 - Backend API Integration Readiness

**Project:** SCORM & H5P Authoring Studio  
**Future Services:** Node.js Backend, PostgreSQL, H5P Core Engine, SCORM 1.2/2004 Packaging Engine, Cloud Storage  

---

## 1. Overview & Service Contracts

To allow backend developers to wire in real endpoints without rewriting frontend UI components, the application establishes a clean service abstraction layer in `src/services/`.

Each service exposes typed asynchronous methods returning standard API response envelopes:

```typescript
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}
```

---

## 2. Service Inventory & Target Endpoints

### 2.1 Content Service (`src/services/content.service.ts`)
| Method | Target Route | Description |
| :--- | :--- | :--- |
| `getProjects(params)` | `GET /api/v1/projects` | Fetch paginated/filtered content projects |
| `getProjectById(id)` | `GET /api/v1/projects/:id` | Fetch full project document with slides & questions |
| `createProject(payload)`| `POST /api/v1/projects` | Initialize a new H5P/SCORM project |
| `updateProject(id, data)`| `PUT /api/v1/projects/:id` | Update metadata, settings, or slide contents |
| `duplicateProject(id)` | `POST /api/v1/projects/:id/duplicate`| Clone an existing project |
| `deleteProject(id)` | `DELETE /api/v1/projects/:id` | Soft delete / remove project |
| `importH5P(file)` | `POST /api/v1/h5p/import` | Validate and unpack `.h5p` archive |

### 2.2 Course Service (`src/services/course.service.ts`)
| Method | Target Route | Description |
| :--- | :--- | :--- |
| `getCourses()` | `GET /api/v1/courses` | Fetch course learning paths |
| `getCourseById(id)` | `GET /api/v1/courses/:id` | Fetch course modules and learner enrollment |

### 2.3 Media Service (`src/services/media.service.ts`)
| Method | Target Route | Description |
| :--- | :--- | :--- |
| `getMediaAssets(type)` | `GET /api/v1/media` | Fetch media assets filtered by mime type |
| `uploadMedia(file)` | `POST /api/v1/media/upload` | Multipart file upload to Cloud Storage |
| `deleteMedia(id)` | `DELETE /api/v1/media/:id` | Remove asset |

### 2.4 Export Service (`src/services/export.service.ts`)
| Method | Target Route | Description |
| :--- | :--- | :--- |
| `startExportJob(config)` | `POST /api/v1/export/jobs` | Queue SCORM 1.2/2004 or H5P packaging job |
| `getExportStatus(jobId)` | `GET /api/v1/export/jobs/:id` | Poll background packaging task |
| `getExportHistory()` | `GET /api/v1/export/history` | Fetch 30-day package export logs |

### 2.5 LMS Integration Service (`src/services/integration.service.ts`)
| Method | Target Route | Description |
| :--- | :--- | :--- |
| `getIntegrations()` | `GET /api/v1/integrations` | List active LMS connectors (Moodle, Canvas, etc.) |
| `connectLMS(config)` | `POST /api/v1/integrations/connect` | Authorize LTI / REST connection to LMS |
| `triggerSync(id)` | `POST /api/v1/integrations/:id/sync` | Push content package to LMS |

### 2.6 Analytics Service (`src/services/analytics.service.ts`)
| Method | Target Route | Description |
| :--- | :--- | :--- |
| `getDashboardMetrics()` | `GET /api/v1/analytics/dashboard` | Fetch KPI stats, learner counts, storage |
| `getEngagementData()` | `GET /api/v1/analytics/engagement` | Time-series engagement telemetry |

---

## 3. Data Schema Compliance

The frontend data structures are aligned with industry standard learning specifications:
- **H5P Specification:** Adheres to library structure (`H5P.InteractiveVideo 1.24`, `H5P.CoursePresentation 1.22`, `H5P.MultiChoice 1.16`).
- **SCORM 1.2 / SCORM 2004 4th Edition:** Manifest structures (`imsmanifest.xml`), tracking parameters (`cmi.core.lesson_status`, `cmi.score.raw`, `cmi.suspend_data`).
- **LTI 1.3:** Learning Tools Interoperability payload structures for LMS communication.
