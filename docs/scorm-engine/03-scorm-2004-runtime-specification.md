# 03 — SCORM 2004 Runtime Specification & Status Decoupling

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.5 — SCORM 1.2 & 2004 Runtime & Packaging Engine  
**Standards Covered:** SCORM 2004 3rd Edition, SCORM 2004 4th Edition  

---

## 1. Status Decoupling: The Fundamental Paradigm Shift

SCORM 2004 decouples course progress into two completely independent dimensions:
1. **Completion Status (`cmi.completion_status`):** Did the learner finish the instructional material?
   - Allowed values: `completed`, `incomplete`, `not attempted`, `unknown`
2. **Success Status (`cmi.success_status`):** Did the learner master the learning objectives or pass the quiz?
   - Allowed values: `passed`, `failed`, `unknown`

This decoupling allows scenarios that were impossible in SCORM 1.2:
- A learner who completes all modules but fails the final mastery test has `cmi.completion_status = "completed"` and `cmi.success_status = "failed"`.
- A learner who tests out of the course on slide 1 has `cmi.completion_status = "incomplete"` and `cmi.success_status = "passed"`.

---

## 2. Supported CMI 2004 Data Elements

| CMI Element | Access | Type / Format | Allowed Values / Limits |
|:---|:---|:---|:---|
| `cmi._version` | RO | String | `"1.0"` |
| `cmi.completion_status` | RW | String | `"completed"`, `"incomplete"`, `"not attempted"`, `"unknown"` |
| `cmi.success_status` | RW | String | `"passed"`, `"failed"`, `"unknown"` |
| `cmi.location` | RW | String | Max 1,000 characters |
| `cmi.mode` | RO | String | `"browse"`, `"normal"`, `"review"` |
| `cmi.credit` | RO | String | `"credit"`, `"no-credit"` |
| `cmi.entry` | RO | String | `"ab-initio"`, `"resume"`, `""` |
| `cmi.exit` | WO | String | `"time-out"`, `"suspend"`, `"logout"`, `"normal"`, `""` |
| `cmi.score.scaled` | RW | Decimal(4, 3) | Normalized range: `-1.000` to `1.000` |
| `cmi.score.raw` | RW | Decimal(5, 2) | Real number |
| `cmi.score.min` | RW | Decimal(5, 2) | Real number |
| `cmi.score.max` | RW | Decimal(5, 2) | Real number |
| `cmi.progress_measure` | RW | Decimal(4, 3) | Normalized range: `0.000` to `1.000` |
| `cmi.total_time` | RO | ISO 8601 Duration | e.g. `"PT1H14M32S"` |
| `cmi.session_time` | WO | ISO 8601 Duration | e.g. `"PT0H2M15S"` |
| `cmi.suspend_data` | RW | String | **Expanded capacity: 64,000 characters** |
| `cmi.learner_id` | RO | String | Verified learner UUID |
| `cmi.learner_name` | RO | String | Learner full display name |

---

## 3. High-Capacity 64,000-Character Suspend Data

In SCORM 2004 3rd and 4th Editions, the suspend data buffer is expanded from 4,096 characters to **64,000 characters**.
- This expansion allows rich interactive simulations, branching scenarios, slide timelines, and item-by-item interaction state to be persisted without truncation.
- Strings exceeding 64,000 characters are rejected with `SCORM_SUSPEND_DATA_EXCEEDED` and error code `407 (Value Out Of Range)`.

---

## 4. ISO 8601 Duration Normalization

Unlike SCORM 1.2's `HH:MM:SS`, SCORM 2004 mandates the ISO 8601 duration format:
- `PT1H30M15S` = 1 hour, 30 minutes, 15 seconds (5,415 seconds).
- `PT45S` = 45 seconds.
- `PT2M` = 120 seconds.

The `SCORMTimeHelper` automatically parses ISO 8601 durations into clean integer seconds for database aggregation in `learning_attempts.total_time_seconds` and generates valid ISO 8601 duration strings upon hydration.
