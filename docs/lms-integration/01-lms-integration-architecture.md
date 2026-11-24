# 01 — LMS Integration Services Architecture

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.6 — LMS Integration Services (LTI 1.3 Advantage, Canvas, Moodle, Blackboard, SCORM Cloud)  
**Standards:** 1EdTech LTI 1.3 Advantage (Core, AGS v2.0, NRPS v2.0, Deep Linking v2.0), Canvas REST API, Moodle Web Services, Blackboard Learn REST  

---

## 1. Executive Architecture

The LMS Integration subsystem connects the SCORM & H5P Authoring Studio to enterprise Learning Management Systems (LMS). It enables course creators to publish interactive courses, H5P modules, and SCORM packages directly to external LMS platforms and synchronize learner attempts, completions, and grades automatically.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Authoring Studio Client                         │
│                     (Integrations & Sync Manager)                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴───────────────────┐
               ▼                                        ▼
   ┌───────────────────────┐                ┌───────────────────────┐
   │ LTI 1.3 Advantage     │                │ Direct REST API       │
   │  - OIDC 3rd Party Flow│                │  - Canvas REST API    │
   │  - RS256 JWKS Key Set │                │  - Moodle Web Services│
   │  - AGS Grade Push     │                │  - Blackboard Learn   │
   │  - Deep Linking v2.0  │                │  - SCORM Cloud v2     │
   └───────────┬───────────┘                └───────────┬───────────┘
               │                                        │
               ▼                                        ▼
   ┌───────────────────────┐                ┌───────────────────────┐
   │ AES-256-GCM Crypto    │                │ Relational Database   │
   │  - Zero-Trust Keys    │                │  - lms_platforms      │
   │  - Tamper Detection   │                │  - lms_connections    │
   │  - Credential Masking │                │  - lms_deployments    │
   │                       │                │  - lms_activity_logs  │
   │                       │                │  - learners           │
   └───────────────────────┘                └───────────────────────┘
```

---

## 2. Supported LMS Integration Modes

1. **LTI 1.3 Advantage (Open Standard):**
   - Universal interoperability with Canvas, Moodle, Blackboard, D2L Brightspace, and Schoology without proprietary API plugins.
   - Built on OpenID Connect (OIDC) and OAuth 2.0 with asymmetric RS256 signature verification.
   - Includes **Assignment and Grade Services (AGS)** for gradebook synchronization and **Deep Linking** for resource selection.

2. **Canvas LMS REST API:**
   - Deep integration via OAuth2 developer keys.
   - Automated creation of course modules, assignments, and external tool tabs.

3. **Moodle Web Services API:**
   - Direct integration using Moodle web service tokens (`webservice/rest/server.php`).
   - Syncs courses, SCORM activities, and manual completion events.

4. **Blackboard Learn & Docebo / SCORM Cloud:**
   - Multi-tenant cloud connectors for asynchronous package upload, deployment activation, and remote registration tracking.

---

## 3. High-Security Credential Protection

All LMS client secrets, OAuth refresh tokens, and API keys are protected at rest using **AES-256-GCM authenticated encryption**:
- Every encryption operation generates a unique 96-bit Initialization Vector (`iv`) and a 128-bit authentication tag (`tag`).
- Any tampering with stored database rows results in immediate decryption rejection.
- All API logs, console outputs, and client responses automatically mask sensitive keys (`clientSecret`, `apiKey`, `accessToken`).
