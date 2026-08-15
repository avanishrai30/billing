# AIAVRO Billing OS — Frontend Modernization Master Plan

## Mission

Replace the current monolithic frontend with a maintainable, typed, component-based web application while preserving the existing backend as the system of record.

**Hard rule:** no backend rewrite. Existing Node/Express REST endpoints, MongoDB data, Socket.IO events, auth/session behavior, RBAC/store scoping, inventory mutations, audit behavior, and deployment contracts remain the source of truth.

## Stable baseline

The currently validated frontend baseline is the post-rollback state represented by commit `96806ca`. Do not use the experimental design-system commits as the migration starting point.

## Target stack

- Next.js App Router
- React
- TypeScript strict mode
- Tailwind CSS v4
- shadcn/ui for accessible primitives where useful
- TanStack Query for server-state fetching/caching/mutations
- React Hook Form + Zod for forms and validation
- Zustand only for genuinely client-owned UI/session state
- Socket.IO client for existing realtime events
- Playwright for browser regression/E2E
- Vitest/Jest for unit/integration tests, depending on the final repository test setup

Next.js App Router is the recommended application architecture for the new frontend; Next.js documents the App Router as its newer router built around current React capabilities. Tailwind v4 provides CSS-first theme variables suitable for shared design tokens. TanStack Query provides declarative queries/mutations, cache, refetching, and invalidation. Zod provides TypeScript-first runtime validation. Playwright provides multi-browser E2E and trace/debug workflows.

## Non-goals

- No backend rewrite
- No database migration as part of frontend migration
- No new duplicate APIs
- No duplicate business rules in frontend when the backend already owns them
- No big-bang replacement of every module
- No redesign before architecture and connectivity are proven
- No speculative GPU/compositor hacks

## Core architecture principle

Existing backend:

`UI -> typed API client -> existing /api/v1/* -> existing Node/Express services -> MongoDB`

New frontend adds a strict typed boundary:

`React component -> feature hook/query/mutation -> typed API client -> existing endpoint`

The frontend must never talk directly to MongoDB or duplicate backend service logic.

## Migration order

1. Freeze and document current backend/API contracts
2. Create new frontend workspace
3. Create design tokens and UI primitives
4. Create API client + auth/session boundary
5. Create protected application shell
6. Migrate Login
7. Migrate Dashboard
8. Migrate Purchase Entry
9. Migrate POS
10. Migrate Inventory
11. Migrate Invoices
12. Migrate Customers/Suppliers/Businesses
13. Migrate Tax/GST
14. Migrate Scanner
15. Migrate User/RBAC/Settings/Backup
16. Parallel browser regression against old and new frontend where practical
17. Production cutover
18. Only after stable cutover, archive old frontend

## Definition of done for every module

- Existing endpoint contract verified
- Request/response types created
- Zod response validation added where valuable
- Query/mutation ownership defined
- Loading/error/empty states defined
- Permission/store-scope behavior preserved
- Realtime events mapped
- No duplicate backend logic
- Responsive UI verified
- Accessibility verified
- Playwright happy path + critical regression tests
- No layout shift during common interactions
- No `transition: all`
- No hover transforms that alter hit geometry
- No uncontrolled layout animations
- No global DOM mutation
- No `innerHTML` rendering of application data
- No arbitrary `setTimeout` used to synchronize rendering
- No unbounded `useEffect` chains
- No unnecessary whole-page refetch/render

## Migration gate policy

Each phase produces a commit that is independently buildable and testable. A phase cannot begin if the preceding phase fails its acceptance gate.

## Rollback policy

Every migration phase must have a known-good Git commit. Never use production state as the rollback mechanism. Never force-push the main branch as part of routine migration.
