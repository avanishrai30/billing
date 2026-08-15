# Module Migration Task Template

Copy this file for every module.

## Module

`<module-name>`

## Backend contracts

List existing endpoints and events. Do not invent new endpoints during discovery.

## Current behavior inventory

- [ ] Existing UI inspected
- [ ] Existing API inspected
- [ ] Existing data model inspected
- [ ] Existing permissions inspected
- [ ] Existing store scope inspected
- [ ] Existing realtime events inspected
- [ ] Existing tests inspected

## Domain model

Define typed frontend models and API DTOs. Distinguish server data from UI-only state.

## Queries

List TanStack Query keys and query dependencies.

## Mutations

List mutations and post-success invalidation/update behavior.

## UI states

- [ ] loading
- [ ] empty
- [ ] error
- [ ] success
- [ ] submitting
- [ ] permission denied

## Components

```text
Page
├── Header
├── Filters
├── Primary content
├── Secondary content/history
└── Drawer/Dialog
```

## Anti-flicker audit

- [ ] no `transition: all`
- [ ] no hover geometry change
- [ ] no whole-page rerender for local mutation
- [ ] no direct DOM manipulation
- [ ] no layout read/write loop
- [ ] no timeout-based rendering synchronization
- [ ] stable keys
- [ ] deterministic container geometry

## Responsive QA

- [ ] 1440×900
- [ ] 1280×800
- [ ] 1024×768
- [ ] 768×1024
- [ ] 430×932
- [ ] 390×844

## Browser test

- [ ] first load
- [ ] refresh
- [ ] create
- [ ] edit
- [ ] delete/void
- [ ] search/filter
- [ ] realtime update
- [ ] permission denial
- [ ] network error

## Acceptance

- [ ] API compatibility verified
- [ ] tests pass
- [ ] typecheck passes
- [ ] lint passes
- [ ] browser test passes
- [ ] accessibility checked
- [ ] no backend changes unless explicitly approved
