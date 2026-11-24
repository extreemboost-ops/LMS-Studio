# 04 - SCORM 1.2 & 2004 CMI Compliance Audit

**Project:** SCORM & H5P Authoring Studio  
**Audit Phase:** 02.1 — Database Architecture Validation & Production Readiness Audit  
**Standards Covered:** SCORM 1.2 (CAM/RTE), SCORM 2004 3rd Edition, SCORM 2004 4th Edition  

---

## 1. Executive Summary

A comprehensive CMI data model audit was performed on `SCORMRuntimeRecord`, `LearningAttempt`, `LearningSession`, and `AssessmentResult`.

The core architectural decision to support both SCORM 1.2 and SCORM 2004 within an aligned schema was verified. However, the audit identified **four missing standard CMI runtime elements** that are mandatory for certified LMS interoperability.

---

## 2. Standard CMI Element Coverage Audit

### 2.1 Present & Verified Elements:
- **Status Separation:** Correctly distinguishes SCORM 1.2 unified status (`cmiLessonStatus`) from SCORM 2004 dual status (`cmiCompletionStatus` and `cmiSuccessStatus`).
- **Normalized vs Raw Scores:** `scoreScaled Decimal(4, 3)` (stores `-1.000` to `1.000`) and `scoreRaw Decimal(5, 2)` (stores `0.00` to `100.00`).
- **Progress Measure:** `cmiProgressMeasure Decimal(4, 3)` (stores `0.000` to `1.000`).
- **Bookmark & Suspend Data:** `cmiLocation` and `cmiSuspendData` (unconstrained text column accommodating up to 64,000 characters).
- **Interactions Array:** `cmiInteractionsJson (JSONB)` captures id, type, learner response, result, latency, and weighting.

---

## 3. Identified CMI Gaps & Required Enhancements

### Issue SCORM-01: Missing `cmi.core.lesson_mode` / `cmi.mode`
- **Severity:** High.
- **Affected Model:** `SCORMRuntimeRecord`.
- **Why it is a problem:** When an LMS launches a SCORM package, it transmits the mode:
  - `normal`: Active assessment/attempt for grade.
  - `review`: Post-completion review where scores and completion status **must not** be modified.
  - `browse`: Preview/audit mode where no tracking data is recorded.
  Without storing `cmiMode`, the runtime cannot distinguish whether an incoming `LMSCommit` is an active exam or a read-only review, creating a severe vulnerability where reviewing a course could overwrite an earlier passing grade!
- **Recommended Correction:** Add `cmiMode String? @default("normal") @map("cmi_mode") @db.VarChar(20)` to `SCORMRuntimeRecord`.
- **Requires Schema Change:** YES.

### Issue SCORM-02: Missing `cmi.core.credit` / `cmi.credit`
- **Severity:** Medium.
- **Affected Model:** `SCORMRuntimeRecord`.
- **Why it is a problem:** LMS platforms indicate whether credit is awarded for the attempt (`credit` vs `no-credit`).
- **Recommended Correction:** Add `cmiCredit String? @default("credit") @map("cmi_credit") @db.VarChar(20)` to `SCORMRuntimeRecord`.
- **Requires Schema Change:** YES.

### Issue SCORM-03: Missing `cmi.scaled_passing_score`
- **Severity:** Medium.
- **Affected Model:** `SCORMRuntimeRecord`.
- **Why it is a problem:** In SCORM 2004, the LMS passes the threshold required to pass the SCO (e.g. `0.800`). The runtime uses this threshold to dynamically set `cmi.success_status = 'passed'` when `cmi.score.scaled >= cmi.scaled_passing_score`.
- **Recommended Correction:** Add `scaledPassingScore Decimal? @map("scaled_passing_score") @db.Decimal(4, 3)` to `SCORMRuntimeRecord`.
- **Requires Schema Change:** YES.

### Issue SCORM-04: Missing `cmi.launch_data`
- **Severity:** Low.
- **Affected Model:** `SCORMRuntimeRecord`.
- **Why it is a problem:** Initialization data specified in the `imsmanifest.xml` `<item dataFromLMS="...">` tag is read by the SCO on launch via `cmi.launch_data`.
- **Recommended Correction:** Add `cmiLaunchData String? @map("cmi_launch_data") @db.Text` to `SCORMRuntimeRecord`.
- **Requires Schema Change:** YES.

---

## 4. Time Handling Verification

### SCORM 1.2 vs 2004 Time Formats:
- SCORM 1.2 transmits session time as `HH:MM:SS.SS` (e.g. `00:11:42.50`).
- SCORM 2004 transmits session time as ISO 8601 duration string (e.g. `PT11M42.5S`).
- **Database Architecture Finding:** Storing raw strings in the database makes SQL aggregation (`SUM(time_spent)`) impossible without complex regex parsing.
- **Verification:** **EXCELLENT.** The schema stores `sessionTimeSeconds Int` in `LearningSession` and `totalTimeSeconds Int` in `LearningAttempt`. The runtime adapter in Phase 03 converts both formats to pure integer seconds upon `LMSSetValue("cmi.core.session_time")` and `SetValue("cmi.session_time")`, while serializing back to the respective standard format upon `LMSGetValue`.

---

## 5. Interaction Records & Question Telemetry

When an interaction occurs (e.g. answering a quiz question):
1. **Normalized Table (`assessment_results`):** Normalized rows (`attemptId`, `questionId`, `isCorrect`, `pointsAwarded`, `pointsPossible`, `latencySeconds`) allow direct SQL queries for course pass rates, question difficulty analysis, and quiz performance metrics.
2. **Runtime JSON (`cmiInteractionsJson`):** Synchronously maintains the SCORM CMI interaction array so that when an LMS inspects `cmi.interactions._count`, the sequence is identical to standard expectations.

---

## 6. Audit Conclusion

The SCORM tracking design is architecturally sound and avoids the common pitfall of collapsing SCORM 1.2 into SCORM 2004. Adding `cmiMode`, `cmiCredit`, `scaledPassingScore`, and `cmiLaunchData` resolves all remaining compliance requirements.
