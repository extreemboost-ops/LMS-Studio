# 01 - Current Codebase Audit

**Project:** SCORM & H5P Authoring Studio  
**Audit Date:** November 2026  
**Audited Baseline:** Figma Make Generated Codebase  
**Target Environment:** React 19, TypeScript 5.7, Tailwind CSS v4, Vite 8, Google Antigravity IDE  

---

## 1. Executive Summary

The initial codebase for the **SCORM & H5P Studio** was generated via **Figma Make**. The output represents a high-fidelity visual prototype that includes rich UI screens, responsive layouts, intricate authoring panels, preview simulations, and styling rules.

However, all application modules, data models, routes, modal controllers, and UI components were generated as a **single monolithic file** (`src/App.tsx` totaling 2,644 lines), backed by a single 4,252-line CSS file (`src/index.css`).

While visually cohesive and faithful to the design specification, the codebase requires structural decomposition, modular state architecture, unified type definitions, and API service abstractions to serve as a reliable foundation for future H5P Core, SCORM 1.2/2004 engine, Node.js backend, and LMS integrations.

---

## 2. Project Folder Structure & File Inventory

### Current Repository Layout
```
├── .figma/                     # Figma Make deployment scripts and configuration
│   ├── make/
│   │   ├── analyze-routes
│   │   ├── deploy, dev, format, install, langserver
│   │   └── site.json
│   └── README.md
├── docs/                       # Project documentation (to be populated)
├── public/
│   ├── favicon.png
│   └── .gitattributes
├── src/
│   ├── App.tsx                 # 2,644 lines - ALL screens, state, components & mock data
│   ├── index.css               # 4,252 lines - Design tokens, Tailwind imports & CSS rules
│   ├── main.tsx                # Entry point mounting App into #root
│   └── vite-env.d.ts           # Vite client type definitions
├── .mise.toml                  # Mise toolchain configuration
├── AGENTS.md                   # Agent system directives
├── CLAUDE.md                   # Pointer to AGENTS.md
├── index.html                  # HTML entry point loading Inter font & main.tsx
├── package.json                # Project dependencies and npm scripts
├── pnpm-lock.yaml              # Lockfile
├── tsconfig.json               # TypeScript compiler configuration
└── vite.config.ts              # Vite configuration with React & Tailwind plugins
```

---

## 3. Technology Stack & Dependencies

### Runtime & Core Libraries
| Package | Version | Purpose |
| :--- | :--- | :--- |
| `react` | `^19.0.0` | UI Component Framework |
| `react-dom` | `^19.0.0` | DOM Renderer |
| `lucide-react` | `^1.77.0` | Vector Icon System (50+ icons used) |

### Build Tools & Styling
| Package | Version | Purpose |
| :--- | :--- | :--- |
| `vite` | `^8.1.7` | High-speed frontend build tool & dev server |
| `@vitejs/plugin-react` | `^6.0.0` | React JSX & Fast Refresh support |
| `tailwindcss` | `^4.0.0` | Utility CSS Framework v4 |
| `@tailwindcss/vite` | `^4.0.0` | Native Vite integration for Tailwind v4 |
| `typescript` | `^5.7.0` | Static Typing |
| `oxfmt` | `^0.76.0` | Code formatter |

### Environment Peculiarity & Build Consideration
- **Windows Path Delimiter Issue:** The workspace path contains spaces and an ampersand (`E:\Full Stack Projects\SCORM & H5P Authoring Studio\`). On Windows `cmd.exe`, default `vite` invocation in npm scripts can fail due to unquoted `&` in the batch shim (`vite.cmd`). Executing directly via `node ./node_modules/vite/bin/vite.js` cleanly avoids shell delimiter collisions.

---

## 4. Architecture & Component Audit

### 4.1 Component Monolith in `src/App.tsx`
Every screen and component currently resides in a single 2,644-line file:

| Component | Line Span | Primary Responsibilities |
| :--- | :--- | :--- |
| `App` (Root) | L253–L419 | Root router, sidebar collapse, mobile drawer, modal triggers, toast manager |
| `PageHeader` | L438–L460 | Reusable screen title, breadcrumbs/eyebrow, action bar |
| `Dashboard` | L461–L613 | Overview metrics, quick create cards, recent projects, storage ring, export chart |
| `PanelTitle` | L615–L635 | Section header with optional trailing action button |
| `ContentLibrary` | L637–L770 | Project grid/list views, status filter, local search, popover actions |
| `ProjectThumb` | L772–L803 | Visual course thumbnail representations with distinct color palettes |
| `StatusBadge` | L805–L812 | Status pill (`Published`, `Draft`, `Review`, `Connected`, etc.) |
| `CreateContent` | L814–L888 | 10 H5P content types gallery with search & category badges |
| `Courses` | L890–L958 | Course learning paths, featured course hero banner, progress tracking |
| `AuthoringWorkspace` | L960–L1335 | 3-panel authoring studio (Outline, Canvas Stage, Properties inspector) |
| `PropertySection` | L1343–L1350 | Collapsible / bordered property group in sidebar |
| `ToggleRow` | L1351–L1361 | Toggle switch for boolean settings |
| `QuizEditor` | L1363–L1587 | Question navigation, rich question prompt, radio answer builder, settings |
| `PreviewScreen` | L1589–L1765 | Responsive preview stage (Desktop/Tablet/Mobile), multi-step interactive simulation |
| `ExportCenter` | L1767–L1922 | SCORM 1.2, 2004, H5P format selector, package metadata form, validation checklist |
| `MediaLibrary` | L1924–L2008 | Asset type tabs (Image, Video, Audio, Document), upload drag-drop zone, asset grid |
| `Integrations` | L2010–L2095 | Moodle Cloud status card, LMS connection list (Canvas, Blackboard, Docebo), sync log |
| `Analytics` | L2097–L2233 | SVG engagement line chart, format completion donut, top-performing table |
| `Team` | L2235–L2306 | Member directory table, role filter, active statuses |
| `SettingsScreen` | L2308–L2402 | Tabbed settings (Profile, Organization, Team, Roles, Storage, Security) |
| `Help` | L2404–L2450 | Help center hero search, resource category cards, support contact strip |
| `EmptyState` | L2452–L2470 | Fallback placeholder for empty queries and filters |
| `ModalLayer` | L2472–L2630 | Modal dialogs for Import H5P, Export SCORM, and Delete Content |
| `Toast` | L2632–L2642 | Global notification snackbar |

---

## 5. Styling & Design Tokens Audit

### 5.1 Structure in `src/index.css`
- Total Lines: 4,252 lines.
- Base font: `Inter` loaded via Google Fonts.
- Design tokens defined in `:root`:
  ```css
  --blue: #2563eb;
  --indigo: #4f46e5;
  --text: #0f172a;
  --muted: #64748b;
  --line: #e2e8f0;
  --bg: #f8fafc;
  --surface: #fff;
  --sidebar: 252px;
  ```
- Consistent layout shells:
  - `.app-shell`: Flex / grid layout for desktop navigation.
  - `.sidebar` & `.sidebar.collapsed`: 252px vs 72px width transitions.
  - `.topbar`: 64px sticky navigation bar with search and actions.
  - `.editor-shell`: Full-screen zero-margin authoring layout with fixed headers and 3 columns.
  - `.preview-page`: Isolated dark-accented canvas simulating learner hardware.

---

## 6. Detailed Defect & Limitation Inventory

### 6.1 State Isolation & Disconnection
1. **Disconnected Authoring vs Quiz vs Preview:**
   - `AuthoringWorkspace` has hardcoded slide state (`slide-1` to `slide-4`).
   - `QuizEditor` maintains an independent state of questions (`questions` array with 3 questions).
   - `PreviewScreen` has a hardcoded 3-step question simulation that is completely decoupled from both the workspace and quiz editor.
2. **Duplicate Mock Data:**
   - `projects` array is defined at the top of `App.tsx` and referenced in `Dashboard`, `ContentLibrary`, and `Analytics`.
   - Content types are partially hardcoded in `Dashboard` quick create, `CreateContent`, and `AuthoringWorkspace`.
3. **Unidirectional / Broken Search:**
   - Topbar search updates state in `App`, but `ContentLibrary` input has `readOnly` set, preventing inline typing in the library view!
4. **Dead Buttons & Actions:**
   - "Duplicate" and "Export" in card popovers have no event handlers.
   - Outline panel "Add content" and "Add chapter" have no state modifications.
   - Canvas toolbar tools (Align, Image, Video, Stack, AI) are visual-only.
   - "Layers" and "Comments" buttons have no interactive feedback.
   - Media upload file picker triggers a toast instead of simulating file addition.
   - LMS "Connect" buttons have no connection dialog or state toggle.
5. **Missing TypeScript Models:**
   - No explicit TypeScript interfaces for `Project`, `H5PContent`, `SCORMConfig`, `Question`, `MediaAsset`, `LMSConnection`, `AnalyticsData`.
   - Props are typed ad-hoc inline (e.g., `{ navigate: (r: Route) => void }`).
6. **No API Client or Service Layer:**
   - All components directly access in-memory constants. No asynchronous service boundaries exist for future REST/GraphQL endpoints.

---

## 7. Audit Conclusion & Recommended Remediation Roadmap

The visual design, color harmony, typography, and component layouts generated by Figma Make are outstanding and provide an exceptional UX foundation.

### Remediation Plan:
1. **Preserve 100% of the CSS and visual styling** without introducing foreign design systems or changing design tokens.
2. **Modularize the file structure** into standard enterprise directories (`src/types/`, `src/services/`, `src/mocks/`, `src/components/`, `src/features/`, `src/context/` or `store/`).
3. **Establish centralized shared state** for authoring content, quiz questions, and preview simulation so editing a question directly updates the preview!
4. **Fix interactive controls** (dynamic search, filter by category/status, functional modals, asset management, and simulated export jobs).
5. **Create comprehensive TypeScript definitions and API service stubs** ready for backend integration with H5P and SCORM services.
