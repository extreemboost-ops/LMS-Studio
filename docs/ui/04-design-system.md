# 04 - Design System & Styling Guide

**Project:** SCORM & H5P Authoring Studio  
**Design Reference:** Figma Make Design System  

---

## 1. Visual Identity & Design Tokens

The visual style is defined by a clean, modern, professional learning management studio palette.

### 1.1 Color Tokens
| Token | Value | Primary Usage |
| :--- | :--- | :--- |
| `--blue` | `#2563eb` | Primary brand accent, primary CTA buttons, active tabs, links |
| `--indigo` | `#4f46e5` | Secondary brand accent, brand mark gradient endpoint |
| `--text` | `#0f172a` | Primary headings, dark body text |
| `--muted` | `#64748b` | Subtitles, labels, inactive tabs, secondary text |
| `--line` | `#e2e8f0` | Card borders, table dividers, panel borders |
| `--bg` | `#f8fafc` | Page background, subtle neutral contrast |
| `--surface`| `#ffffff` | Panel backgrounds, cards, modals |
| `--sidebar`| `252px` | Expanded sidebar width (collapsed width: `72px`) |

### Status Colors
- **Published / Success / Connected:** `#10b981` (emerald green)
- **Draft / In Progress:** `#f59e0b` (amber)
- **Review / Assessment:** `#8b5cf6` (violet)
- **Error / Failed / Danger:** `#ef4444` (rose red)
- **Information / Notice:** `#0ea5e9` (sky blue)

---

## 2. Typography

- **Font Family:** `Inter`, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif
- **Headings:**
  - `h1`: 24px–28px, font-weight 700, letter-spacing -0.025em
  - `h2`: 18px–20px, font-weight 600, letter-spacing -0.02em
  - `h3`: 15px–16px, font-weight 600
- **Body:**
  - Standard: 14px, font-weight 400/500, line-height 1.5
  - Small / Caption: 12px–13px, font-weight 400/500
  - Micro / Meta: 10px–11px, font-weight 600/700, uppercase letter-spacing 0.05em–0.2em

---

## 3. Component Styling Standards

### 3.1 Buttons
- `.btn.primary`: Solid `#2563eb` background, white text, 8px border-radius, hover brightness, active scale down.
- `.btn.secondary`: Neutral white surface with `1px solid var(--line)`, `#0f172a` text, hover background `#f1f5f9`.
- `.btn.white`: Pure white button with dark text for high-contrast cards.
- `.btn.danger`: Subtle red text and border; `.btn.danger-fill` for destructive modal confirmations.
- `.icon-button`: 34px × 34px rounded square button for compact actions.

### 3.2 Form Elements & Inputs
- Text inputs, textareas, and selects use consistent padding (10px 14px), 8px border radius, `1px solid var(--line)`, and focus ring `2px solid #2563eb18`.
- Custom unit inputs (`.input-with-unit`): Combines numerical input with trailing label (`px`, `%`).
- Stepper controls (`.stepper`): Minus / Plus increment buttons for points and attempts.

### 3.3 Cards & Panels
- `.panel`: 16px–24px padding, white background, `1px solid var(--line)`, 12px border radius, subtle drop shadow.
- `.content-card`: Two-section card with interactive visual thumbnail on top and title/author/progress below.
- `.type-card`: Interactive card for content type creation gallery with 3D-inspired preview badge.

---

## 4. Responsive Breakpoints & Shell Behaviors

- **Desktop (>= 1200px):** Full 252px sidebar, complete 3-panel authoring workspace (280px left outline, flexible canvas stage, 340px right properties panel).
- **Tablet (768px – 1199px):** Collapsible sidebar, authoring workspace panels can be individually collapsed via toggle handles.
- **Mobile (< 768px):** Sidebar converts to off-canvas drawer with hamburger trigger; authoring studio exposes `.editor-mobile-bar` at bottom with switchable views (Outline, Stage, Properties).
