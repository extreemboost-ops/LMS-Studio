# 05 — SCORM Runtime Commit Reliability & Session Lifecycle

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.5 — SCORM 1.2 & 2004 Runtime & Packaging Engine  
**Focus:** Elimination of the 30-Second Debounce & Immediate Persistence Architecture  

---

## 1. The Core Reliability Problem (Phase 02.2 Fix)

In many naive LMS implementations, learner state updates are subjected to a fixed debounce window (e.g., 30 seconds) to reduce database write frequency. In production e-learning, this pattern causes severe data loss:
- If a learner answers the final test question and navigates away or closes the browser before the 30-second window completes, their grade and completion status are lost forever.
- SCORM standards (both 1.2 and 2004) mandate that when content explicitly calls `LMSCommit("")` or `Commit("")`, the runtime adapter MUST guarantee persistence of all pending data before returning `true`.

---

## 2. The Architectural Solution: Zero-Debounce Immediate Commit

Our SCORM runtime architecture implements the following strict lifecycle:

```
[ Learner Browser ]                                      [ SCORM Runtime API ]                     [ PostgreSQL Database ]
        │                                                         │                                           │
        │ 1. LMSSetValue("cmi.suspend_data", "...")               │                                           │
        │───► [ In-Memory / Staging Buffer ]                      │                                           │
        │                                                         │                                           │
        │ 2. LMSCommit("")                                        │                                           │
        │────────────────────────────────────────────────────────►│                                           │
        │                                                         │ BEGIN TRANSACTION                         │
        │                                                         │───► Update scorm_runtime_records          │
        │                                                         │───► Update learning_attempts              │
        │                                                         │───► Update learning_sessions (session time)│
        │                                                         │───► Insert assessment_results (if any)   │
        │                                                         │ COMMIT TRANSACTION                        │
        │                                                         │◄── Database ACK                           │
        │                                                         │                                           │
        │◄────────────────────────────────────────────────────────│                                           │
        │ 3. Returns "true" (Error 0)                             │                                           │
        │                                                         │                                           │
        │ 4. LMSFinish("") / Terminate("")                        │                                           │
        │────────────────────────────────────────────────────────►│                                           │
        │                                                         │ Final Flush & Session End                 │
        │                                                         │───► Finalize status (PASSED/COMPLETED)   │
        │                                                         │───► Set completed_at timestamp            │
        │◄────────────────────────────────────────────────────────│                                           │
        │ 5. Returns "true"                                       │                                           │
```

### Architectural Guarantees:
1. **Immediate Execution:** `Commit` executes an immediate PostgreSQL transaction via `prisma.$transaction`.
2. **Dual-Write Synchronization:** Both normalized reporting tables (`learning_attempts`, `assessment_results`) and runtime CMI trees (`scorm_runtime_records.raw_cmi_tree`) are updated in the same atomic transaction.
3. **Graceful Termination:** Calling `LMSFinish` / `Terminate` performs a mandatory final flush of all session metrics, closes the open `learning_session`, and stamps `completed_at`.
4. **Browser Unload Supplementary Defense:** `sendBeacon` and window `beforeunload` handlers are retained purely as a safety net for sudden tab closures, not as the primary persistence mechanism.
