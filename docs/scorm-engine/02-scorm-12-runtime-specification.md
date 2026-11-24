# 02 — SCORM 1.2 Runtime Specification & Data Model

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.5 — SCORM 1.2 & 2004 Runtime & Packaging Engine  
**Standard:** SCORM 1.2 Run-Time Environment (RTE)  

---

## 1. Supported CMI 1.2 Data Elements

The SCORM 1.2 runtime implementation enforces the official ADL SCORM 1.2 CMI data model:

| CMI Element | Access | Type / Format | Allowed Values / Limits |
|:---|:---|:---|:---|
| `cmi.core._children` | RO | String | `"student_id,student_name,lesson_location,credit,lesson_status,entry,score,total_time,exit,session_time"` |
| `cmi.core.student_id` | RO | String | Learner UUID (from verified tenant context) |
| `cmi.core.student_name` | RO | String | Format: `"Lastname, Firstname"` or `"Firstname Lastname"` |
| `cmi.core.lesson_location` | RW | String | Max 255 characters (bookmark/slide index) |
| `cmi.core.credit` | RO | String | `"credit"`, `"no-credit"` |
| `cmi.core.lesson_status` | RW | String | `"passed"`, `"completed"`, `"failed"`, `"incomplete"`, `"browsed"`, `"not attempted"` |
| `cmi.core.entry` | RO | String | `"ab-initio"`, `"resume"`, `""` |
| `cmi.core.score_children` | RO | String | `"raw,min,max"` |
| `cmi.core.score.raw` | RW | Decimal/Float | Normalized 0.00 to 100.00 |
| `cmi.core.score.min` | RW | Decimal/Float | Default: `0.00` |
| `cmi.core.score.max` | RW | Decimal/Float | Default: `100.00` |
| `cmi.core.total_time` | RO | CMITimespan | Format: `HH:MM:SS` or `HH:MM:SS.SS` |
| `cmi.core.lesson_mode` | RO | String | `"normal"`, `"browse"`, `"review"` |
| `cmi.core.exit` | WO | String | `"time-out"`, `"suspend"`, `"logout"`, `""` |
| `cmi.core.session_time` | WO | CMITimespan | Format: `HH:MM:SS` or `HH:MM:SS.SS` |
| `cmi.suspend_data` | RW | String | **Strict hard limit: 4,096 characters** |
| `cmi.launch_data` | RO | String | Custom data provided from `<adlcp:datafromlms>` |

---

## 2. The Strict 4,096-Character Suspend Data Boundary

Under the SCORM 1.2 specification, `cmi.suspend_data` has an absolute maximum buffer size of **4,096 characters**:
- Attempting to set or commit a `cmi.suspend_data` string exceeding 4,096 characters results in:
  - An immediate client error: `SCORM 1.2 Error 405 (Incorrect Data Type)`.
  - Backend validation rejection: `400 Bad Request` with `errorCode: "SCORM_SUSPEND_DATA_EXCEEDED"`.
- The engine enforces compact delta-encoding or compression where needed to safeguard against buffer exhaustion in SCORM 1.2 LMS environments.

---

## 3. Lesson Status Lifecycle & Rules

```
                      ┌─────────────────┐
                      │  not attempted  │
                      └────────┬────────┘
                               │ (LMSInitialize)
                               ▼
                      ┌─────────────────┐
                      │   incomplete    │
                      └────────┬────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │ (Score >= Pass) │ (Score < Pass)  │ (Slides viewed)
             ▼                 ▼                 ▼
      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │    passed    │  │    failed    │  │  completed   │
      └──────────────┘  └──────────────┘  └──────────────┘
```

- When an attempt is launched for the first time, `cmi.core.entry` is `"ab-initio"` and status is `"incomplete"`.
- When an attempt is resumed with prior history, `cmi.core.entry` is `"resume"`.
- When `cmi.core.lesson_status` is committed as `"passed"`, the backend marks `LearningAttempt.status = PASSED`.
- When committed as `"completed"`, `LearningAttempt.status = COMPLETED`.
- When committed as `"failed"`, `LearningAttempt.status = FAILED`.
