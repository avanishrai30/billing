# AIAVRO Billing OS — Frontend Design System

## Design objective

Create an editorial enterprise interface: calm, precise, premium, readable, operationally dense without feeling cluttered.

Do not copy any single reference website. Use references only for hierarchy, balance, spacing, and interaction quality.

## Base visual language

- Soft porcelain/neutral canvas
- Crisp white elevated surfaces
- Deep evergreen text
- Restrained moss secondary text
- Emerald primary action
- Amber warning
- Cobalt informational state
- Crimson destructive state

## Typography

Primary stack should be local/system-first. Do not add remote Google Fonts as a design dependency.

Suggested:

```css
font-family: "Avenir Next", "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

Use role-based scale rather than one global font size.

## Tokens

```text
spacing: 4, 8, 12, 16, 20, 24, 32, 40, 48
radius: 10, 14, 18, 24, pill
body: 13–14px
labels: 10–11px uppercase
page title: 22–28px
metric: 22–30px tabular-nums
```

## Layout

Desktop application frame:

```text
Sidebar | Main workspace
```

Main workspace:

```text
Header
Context/utility row
Page header
Primary workspace
Secondary workspace/history
```

Never allow a page to invent its own unrelated spacing system.

## Data-heavy UI

Tables should be:
- readable
- sticky-header where useful
- horizontally scrollable on small screens
- server-paginated for large datasets
- clear about status

Use tabular numeric formatting for finance values.

## Buttons

Primary:
- emerald
- compact
- 12–14px label
- no geometry shift on hover

Secondary:
- white/neutral
- subtle border

Destructive:
- restrained crimson

All states must preserve button dimensions.

## Inputs

- stable height
- clear label
- consistent radius
- explicit focus ring
- no padding/size changes on focus
- autofill-safe styling

## Cards

Cards should provide grouping, not decoration. Avoid excessive shadows and nested cards.

## Drawers/dialogs

Use one shared dialog/drawer primitive.

Shared behavior:
- focus management
- escape close
- click-away where appropriate
- scroll locking
- accessible title/description
- deterministic dimensions

## Responsive behavior

Breakpoints are structural, not decorative.

Desktop -> multi-column
Tablet -> reduced columns
Mobile -> single-column + drawers/scrollable tables

No horizontal page scrolling.

## Motion

Motion is optional, never required for understanding content.

Allowed:
- opacity fade for non-structural toast
- small transform for isolated drawer entrance when geometry is stable
- subtle button feedback

Forbidden:
- page-entry slide animations
- layout expansion animations that push content
- scale hover on clickable table/card boundaries
- broad `transition: all`
