# 04 — SCORM Cloud & Generic API Connectors

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.6 — LMS Integration Services  
**Platforms Covered:** SCORM Cloud v2, Docebo, Custom LMS Webhook / REST  

---

## 1. SCORM Cloud v2 API Connector

### 1.1 Architecture & Endpoints
- **Service Provider:** Rustici Software SCORM Cloud
- **Base Endpoint:** `https://cloud.scorm.com/api/v2`
- **Authentication:** HTTP Basic Authentication using `AppId` and `SecretKey`.
- **Primary Workflows:**
  1. **Course Upload (`POST /courses/upload`):** Directly streams generated SCORM ZIP packages or H5P archives to SCORM Cloud.
  2. **Registration Provisioning (`POST /registrations`):** Links a tenant learner to a course version.
  3. **Launch Link Generation (`POST /registrations/{registrationId}/launchLink`):** Produces a time-limited learner launch URL.
  4. **Reporting Fetch (`GET /registrations/{registrationId}/progress`):** Retrieves CMI interaction details and completion states.

---

## 2. Generic Custom LMS Integration

For bespoke LMS environments, enterprise HRIS systems, and intranet training portals:
- **Authentication:** `API_KEY`, Bearer Token, or Custom Request Headers.
- **Payload Format:** JSON Webhooks triggered on course publishing, version increments, or learner attempt completions.
- **Activity Logging:** Every webhook payload, response code, and latency measurement is recorded in `lms_activity_logs`.
