# 06 — LMS Integration Services API Reference

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.6 — LMS Integration Services  
**Base URL:** `/api/v1`  

---

## 1. Public LTI 1.3 Advantage Endpoints

### 1.1 Public JWKS Keyset
- **Endpoint:** `GET /api/v1/lti/1.3/jwks`
- **Authentication:** Public
- **Content-Type:** `application/json`
- **Response (200 OK):**
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "key-37910a",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

### 1.2 OIDC Login Initiation
- **Endpoint:** `GET /api/v1/lti/1.3/login_initiations` / `POST /api/v1/lti/1.3/login_initiations`
- **Parameters:** `iss`, `login_hint`, `target_link_uri`, `client_id`, `lti_message_hint`
- **Response:** `302 Redirect` to platform authorization endpoint with `response_type=id_token`, `scope=openid`, `state`, `nonce`.

### 1.3 LTI 1.3 Launch Handler
- **Endpoint:** `POST /api/v1/lti/1.3/launch`
- **Request Body:** `{ "id_token": "...", "state": "..." }`
- **Response (200 OK):** Provisions learner, resolves deployment, and renders content player.

---

## 2. Organization-Scoped LMS Management Endpoints

### 2.1 List Supported Platforms
- **Endpoint:** `GET /api/v1/organizations/:organizationId/lms/platforms`
- **Permissions:** `settings:view`

### 2.2 Create Connection
- **Endpoint:** `POST /api/v1/organizations/:organizationId/lms/connections`
- **Permissions:** `settings:edit`
- **Request Body:**
```json
{
  "workspaceId": "uuid",
  "platformCode": "CANVAS",
  "name": "Canvas Main Instance",
  "apiBaseUrl": "https://canvas.institution.edu",
  "authType": "OAUTH2",
  "credentials": {
    "clientId": "canvas_123",
    "clientSecret": "sec_9941",
    "authUrl": "https://canvas.institution.edu/login/oauth2/auth",
    "tokenUrl": "https://canvas.institution.edu/login/oauth2/token"
  }
}
```

### 2.3 Test Connection
- **Endpoint:** `POST /api/v1/organizations/:organizationId/lms/connections/:connectionId/test`
- **Permissions:** `settings:edit`

### 2.4 Create Deployment (Publish to LMS)
- **Endpoint:** `POST /api/v1/organizations/:organizationId/lms/deployments`
- **Permissions:** `content:publish`
- **Request Body:**
```json
{
  "lmsConnectionId": "uuid",
  "courseId": "uuid",
  "externalCourseId": "canvas_course_301",
  "title": "Hazard Communication & Safety"
}
```

### 2.5 Push Grade to LMS Gradebook (AGS)
- **Endpoint:** `POST /api/v1/organizations/:organizationId/lms/grade-push`
- **Permissions:** `content:edit`
- **Request Body:**
```json
{
  "deploymentId": "uuid",
  "learnerId": "uuid",
  "scoreGiven": 95.0,
  "scoreMaximum": 100.0,
  "activityProgress": "Completed",
  "gradingProgress": "FullyGraded"
}
```

---

## 3. Generic Frontend Integration Endpoints

- `GET /api/v1/integrations`: Lists active connections mapped to Figma Make UI types (`LMSIntegration[]`).
- `GET /api/v1/integrations/sync-history`: Lists recent activity events (`SyncActivity[]`).
