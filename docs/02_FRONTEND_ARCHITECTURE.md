# AIAVRO Billing OS — Frontend Architecture

## Target repository shape

```text
apps/
  web/
    app/
      login/
      (protected)/
        layout.tsx
        page.tsx
        dashboard/
        pos/
        purchases/
        inventory/
        invoices/
        customers/
        suppliers/
        businesses/
        tax/
        scanner/
        users/
        settings/
    components/
      ui/
      layout/
      data-table/
      forms/
      dialogs/
    features/
      auth/
      dashboard/
      purchases/
      pos/
      inventory/
      invoices/
      crm/
      settings/
    lib/
      api/
      auth/
      realtime/
      errors/
      validation/
    styles/
      globals.css
packages/
  types/
  api-contracts/
  ui/
```

## Dependency direction

```text
app routes
  ↓
feature components
  ↓
feature hooks/query/mutation
  ↓
domain API client
  ↓
shared apiClient
  ↓
existing backend REST/Socket.IO
```

A UI component must not import a raw `fetch` wrapper directly when a domain API hook exists.

## Server state vs client state

### Server state
Use TanStack Query for:
- products
- inventory
- purchases
- invoices
- customers
- suppliers
- businesses
- stores
- users
- role permissions

Use stable query keys and explicit invalidation after mutations. TanStack Query supports query caching/refetching and mutation-driven invalidation. Do not refetch the entire application after one mutation.

### Client state
Use local React state for component-local form state. Use Zustand only for genuinely cross-feature client state such as scanner/session UI or compact navigation state.

Do not mirror every server object into Zustand.

## Forms

React Hook Form owns field state. Zod defines validation schemas. Backend responses remain authoritative.

## Realtime

Socket.IO is an event invalidation layer, not a second database.

Example:

`purchase_created` -> invalidate/refetch purchase list query for relevant store.

Do not mutate every page from a global socket callback.

## Rendering contract

A page renders from declared state and query data.

No component should:
- mutate arbitrary DOM nodes outside its subtree
- call `document.querySelector` to control another component
- use `innerHTML` for dynamic application rendering
- force reflow with `offsetHeight` as a synchronization trick
- use timeout/RAF loops to wait for rendering

## Loading contract

Every route defines explicit:
- loading state
- empty state
- error state
- loaded state

Use skeletons only where they stabilize known geometry. Do not invent arbitrary layout placeholders that move content when data arrives.

## Motion contract

- No `transition: all`.
- No hover transforms that move an element out from under the cursor.
- No scale-on-hover for interactive table/card boundaries unless it is proven not to affect hit testing.
- No layout-changing animation in data loading.
- Transform-based animation is allowed only for deliberate, isolated visual motion whose hit area is stable.
- Respect `prefers-reduced-motion`.

## Error contract

Normalize errors into:

```ts
export type AppError = {
  kind: 'network' | 'http' | 'validation' | 'auth' | 'permission' | 'unknown';
  status?: number;
  code?: string;
  message: string;
  requestId?: string;
};
```

Do not show "gateway error" for a 400/403 response.

## Accessibility contract

- semantic buttons/links
- labels for inputs
- keyboard navigation
- dialog focus management
- table headers
- visible focus states
- aria state for toggles/drawers

## Performance contract

Measure before optimizing. No blanket GPU promotion. No `will-change` everywhere. No global memoization without evidence.

Prefer:
- query caching
- selective query invalidation
- virtualized tables only if measured as needed
- stable keys
- atomic state changes
- component-local rendering
- browser profiling
