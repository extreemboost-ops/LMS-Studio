# 02 - Entity Relationship Diagram & Data Models

**Project:** SCORM & H5P Authoring Studio  
**Phase:** 02 — Database Architecture & Schema Design  
**Diagram Format:** Mermaid ER Diagram (`erDiagram`)  

---

## 1. Core Domain Entity Relationship Diagram

```mermaid
erDiagram
    ORGANIZATION ||--o{ WORKSPACE : contains
    ORGANIZATION ||--o{ ORGANIZATION_MEMBER : employs
    USER ||--o{ ORGANIZATION_MEMBER : belongs_to
    ROLE ||--o{ ORGANIZATION_MEMBER : assigns
    ROLE ||--o{ ROLE_PERMISSION : grants
    PERMISSION ||--o{ ROLE_PERMISSION : belongs_to

    WORKSPACE ||--o{ COURSE : owns
    COURSE ||--o{ COURSE_MODULE : contains
    COURSE_MODULE ||--o{ LESSON : groups
    WORKSPACE ||--o{ CONTENT_PROJECT : creates
    CONTENT_PROJECT ||--o{ CONTENT_DOCUMENT : defines
    CONTENT_PROJECT ||--o{ CONTENT_VERSION : snapshots
    CONTENT_PROJECT ||--o{ CONTENT_ELEMENT : structures
    CONTENT_PROJECT ||--o{ CONTENT_REVISION : tracks
    CONTENT_PROJECT ||--o| H5P_CONTENT : configures

    H5P_CONTENT }o--|| H5P_LIBRARY : uses
    H5P_LIBRARY ||--o{ H5P_LIBRARY_DEPENDENCY : requires
    H5P_CONTENT ||--o{ H5P_CONTENT_LIBRARY : preloads

    WORKSPACE ||--o{ MEDIA_ASSET : uploads
    MEDIA_FOLDER ||--o{ MEDIA_ASSET : categorizes
    MEDIA_ASSET ||--o| MEDIA_METADATA : details
    MEDIA_ASSET ||--o{ MEDIA_USAGE : referenced_in

    CONTENT_VERSION ||--o{ SCORM_PACKAGE : packages
    SCORM_PACKAGE ||--o{ SCORM_EXPORT_JOB : queues
    SCORM_PACKAGE ||--o| SCORM_MANIFEST : defines
    SCORM_PACKAGE ||--o| SCORM_RUNTIME_CONFIGURATION : configures
    SCORM_PACKAGE ||--o{ SCORM_CONTENT_MAPPING : maps_sco

    WORKSPACE ||--o{ LMS_CONNECTION : integrates
    LMS_PLATFORM ||--o{ LMS_CONNECTION : defines_type
    LMS_CONNECTION ||--o{ LMS_DEPLOYMENT : deploys
    SCORM_PACKAGE ||--o{ LMS_DEPLOYMENT : target_package
    LMS_CONNECTION ||--o{ LMS_ACTIVITY_LOG : logs

    ORGANIZATION ||--o{ LEARNER : enrolls
    COURSE ||--o{ ENROLLMENT : has_learners
    LEARNER ||--o{ ENROLLMENT : takes
    ENROLLMENT ||--o{ LEARNING_ATTEMPT : attempts
    LEARNING_ATTEMPT ||--o{ LEARNING_SESSION : sessions
    LEARNING_ATTEMPT ||--o{ ASSESSMENT_RESULT : answers
    LEARNING_ATTEMPT ||--o| SCORM_RUNTIME_RECORD : cmi_state
```

---

## 2. Detailed Module Relationship Specifications

### 2.1 Module 1: Authentication & Multi-Tenancy

```mermaid
erDiagram
    ORGANIZATION {
        uuid id PK
        string slug UK
        string name
        string plan
        bigint storage_quota_bytes
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
    USER {
        uuid id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        string avatar_url
        boolean is_super_admin
        timestamp created_at
        timestamp updated_at
    }
    ORGANIZATION_MEMBER {
        uuid id PK
        uuid organization_id FK
        uuid user_id FK
        uuid role_id FK
        string status
        timestamp joined_at
    }
    ROLE {
        uuid id PK
        uuid organization_id FK
        string name
        string description
        boolean is_system
    }
    PERMISSION {
        uuid id PK
        string code UK
        string name
        string category
        string description
    }
    ROLE_PERMISSION {
        uuid role_id PK,FK
        uuid permission_id PK,FK
    }
    WORKSPACE {
        uuid id PK
        uuid organization_id FK
        string name
        string slug
        string description
        timestamp created_at
        timestamp updated_at
    }

    ORGANIZATION ||--o{ WORKSPACE : "has many"
    ORGANIZATION ||--o{ ORGANIZATION_MEMBER : "has members"
    USER ||--o{ ORGANIZATION_MEMBER : "participates in"
    ORGANIZATION ||--o{ ROLE : "defines roles"
    ROLE ||--o{ ORGANIZATION_MEMBER : "assigned to"
    ROLE ||--o{ ROLE_PERMISSION : "contains"
    PERMISSION ||--o{ ROLE_PERMISSION : "granted by"
```

---

### 2.2 Module 2: Courses & Content Authoring

```mermaid
erDiagram
    COURSE {
        uuid id PK
        uuid organization_id FK
        uuid workspace_id FK
        string title
        string code
        string description
        string cover_image
        string status
        int version
        uuid created_by_id FK
        timestamp created_at
        timestamp updated_at
    }
    COURSE_MODULE {
        uuid id PK
        uuid course_id FK
        string title
        string description
        int order_index
        timestamp created_at
        timestamp updated_at
    }
    LESSON {
        uuid id PK
        uuid module_id FK
        uuid content_project_id FK
        string title
        string description
        int order_index
        string content_type
        timestamp created_at
        timestamp updated_at
    }
    CONTENT_PROJECT {
        uuid id PK
        uuid organization_id FK
        uuid workspace_id FK
        string title
        string description
        string content_type
        string status
        string thumbnail_url
        int current_version_number
        uuid created_by_id FK
        timestamp created_at
        timestamp updated_at
    }
    CONTENT_DOCUMENT {
        uuid id PK
        uuid content_project_id FK
        int version_number
        boolean is_published
        jsonb metadata
        jsonb settings
        timestamp created_at
        timestamp updated_at
    }
    CONTENT_VERSION {
        uuid id PK
        uuid content_project_id FK
        int version_number
        string title
        string description
        jsonb snapshot_payload
        uuid h5p_library_id FK
        uuid created_by_id FK
        timestamp created_at
    }
    CONTENT_ELEMENT {
        uuid id PK
        uuid content_project_id FK
        uuid document_id FK
        string element_type
        string name
        int order_index
        uuid parent_id FK
        jsonb config
        timestamp created_at
        timestamp updated_at
    }
    CONTENT_REVISION {
        uuid id PK
        uuid content_project_id FK
        uuid author_id FK
        int revision_number
        jsonb diff_payload
        string change_summary
        timestamp created_at
    }

    COURSE ||--o{ COURSE_MODULE : "divided into"
    COURSE_MODULE ||--o{ LESSON : "contains"
    CONTENT_PROJECT ||--o{ LESSON : "linked to"
    CONTENT_PROJECT ||--o{ CONTENT_DOCUMENT : "has documents"
    CONTENT_PROJECT ||--o{ CONTENT_VERSION : "milestones"
    CONTENT_PROJECT ||--o{ CONTENT_ELEMENT : "elements"
    CONTENT_PROJECT ||--o{ CONTENT_REVISION : "revision logs"
```

---

### 2.3 Module 3: H5P Engine & Library Tree

```mermaid
erDiagram
    H5P_CONTENT {
        uuid id PK
        uuid content_project_id FK
        uuid library_id FK
        jsonb parameters
        jsonb filtered_parameters
        jsonb metadata
        string embed_type
        timestamp created_at
        timestamp updated_at
    }
    H5P_LIBRARY {
        uuid id PK
        string machine_name
        string title
        int major_version
        int minor_version
        int patch_version
        boolean runnable
        boolean fullscreen
        int core_api_version_major
        int core_api_version_minor
        string tutorial_url
        string example_url
        jsonb metadata_settings
        timestamp installed_at
        timestamp updated_at
    }
    H5P_LIBRARY_DEPENDENCY {
        uuid id PK
        uuid library_id FK
        uuid required_library_id FK
        string dependency_type
        timestamp created_at
    }
    H5P_CONTENT_LIBRARY {
        uuid id PK
        uuid h5p_content_id FK
        uuid library_id FK
        string dependency_type
        boolean drop_css
    }
    H5P_PACKAGE_IMPORT {
        uuid id PK
        uuid organization_id FK
        uuid workspace_id FK
        string filename
        bigint file_size_bytes
        string status
        jsonb validation_errors
        uuid created_by_id FK
        timestamp created_at
    }
    H5P_PACKAGE_EXPORT {
        uuid id PK
        uuid content_version_id FK
        string filename
        bigint file_size_bytes
        string checksum_sha256
        string storage_path
        timestamp created_at
    }

    H5P_CONTENT }o--|| H5P_LIBRARY : "implements"
    H5P_LIBRARY ||--o{ H5P_LIBRARY_DEPENDENCY : "declares"
    H5P_LIBRARY ||--o{ H5P_LIBRARY_DEPENDENCY : "depends_on"
    H5P_CONTENT ||--o{ H5P_CONTENT_LIBRARY : "loads"
    H5P_LIBRARY ||--o{ H5P_CONTENT_LIBRARY : "included_in"
```

---

### 2.4 Module 4 & 5: Media & SCORM Packaging

```mermaid
erDiagram
    MEDIA_ASSET {
        uuid id PK
        uuid organization_id FK
        uuid workspace_id FK
        uuid folder_id FK
        string name
        string original_filename
        string mime_type
        string asset_type
        bigint file_size_bytes
        string storage_key
        string cdn_url
        jsonb metadata
        uuid created_by_id FK
        timestamp created_at
        timestamp updated_at
    }
    MEDIA_METADATA {
        uuid id PK
        uuid media_asset_id FK
        int duration_seconds
        int width_px
        int height_px
        string codec
        int bitrate
        string thumbnail_key
        jsonb transcript_json
        timestamp created_at
        timestamp updated_at
    }
    MEDIA_USAGE {
        uuid id PK
        uuid media_asset_id FK
        uuid content_project_id FK
        uuid element_id FK
        string usage_location
        timestamp created_at
    }

    SCORM_PACKAGE {
        uuid id PK
        uuid organization_id FK
        uuid workspace_id FK
        uuid content_project_id FK
        uuid content_version_id FK
        string format
        string package_title
        string version_string
        string manifest_identifier
        string storage_key
        bigint file_size_bytes
        string checksum_sha256
        string launch_file
        uuid created_by_id FK
        timestamp created_at
    }
    SCORM_MANIFEST {
        uuid id PK
        uuid scorm_package_id FK
        text manifest_xml
        jsonb organizations_json
        jsonb resources_json
        jsonb sequencing_json
        timestamp created_at
    }
    SCORM_RUNTIME_CONFIGURATION {
        uuid id PK
        uuid scorm_package_id FK
        string launch_behavior
        string completion_criteria
        int passing_score_percent
        string tracking_mode
        decimal mastery_score_decimal
        string time_limit_action
        int max_time_allowed_seconds
        timestamp created_at
        timestamp updated_at
    }
    SCORM_CONTENT_MAPPING {
        uuid id PK
        uuid scorm_package_id FK
        string sco_identifier
        string title
        uuid element_id FK
        int order_index
        boolean is_mastery_required
        timestamp created_at
    }

    MEDIA_ASSET ||--o| MEDIA_METADATA : "extended attributes"
    MEDIA_ASSET ||--o{ MEDIA_USAGE : "references"
    SCORM_PACKAGE ||--o| SCORM_MANIFEST : "has XML manifest"
    SCORM_PACKAGE ||--o| SCORM_RUNTIME_CONFIGURATION : "launch settings"
    SCORM_PACKAGE ||--o{ SCORM_CONTENT_MAPPING : "maps SCO items"
```

---

### 2.5 Module 6 & 7: LMS Integrations & Learner Tracking

```mermaid
erDiagram
    LMS_CONNECTION {
        uuid id PK
        uuid organization_id FK
        uuid workspace_id FK
        uuid platform_id FK
        string name
        string connection_status
        string api_base_url
        string auth_type
        jsonb credentials_encrypted
        string health_status
        timestamp last_sync_at
        int items_synced_count
        timestamp created_at
        timestamp updated_at
    }
    LMS_DEPLOYMENT {
        uuid id PK
        uuid lms_connection_id FK
        uuid course_id FK
        uuid content_project_id FK
        uuid scorm_package_id FK
        string external_course_id
        string external_activity_id
        string deployment_status
        timestamp published_at
        timestamp last_synced_at
    }
    LEARNER {
        uuid id PK
        uuid organization_id FK
        string external_learner_id
        string email
        string first_name
        string last_name
        timestamp created_at
        timestamp updated_at
    }
    ENROLLMENT {
        uuid id PK
        uuid learner_id FK
        uuid course_id FK
        string status
        timestamp enrolled_at
        timestamp completed_at
        decimal final_grade_percent
    }
    LEARNING_ATTEMPT {
        uuid id PK
        uuid learner_id FK
        uuid content_project_id FK
        uuid scorm_package_id FK
        int attempt_number
        string status
        decimal score_raw
        decimal score_scaled
        decimal score_min
        decimal score_max
        timestamp started_at
        timestamp completed_at
        int total_time_seconds
    }
    SCORM_RUNTIME_RECORD {
        uuid id PK
        uuid attempt_id FK
        string scorm_standard
        string cmi_lesson_status
        string cmi_completion_status
        string cmi_success_status
        string cmi_entry
        string cmi_exit
        string cmi_location
        text cmi_suspend_data
        decimal cmi_progress_measure
        jsonb cmi_interactions_json
        jsonb cmi_objectives_json
        jsonb raw_cmi_tree
        timestamp last_synchronized_at
    }
    ASSESSMENT_RESULT {
        uuid id PK
        uuid attempt_id FK
        string question_id
        string question_title
        string question_type
        jsonb learner_answer_json
        jsonb correct_answer_json
        boolean is_correct
        decimal points_awarded
        decimal points_possible
        int latency_seconds
        timestamp created_at
    }

    LMS_CONNECTION ||--o{ LMS_DEPLOYMENT : "publishes through"
    LEARNER ||--o{ ENROLLMENT : "enrolled in"
    ENROLLMENT ||--o{ LEARNING_ATTEMPT : "tracks"
    LEARNING_ATTEMPT ||--o| SCORM_RUNTIME_RECORD : "records CMI data"
    LEARNING_ATTEMPT ||--o{ ASSESSMENT_RESULT : "evaluates"
```
