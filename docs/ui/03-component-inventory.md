# 03 - Component Inventory

**Project:** SCORM & H5P Authoring Studio  
**Classification:** Complete UI Component Registry  

---

## 1. Global & Shared UI Components (`src/components/ui/`)

| Component | File Path | Props Interface | Description |
| :--- | :--- | :--- | :--- |
| `PageHeader` | `components/ui/PageHeader.tsx` | `{ eyebrow?: string; title: string; subtitle: string; children?: ReactNode }` | Header banner with title, description, and primary CTA buttons. |
| `PanelTitle` | `components/ui/PanelTitle.tsx` | `{ title: string; action?: string; onAction?: () => void }` | Standardized section card header with trailing action link. |
| `StatusBadge` | `components/ui/StatusBadge.tsx` | `{ status: string }` | Styled pill indicator for statuses (`Published`, `Draft`, `Review`, `Connected`, `Active`, etc.). |
| `ProjectThumb` | `components/ui/ProjectThumb.tsx` | `{ variant: string; compact?: boolean }` | Visual course art preview block with colored top pill and sub-lines. |
| `PropertySection`| `components/ui/PropertySection.tsx` | `{ title: string; children: ReactNode }` | Grouping container for properties panel controls. |
| `ToggleRow` | `components/ui/ToggleRow.tsx` | `{ label: string; checked?: boolean; onChange?: (checked: boolean) => void }` | Accessible toggle switch row with label. |
| `EmptyState` | `components/ui/EmptyState.tsx` | `{ icon: LucideIcon; title: string; text: string; actionLabel?: string; onAction?: () => void }` | Empty query/filter message with icon and action. |
| `Toast` | `components/ui/Toast.tsx` | `{ message: string; onClose?: () => void }` | Notification snackbar with auto-dismiss and close icon. |

---

## 2. Navigation Components (`src/components/navigation/`)

| Component | File Path | Props Interface | Description |
| :--- | :--- | :--- | :--- |
| `Sidebar` | `components/navigation/Sidebar.tsx` | `{ currentRoute: Route; onNavigate: (r: Route) => void; collapsed: boolean; onToggleCollapse: () => void; mobileOpen: boolean; onCloseMobile: () => void }` | Fixed left navigation with brand logo, grouped routes, active indicators, and workspace/storage pill. |
| `Topbar` | `components/navigation/Topbar.tsx` | `{ currentRoute: Route; search: string; onSearchChange: (v: string) => void; onToggleMobile: () => void; onOpenHelp: () => void }` | Header with route breadcrumbs, global search bar, help icon, notifications, and profile card. |

---

## 3. Modal Layer Components (`src/components/modals/`)

| Component | File Path | Props Interface | Description |
| :--- | :--- | :--- | :--- |
| `ModalLayer` | `components/modals/ModalLayer.tsx` | `{ modal: ModalType; onClose: () => void }` | Modal backdrop, focus trap, and router for active dialog. |
| `ImportH5PModal` | `components/modals/ImportH5PModal.tsx` | `{ onClose: () => void; onImport: (file: File) => void }` | Dropzone for `.h5p` packages with validation notice. |
| `ExportPackageModal`| `components/modals/ExportPackageModal.tsx`| `{ onClose: () => void; onExport: () => void; config: ExportConfig }` | Pre-export summary and simulation trigger. |
| `DeleteConfirmModal`| `components/modals/DeleteConfirmModal.tsx`| `{ onClose: () => void; onConfirm: () => void; title: string }` | Danger confirmation with warning message. |

---

## 4. Application Feature Screens (`src/features/`)

### 4.1 Dashboard (`src/features/dashboard/Dashboard.tsx`)
- **Key Sub-sections:**
  - `StatGrid`: 4 key metrics (Total projects, H5P packages, SCORM exports, Active learners).
  - `RecentProjects`: Top 4 modified projects with quick edit navigation.
  - `QuickCreate`: 4 popular content types for 1-click authoring launch.
  - `ExportActivity`: 30-day export bar chart.
  - `WorkspaceOverview`: Storage gauge ring (68% used) and file distribution.

### 4.2 Content Library (`src/features/content-library/ContentLibrary.tsx`)
- **Key Sub-sections:**
  - `Toolbar`: Live search, status filter pills, view toggles (grid vs list), filter dropdown.
  - `ContentGrid`: Card view with thumbnail art, complete % bar, author, and popover menu (Edit, Duplicate, Export, Delete).
  - `ContentList`: Condensed list view for high-density navigation.

### 4.3 Content Creation (`src/features/content-creation/CreateContent.tsx`)
- **Key Sub-sections:**
  - `SearchAndFilter`: Real-time search across 10 H5P content types.
  - `TypeGallery`: Interactive visual cards for Interactive Video, Course Presentation, Interactive Book, Question Set, Multiple Choice, Drag and Drop, Fill in the Blanks, True/False, Flashcards, Image Hotspots.

### 4.4 Courses (`src/features/courses/Courses.tsx`)
- **Key Sub-sections:**
  - `FeaturedCourseBanner`: Highlighted "New manager foundations" curriculum with modules count, learner avatar stack, and enrollment metric.
  - `CourseGrid`: Learning path cards with module counts, estimated duration, and completion progress bars.

### 4.5 Authoring Workspace (`src/features/authoring-workspace/AuthoringWorkspace.tsx`)
- **Key Sub-sections:**
  - `EditorTopbar`: Back button, editable title input with live auto-save badge, undo/redo triggers, version badge, preview launcher, export CTA.
  - `OutlinePanel`: Chapter/slide list with drag handles, add slide button, chapter dividers, layers/comments footer.
  - `CanvasArea`: Canvas toolbar (pointer, text, image, video, questions, AI assist), interactive video scene simulation with draggable/clickable hotspots, playback bar, bottom resolution/accessibility audit.
  - `PropertiesPanel`: Tabbed inspector (General, Style, Behavior) with media replacement, alt text, playback toggles, interaction list, width/radius sliders, completion rules.
  - `MobileEditorBar`: Quick bottom panel toggles for mobile viewports.

### 4.6 Quiz Editor (`src/features/quiz-editor/QuizEditor.tsx`)
- **Key Sub-sections:**
  - `QuestionNav`: Question list with drag reordering, add question, and settings trigger.
  - `QuestionCanvas`: Question title input, rich text formatting toolbar (Bold, Italic, Link, Image, Code), answer options with radio correctness toggles, add answer button, feedback input box.
  - `QuizProperties`: Scoring points stepper, partial scoring toggle, retry attempts dropdown, answer randomization toggle, instant feedback switch.

### 4.7 Preview Module (`src/features/preview/PreviewScreen.tsx`)
- **Key Sub-sections:**
  - `PreviewTopbar`: Exit button, learner module title, device switch (Desktop, Tablet, Mobile), restart button.
  - `DeviceFrame`: Responsive simulation container resizing smoothly between 100% desktop, 768px tablet, and 375px mobile viewport.
  - `LearnerScreen`: Step-by-step interactive question runner, instant feedback evaluation card, and final completion screen with score metrics.

### 4.8 Export Center (`src/features/export-center/ExportCenter.tsx`)
- **Key Sub-sections:**
  - `FormatSelector`: Cards for Native H5P, SCORM 1.2, and SCORM 2004.
  - `ExportConfigForm`: Package title, version, description, launch behavior, completion criteria, passing score, tracking mode.
  - `ExportSummarySidebar`: Pre-export checklist, estimated bundle size, slides/interactions/questions breakdown, export trigger button.

### 4.9 Media Library (`src/features/media-library/MediaLibrary.tsx`)
- **Key Sub-sections:**
  - `UploadDropzone`: Drag and drop file uploader with upload simulation.
  - `AssetFilterTabs`: All media, Image, Video, Audio, Document.
  - `MediaGrid`: Media cards with duration overlays, file sizes, and asset action menus.

### 4.10 LMS Integrations (`src/features/lms-integrations/Integrations.tsx`)
- **Key Sub-sections:**
  - `FeaturedIntegration`: Moodle Cloud connection card with sync status and health indicator.
  - `AvailableConnections`: Canvas LMS, Blackboard Learn, Docebo, Custom LMS connector cards.
  - `RecentSyncActivity`: Timestamped audit trail of LMS publication events.

### 4.11 Analytics (`src/features/analytics/Analytics.tsx`)
- **Key Sub-sections:**
  - `MetricCards`: Learners, completion rate, average score, total learning time.
  - `EngagementChart`: SVG line chart of monthly/weekly activity.
  - `FormatCompletionDonut`: Visual breakdown across Presentations, Videos, Assessments, Books.
  - `PerformanceTable`: Top performing courses and learning completion statistics.

### 4.12 Team, Settings & Help (`src/features/`)
- `Team`: Member directory table, role badges, invitation trigger.
- `Settings`: Multi-tab administration (Profile, Org, Team, Roles, Storage, Security).
- `Help`: Searchable knowledge base and support contact strip.
