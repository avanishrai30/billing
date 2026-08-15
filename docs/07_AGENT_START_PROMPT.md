# Copy/Paste Starter Prompt for Any Agent

Read the entire AIAVRO frontend migration plan before modifying code.

You are working on a production billing/ERP system. The existing Node/Express + MongoDB + Socket.IO backend is the system of record and MUST remain unchanged during this frontend modernization unless a documented hard API limitation is proven.

Start from the documented stable baseline, inspect the real repository, and identify the current migration phase. Do not trust summaries from previous agents without verifying the code.

Your priorities are:

1. preserve every existing backend API contract
2. preserve authentication, RBAC, store scope, inventory, audit and realtime semantics
3. build a typed React/Next.js frontend boundary around the existing backend
4. use server-state caching/querying instead of global mutable data duplication
5. validate data at the client boundary without replacing backend authority
6. make each feature independently testable and reversible
7. prevent rendering regressions by design rather than patching flicker after the fact

Rendering rules:
- no `transition: all`
- no uncontrolled layout animations
- no hover geometry changes
- no direct application-wide DOM mutation
- no `innerHTML` for application rendering
- no arbitrary `setTimeout`/RAF synchronization
- no global GPU promotion hacks
- no global CSS override to repair one module
- no whole-app refetch after local mutations

Before coding:
- report Git SHA/status
- read the architecture/API/design/task docs
- map the existing endpoint(s)
- identify permissions/store scope/realtime behavior
- list files to modify

After coding:
- typecheck
- lint
- unit/integration tests
- Playwright/browser verification for visual behavior
- report changed files and rollback commit

Do not begin the next module until the current module passes its acceptance gate.
