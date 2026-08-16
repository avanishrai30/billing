# AIAVRO Billing OS — Shared Component Library Reference

**Location:** `apps/web/components/ui/*`  
**Standard Barrel Export:** `import { Button, Input, Table, ... } from '@/components/ui'`

---

## 1. Action & Button Primitives

### `Button`
- **Path:** `apps/web/components/ui/Button.tsx`
- **Variants:** `primary` | `secondary` | `ghost` | `danger` | `success` | `outline`
- **Sizes:** `sm` (h-8 px-3) | `md` (h-10 px-4) | `lg` (h-12 px-5)
- **Props:** `isLoading?: boolean`, `leftIcon?: ReactNode`, `rightIcon?: ReactNode`, standard button HTML attributes.
- **Rules:** Rigid geometry, paint-only transitions, keyboard accessible, built-in screen-reader loading state.

### `IconButton`
- **Path:** `apps/web/components/ui/IconButton.tsx`
- **Props:** `aria-label` (required), `icon: ReactNode`, `variant?: ButtonVariant`, `size?: ButtonSize`, `isLoading?: boolean`.
- **Rules:** Enforces accessible `aria-label` attribute on all icon-only interactions.

---

## 2. Form & Input Primitives

### `FormField`
- **Path:** `apps/web/components/ui/FormField.tsx`
- **Props:** `label?: string`, `htmlFor?: string`, `required?: boolean`, `helperText?: string`, `error?: string | null`, `children: ReactNode`.
- **Purpose:** Consistent vertical form wrapper composing `<Label>`, control children, helper text, and `<FieldError>`.

### `Input`
- **Path:** `apps/web/components/ui/Input.tsx`
- **Props:** `hasError?: boolean`, `leftIcon?: ReactNode`, `rightIcon?: ReactNode`, `isNumeric?: boolean`.
- **Features:** Numeric right-alignment with `tabular-nums`, paint-only focus ring.

### `PasswordInput`
- **Path:** `apps/web/components/ui/PasswordInput.tsx`
- **Features:** Integrated show/hide toggle button with accessible `aria-label`.

### `Select`
- **Path:** `apps/web/components/ui/Select.tsx`
- **Props:** `options: SelectOption[]`, `placeholder?: string`, `hasError?: boolean`.
- **Features:** Custom chevron icon without native layout jumping.

### `Checkbox`, `Radio`, `Switch`
- **Paths:** `Checkbox.tsx`, `Radio.tsx`, `Switch.tsx`
- **Features:** Accessible hidden native input paired with custom visual indicator and optional label/helperText.

---

## 3. Structural & Layout Primitives

### `Card`
- **Path:** `apps/web/components/ui/Card.tsx`
- **Variants:** `default` | `elevated` | `subtle` | `interactive`
- **Purpose:** Foundation container for all ERP modules.

### `Panel`
- **Path:** `apps/web/components/ui/Panel.tsx`
- **Props:** `title?: string`, `subtitle?: string`, `action?: ReactNode`.
- **Purpose:** Card container with standardized header boundary and action slot.

### `Section`, `Stack`, `Divider`
- **Paths:** `Section.tsx`
- **Purpose:** Consistent vertical and horizontal spacing scales (`gap-xs`, `gap-sm`, `gap-md`, `gap-lg`, `gap-xl`).

---

## 4. Status & Indicator Primitives

### `Badge`
- **Path:** `apps/web/components/ui/Badge.tsx`
- **Variants:** `neutral` | `brand` | `success` | `warning` | `danger` | `info`
- **Props:** `dot?: boolean`, `size?: 'sm' | 'md'`.

### `StatusBadge`
- **Path:** `apps/web/components/ui/Badge.tsx`
- **Props:** `status: string` (e.g. `paid`, `partially_paid`, `voided`, `active`, `suspended`, `in_transit`).
- **Purpose:** Authoritative mapping of domain status strings to semantic token colors.

### `Tag`
- **Path:** `apps/web/components/ui/Badge.tsx`
- **Props:** `onRemove?: () => void`.

---

## 5. Table & Data Density Primitives

### `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell`
- **Path:** `apps/web/components/ui/Table.tsx`
- **Props:** `density?: 'dense' | 'comfortable'`, `isNumeric?: boolean`, `isInteractive?: boolean`.
- **Rules:** Zero row animation, tabular font alignment, horizontal scroll containment.

### `Pagination`
- **Path:** `apps/web/components/ui/Pagination.tsx`
- **Props:** `currentPage: number`, `totalPages: number`, `totalItems?: number`, `pageSize?: number`, `onPageChange: (p: number) => void`.

### `EmptyState`, `Skeleton`
- **Path:** `apps/web/components/ui/EmptyState.tsx`

---

## 6. Overlays, Dialogs & Drawers

### `Dialog`
- **Path:** `apps/web/components/ui/Dialog.tsx`
- **Features:** Accessible modal dialog with Escape listener, body scroll lock, backdrop click, and focus handling.

### `Drawer`
- **Path:** `apps/web/components/ui/Drawer.tsx`
- **Features:** Side context drawer with slide-in position (`left` | `right`).

### `Dropdown`, `Popover`
- **Path:** `apps/web/components/ui/Dropdown.tsx`
- **Features:** Outside click listener and positioning.

---

## 7. Navigation, Headers & Metric Primitives

### `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- **Path:** `apps/web/components/ui/Tabs.tsx`
- **Features:** Accessible tablist with paint-only active tab indicator.

### `PageHeader`, `SectionHeader`, `Toolbar`, `FilterBar`
- **Path:** `apps/web/components/ui/HeadersAndBars.tsx`

### `StatCard`, `MetricCard`
- **Path:** `apps/web/components/ui/StatCard.tsx`
- **Features:** Formatted currency via `Intl.NumberFormat('en-IN', ...)`, trend direction badges (`up`, `down`, `neutral`).

### `ToastProvider`, `useToast`
- **Path:** `apps/web/components/ui/Toast.tsx`
- **Features:** Toast notifications with non-intrusive bottom-right stack.
