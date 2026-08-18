# Phase 23: Design-Engineering Skills Setup

## Installed Skill Repositories

### 1. Impeccable (Product UX & Design Quality Director)
- **Repository**: `pbakaus/impeccable`
- **Installation Method**: `npx impeccable install` + `.agents/skills/impeccable`
- **Installed Version**: `v4.1.1`
- **Available Commands / Contexts**:
  - `init`: Capture durable product context and mode (`Operate`).
  - `critique`: UX design review with heuristic scoring.
  - `audit`: Technical quality checks (a11y, performance, responsive layout).
  - `typeset`, `layout`, `quieter`, `distill`: Spacing, rhythm, typography hierarchy, and noise reduction.
  - `detect`: Anti-pattern and AI-slop automated detector.
- **Intended Use in AIAVRO**:
  - Sets the **Operate** mode orientation for AIAVRO Billing OS (a dense, scan-heavy, task-oriented mission-critical operating system).
  - Enforces layout discipline (hero stack, table rhythm, padding caps, no fake-precise data slop).

---

### 2. Taste Skill (Visual Direction & Anti-Slop Frontend Skill)
- **Repository**: `https://github.com/Leonxlnx/taste-skill`
- **Installation Method**: `npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"`
- **Available Capability**: `design-taste-frontend`
- **Tuned Design Dials**:
  - `DESIGN_VARIANCE = 6/10` (Controlled, asymmetric, professional enterprise structure)
  - `MOTION_INTENSITY = 5/10` (Functional, non-decorative state communication)
  - `VISUAL_DENSITY = 6/10` (High information density, compact typography, clear table geometry)
- **Intended Use in AIAVRO**:
  - Eliminates AI-slop patterns: no dark neon glows, no centered marketing hero templates, no 8-identical-cards syndrome, no generic purple gradients.
  - Guides the light premium enterprise redesign: pure white surfaces, cool stone/slate canvas (`#f8fafc` / `#ffffff`), crisp charcoal typography, and single restrained electric cobalt accent.

---

### 3. Emil Kowalski Skills (Motion Craft & Interaction Engineering)
- **Repository**: `https://github.com/emilkowalski/skills`
- **Installation Method**: `npx skills@latest add emilkowalski/skills`
- **Installed Skills (10)**:
  - `animate`: Motion principles and hardware acceleration.
  - `animation-vocabulary`: Standardized transitions (appear, reveal, lift, morph, highlight, drawer, dialog).
  - `emil-design-eng`: Philosophy on unseen details, button feel (`scale(0.97)` on `:active`), origin-aware popovers, and perceived speed.
  - `find-animation-opportunities` & `review-animations`: Reviewing transitions, duration caps (<250ms), custom cubic-bezier easings, and `prefers-reduced-motion`.
  - `apple-design`, `ask-sonner`, `improve-animations`, `pick-ui-library`, `prototype`.
- **Intended Use in AIAVRO**:
  - Enforces Framer-quality micro-interactions: sub-250ms transitions, custom cubic-bezier easing (`cubic-bezier(0.23, 1, 0.32, 1)` for UI out), zero keyboard action delays, smooth tab indicator layout morphing, and contextual real-time highlights (`useRealtimeHighlight`).
