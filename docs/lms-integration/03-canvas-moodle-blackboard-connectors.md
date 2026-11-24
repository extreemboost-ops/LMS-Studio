# 03 — Canvas, Moodle & Blackboard LMS Connectors

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.6 — LMS Integration Services  
**Platforms Covered:** Canvas LMS, Moodle Cloud, Blackboard Learn  

---

## 1. Canvas LMS Connector Architecture

### 1.1 Integration Modes
1. **LTI 1.3 Advantage Tool Registration:**
   - Client ID & Deployment ID configuration.
   - Assignment and Grade Services (AGS) lineitem injection.
2. **REST API Direct Developer Keys:**
   - API Base URL: `https://canvas.institution.edu`
   - Scopes: `url:GET|/api/v1/courses`, `url:POST|/api/v1/courses/:course_id/modules`, `url:POST|/api/v1/courses/:course_id/assignments`
   - Course module publishing & gradebook sync.

### 1.2 Deployment Lifecycle in Canvas
```
Studio Course / SCORM Package
       │
       ▼ (Publish Action)
Canvas Course API (`/api/v1/courses/:id/modules/:module_id/items`)
       │
       ▼
External Tool (LTI) / Web Resource Link Created
       │
       ▼
Learner Attempts in Canvas -> Launch Event Logged -> Grade Pushed via AGS
```

---

## 2. Moodle Cloud REST Web Services Connector

### 2.1 Web Services API Configuration
- API Base URL: `https://moodle.institution.edu/webservice/rest/server.php`
- Authentication: Moodle REST Web Service Token (`wstoken`)
- Format: `moodlewsrestformat=json`

### 2.2 Key Web Service Functions Used
- `core_course_get_courses`: Fetches course catalogue for destination selection.
- `mod_scorm_get_scorms_by_courses`: Discovers existing SCORM activities.
- `core_completion_update_activity_completion_status_manually`: Marks completion status on behalf of learners.

---

## 3. Blackboard Learn Connector

### 3.1 Integration Architecture
- LTI 1.3 Advantage Deep Linking v2.0 & AGS.
- Anthology Developer Portal Application registration with 3-legged OAuth2.
- Endpoint: `/learn/api/public/v1/courses`
