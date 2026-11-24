# 01 — SCORM Engine & Runtime Architecture

**Project:** SCORM & H5P Authoring Studio  
**Milestone:** Phase 03.5 — SCORM 1.2 & 2004 Runtime & Packaging Engine  
**Standards Covered:** SCORM 1.2, SCORM 2004 3rd Edition, SCORM 2004 4th Edition  

---

## 1. Architectural Overview

The SCORM Engine provides a unified, production-grade authoring, packaging, and runtime tracking system for both **SCORM 1.2** and **SCORM 2004 (3rd & 4th Editions)**.

Unlike legacy LMS systems that attempt to normalize SCORM 1.2 and 2004 into an ambiguous generic model, this architecture treats them as distinct specifications with dedicated data models, separate buffer thresholds, specialized status vocabularies, and distinct sequencing rules.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Authoring Studio Client                         │
│             (Figma Make UI - Modules, Slides, Quizzes, H5P)            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
               ┌────────────────────┴───────────────────┐
               ▼                                        ▼
   ┌───────────────────────┐                ┌───────────────────────┐
   │ SCORM Packager & XML  │                │ SCORM Runtime Service │
   │  - imsmanifest.xml    │                │  - LMS/API Adapter    │
   │  - Client Bridge JS   │                │  - Commit Persistence │
   │  - SHA-256 Checksum   │                │  - Status Decoupling  │
   └───────────┬───────────┘                └───────────┬───────────┘
               │                                        │
               ▼                                        ▼
   ┌───────────────────────┐                ┌───────────────────────┐
   │ Relational Packaging  │                │ Dual-Write Tracking   │
   │  - scorm_packages     │                │  - learning_attempts  │
   │  - scorm_manifests    │                │  - scorm_runtime_recs │
   │  - scorm_runtime_cfgs │                │  - learning_sessions  │
   │  - scorm_mappings     │                │  - assessment_results │
   └───────────────────────┘                └───────────────────────┘
```

---

## 2. Core Architectural Principles

1. **Zero-Debounce Commit Reliability (Addressing Phase 02.2 Fix):**
   - In-memory updates via `SetValue` staging are committed immediately upon calling `Commit` (`LMSCommit`).
   - Explicit `Commit` calls are **never delayed by a 30-second debounce timer**.
   - Immediate transactional dual-write persists changes to `scorm_runtime_records` and updates `learning_attempts` simultaneously.
   - `Terminate` (`LMSFinish`) triggers an atomic flush and status finalization.

2. **Strict Buffer & Type Enforcement:**
   - **SCORM 1.2:** Hard limit of 4,096 characters for `cmi.suspend_data`. Exceeding this boundary triggers immediate validation error `SCORM_SUSPEND_DATA_EXCEEDED` and returns error code `405 (Incorrect Data Type)`.
   - **SCORM 2004:** Expanded capacity up to 64,000 characters for `cmi.suspend_data` in accordance with 3rd and 4th Edition specifications.

3. **Status Decoupling:**
   - **SCORM 1.2:** Single composite `cmi.core.lesson_status` (`passed`, `completed`, `failed`, `incomplete`, `browsed`, `not attempted`).
   - **SCORM 2004:** Clean decoupling into `cmi.completion_status` (`completed`, `incomplete`, `not attempted`, `unknown`) and `cmi.success_status` (`passed`, `failed`, `unknown`).

4. **Multi-Tenant Isolation & Zero Trust:**
   - All SCORM package records, export jobs, and learner attempts enforce foreign key constraints with verified `organizationId`.
   - Cross-tenant access to SCORM packages, manifests, or attempts is strictly prohibited.
