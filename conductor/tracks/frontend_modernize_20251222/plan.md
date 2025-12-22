# Plan: Frontend Modernization & Zipper Integration

## Phase 1: Infrastructure & API Client
- [x] Task: Create Typed API Client 14f88d6
    - Define TypeScript interfaces for API responses (Profile, Definitions, Metadata).
    - Implement a Fetch-based client that points to `guardian-nexus-api.zeroij.workers.dev`.
    - Handle Auth redirects and error states.
- [ ] Task: Implement Local Manifest Manager
    - Use `idb-keyval` to set up IndexedDB storage.
    - Implement logic to check `manifest/version` and download/cache missing tables.
    - Create a hook `useDefinitions(hashes)` for efficient item data lookups.

## Phase 2: Data Layer & "Zipper" Logic
- [ ] Task: Implement Profile Data Service
    - Create a central hook/context to fetch and manage live Bungie profile data.
    - Implement "Zipper" selectors that merge Bungie items with local D1 metadata (Tags/Notes).
- [ ] Task: Implement Optimistic Metadata Updates
    - Create actions to update Tags/Notes.
    - Implement immediate UI feedback with background sync to the D1 database.

## Phase 3: UI/UX Refinement (The "DIM Standard")
- [ ] Task: Refactor ArsenalPage Layout
    - Standardize the horizontal character column layout.
    - Ensure consistent header spacing and high-contrast typography.
- [ ] Task: Polish ItemCard & Grid
    - Ensure strict 48x48px tiles.
    - Refine element/power overlays to match DIM's precision.
    - Implement smooth hover tooltips with item stats.

## Phase 4: Final Polish & Verification
- [ ] Task: Verify Load Performance
    - Audit startup time (Manifest check -> Profile load -> Render).
    - Ensure 60fps scrolling in the Vault.
- [ ] Task: Conductor - User Manual Verification 'Frontend Modernization' (Protocol in workflow.md)
