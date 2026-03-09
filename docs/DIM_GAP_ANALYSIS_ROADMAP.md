# Guardian Nexus vs. DIM: Gap Analysis & Roadmap

This document provides a comprehensive audit of Destiny Item Manager (DIM) source modules compared to the current state of Guardian Nexus. It outlines missing features, existing features requiring upgrades, and a prioritized implementation roadmap.

## Executive Summary

- **Core Parity**: Guardian Nexus successfully handles basic inventory viewing, moving items, and simple loadout creation.
- **Major Gaps**: We completely lack advanced armor optimization, comprehensive search/filtering logic, vendor/collection views, and the robust loadout application pipeline (mods, fashion, conflicts).
- **Technical Advantage**: Our Vite/Zustand stack is leaner than DIM's legacy Angular-roots/Redux setup, allowing us to build these features with modern React patterns and better performance.

---

## Gap Analysis: Missing Features

### Tier 1: Critical Parity (High Priority / High Impact)


| Feature                             | DIM Source Reference                      | Description                                                                                                                                                                                                                                                           | Effort     |
| ----------------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| ~~**Advanced Search & Filtering**~~ | `src/app/search/`                         | ~~50+ search filters with full boolean query parsing (`is:weapon AND (is:crafted OR is:deepsight)`). We currently have ~10 basic filters.~~ **DONE** — AST lexer/parser built in `query-parser.ts`, filter evaluator in `itemFilter.ts`.                              | ~~High~~   |
| **Loadout Application Pipeline**    | `src/app/loadout-drawer/loadout-apply.ts` | Complete equip logic (~800 lines) handling mod assignment, exotic conflict resolution, and detailed progress notifications. *Partially done* — basic equip pipeline exists in `equipManager.ts` but lacks exotic conflict resolution and dequip logic.                | High       |
| ~~**In-Game Loadout Integration**~~ | `src/app/loadout/ingame/`                 | ~~Viewing, applying, and syncing with Destiny 2's native in-game loadout system.~~ **DONE** — Types & processing in `ingame-loadouts.ts`, `useInGameLoadouts` hook, `InGameLoadoutCard` UI, `applyInGameLoadout()` via worker proxy, integrated into `LoadoutDrawer`. | ~~Medium~~ |
| ~~**Drag-and-Drop Inventory**~~     | `src/app/inventory/`                      | ~~Dragging items between characters/vault for quick transfers.~~ **DONE** — `@dnd-kit/core` in `Inventory.tsx` with `StoreBucket`/`VirtualVaultGrid` drop targets, `InventoryItem` draggable (equipped items excluded).                                               | ~~Medium~~ |


### Tier 2: Major Systems (Medium-High Priority)


| Feature                                 | DIM Source Reference       | Description                                                                                                                                                                                                                                                                             | Effort     |
| --------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Loadout Optimizer / Armor Builder**   | `src/app/loadout-builder/` | Web Worker-powered armor optimization engine to hit specific stat tiers. *Research complete — see analysis below.* | Very High  |
| **Loadout Optimizer / Armor Builder**   | `src/app/loadout-builder/` | Web Worker-powered armor optimization engine to hit specific stat tiers.                                                                                                                                                                                                                | Very High  |
| ~~**Vendors Page**~~                    | `src/app/vendors/`         | ~~Viewing all vendor inventories, bounties, and engram focusing options.~~ **DONE** — Worker endpoints for `GetVendors`/`GetVendor`, Zustand vendor store with two-phase loading, full Vendors page with character tabs, vendor groups, collapsible cards, sale items with cost badges. | ~~High~~   |
| ~~**Collections, Triumphs & Metrics**~~ | `src/app/records/`         | ~~Browsing game records, titles, and collectible checklists.~~ **DONE** — Presentation node tree builder (`buildPresentationNodeTree`), scope resolution, seal/gilding tracking. Collections page with Triumphs/Collections/Seals/Metrics tabs, breadcrumb navigation, progress bars.   | ~~High~~   |
| ~~**Item Triage / Vault Cleaning**~~    | `src/app/item-triage/`     | ~~Tools for identifying duplicate or low-stat rolls to dismantle.~~ **DONE** — Factor-based similarity, strict armor dominance, notable stat highlighting (82%/90% thresholds), artifice bonus. TriagePanel integrated into ItemDetailOverlay.                                          | ~~Medium~~ |
| ~~**Organizer / Spreadsheet View**~~    | `src/app/organizer/`       | ~~Table-based view for mass-comparing and tagging items.~~ **DONE** — CSS-grid spreadsheet with 25+ columns, category tree (17 weapon types + armor), multi-column sort, bulk actions, progressive rendering, CSV export, column visibility toggles.                                    | ~~Medium~~ |


### Tier 3: Enhancements & Power User Tools (Medium Priority)


| Feature                    | DIM Source Reference                 | Description                                                                                                                                                                                                                  | Effort  |
| -------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| ~~**Infusion Finder**~~    | `src/app/infuse/`                    | ~~Recommending items to use as infusion fuel to raise power level.~~ **DONE** — Pure logic in `infusionFinder.ts`, modal UI in `InfusionFinder.tsx`, integrated into `ItemDetailModal`.                                      | ~~Low~~ |
| ~~**Farming Mode**~~       | `src/app/farming/`                   | ~~Automatically moving engrams/items to the vault to keep character space clear during activities.~~ **DONE** — Store state + `toggleFarmingMode()` action, `useFarmingMode.ts` auto-move hook, top bar toggle UI.           | ~~Low~~ |
| **Socket Stripping**       | `src/app/strip-sockets/`             | Removing all mods from armor to prepare for new builds.                                                                                                                                                                      | Low     |
| **Fashion System**         | `src/app/loadout/fashion/`           | Saving and applying specific shaders and ornaments within loadouts.                                                                                                                                                          | Medium  |
| ~~**Keyboard Shortcuts**~~ | `src/app/hotkeys/`                   | ~~Global keybinds for searching, moving, and navigating.~~ **DONE** — `useHotkeys.ts` hook with `/`, `Ctrl+K`, `Escape`, `R`, `L`, `1-4` bindings, input-focus suppression.                                                  | ~~Low~~ |
| ~~**Bulk Actions**~~       | `src/app/inventory/bulk-actions.tsx` | ~~Locking, unlocking, or moving multiple selected items at once.~~ **DONE** — `useBulkSelectStore.ts` for selection, `BulkActionBar.tsx` floating action bar with lock/unlock/vault/transfer, Ctrl+Click on `InventoryItem`. | ~~Low~~ |


### Tier 4: Polish & Ecosystem (Low Priority)


| Feature                   | DIM Source Reference                 | Description                                                                                                                                                                        | Effort   |
| ------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| ~~**Cross-Device Sync**~~ | `src/app/dim-api/`                   | ~~Cloud syncing for custom tags, notes, and settings.~~ **DONE** — D1-backed sync engine with loadouts, settings, and incremental delta sync via sync tokens. See Phase 1.5 below. | ~~High~~ |
| **Item Feed**             | `src/app/item-feed/`                 | Real-time log of newly acquired items.                                                                                                                                             | Low      |
| **Hashtag Notes**         | `src/app/inventory/note-hashtags.ts` | Adding `#pvp` or `#keep` text notes to items.                                                                                                                                      | Low      |
| **Clarity Integration**   | `src/app/clarity/`                   | Sourcing community-sourced detailed perk stats (numbers/percentages).                                                                                                              | Medium   |
| **CSV Export**            | `src/app/inventory/spreadsheets.ts`  | Exporting inventory data to spreadsheets.                                                                                                                                          | Low      |
| **Themes & PWA**          | `src/app/themes/`                    | Custom color schemes and offline/app installation support.                                                                                                                         | Low      |


---

## Existing Features Requiring Upgrades


| Feature                 | Current State                                                                                                                                                                                    | Required Upgrades (to match DIM)                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| ~~**Search**~~          | ~~Text/name matching only.~~ **DONE** — Full AST parser with boolean logic, stat filters, perk filters.                                                                                          | ~~Needs a parser (AST) for boolean logic, stat filters (`stat:recovery:>60`), and perk filters.~~                                    |
| **Compare**             | Basic 1v1 comparison.                                                                                                                                                                            | Needs multi-item side-by-side comparison, auto-suggesting similar items.                                                             |
| ~~**Postmaster**~~      | ~~View only.~~ **DONE** — Pull from Postmaster + Collect All implemented via worker endpoint, TransferService routing, context menu, and per-character Collect All button.                       | ~~Needs a "Pull from Postmaster" button and "Collect All" functionality.~~                                                           |
| **Notifications**       | Simple toasts.                                                                                                                                                                                   | Needs persistent progress tracking (e.g., "Moving 5 items... 2/5 done") and undo actions.                                            |
| **Settings**            | Very minimal.                                                                                                                                                                                    | Needs extensive display, sorting, and behavior toggles.                                                                              |
| ~~**Profile Loading**~~ | ~~Full network fetch on every load + naive 90s setInterval polling.~~ **DONE** — IDB profile caching (stale-while-revalidate), timestamp guard, smart setTimeout polling with tab-focus refresh. | ~~Needs IDB profile caching (stale-while-revalidate), timestamp-based skip, smart polling with setTimeout. **See Phase 1.5 plan.~~** |


---

## Recommended Implementation Roadmap

### Phase 1: Foundation & Friction Removal

*Focus on making basic use as smooth as DIM.*

1. ~~Build the advanced search parser (Boolean logic, basic filters like `is:weapon`).~~ **DONE**
2. ~~Add Drag-and-Drop support for items across the main inventory grid.~~ **DONE**
3. ~~Add Postmaster interactions (pulling items).~~ **DONE** — Worker endpoint, store actions (`pullFromPostmaster`, `pullAllFromPostmaster`), TransferService postmaster routing, Collect All UI.
4. ~~Implement Keyboard Shortcuts.~~ **DONE** — `useHotkeys.ts` hook with `/`, `Ctrl+K`, `Escape`, `R`, `L`, `1-4` bindings.

### Phase 2: The Loadout Upgrade

*Focus on robust buildcrafting.*

1. Re-write the loadout application pipeline to handle mods and exotics safely. *(In progress — basic pipeline exists, needs exotic conflict resolution & dequip logic.)*
2. ~~Integrate in-game loadouts (view and apply).~~ **DONE**
3. Add socket stripping and basic fashion integration.

### Phase 3: Advanced Tools (✅ COMPLETED)

*Focus on power-user features.*

1. ~~Build the Organizer/Spreadsheet view.~~ **DONE** — CSS-grid organizer with 25+ columns, category tree, multi-column sort, bulk actions, CSV export.
2. ~~Implement Item Triage and bulk actions.~~ **DONE** — Triage panel with similarity, dominance, notable stats. Integrated into ItemDetailOverlay.
3. ~~Develop the Vendors and Records pages.~~ **DONE** — Full Vendors page with two-phase loading. Collections page with Triumphs/Collections/Seals/Metrics tabs.

### Phase 4: The Final Frontier

*Focus on the most complex, value-add features.*

1. **Loadout Optimizer**: Tackle the Web Worker-based armor builder. This is a massive project requiring substantial UI and background processing architecture.
2. ~~Cross-device sync via a custom backend or indexedDB sync solutions.~~ **DONE** — Implemented in Phase 1.5 (v0.32.0). D1-backed sync engine with loadouts, settings, incremental delta sync.

---

## Phase 1.5: Profile Caching & Cloud Sync (✅ COMPLETED)

*Focus on instant cold-load UX and cross-device data persistence. Both systems are fully implemented and shipped in v0.32.0.*

### Background: What DIM Does

**Profile Caching (stale-while-revalidate):**
DIM caches the raw `DestinyProfileResponse` in IndexedDB (`keyval-store` DB, key `profile-${membershipId}`). On cold load, it reads the cache first (~1.6s to UI), then fires a network request in the background. It compares `responseMintedTimestamp` — if the network response is newer, it reprocesses and updates UI; if same/older, it skips. Cross-tab coordination via `BroadcastChannel` + `navigator.locks` prevents duplicate API calls.

**Cloud Sync (dim-api):**
DIM runs its own API server that stores tags, notes, loadouts, settings, and searches. Uses optimistic updates with rollback, a client-side queue with 1s debounce flush, queue compaction (merges redundant updates), and incremental sync via server-issued sync tokens.

### Current State (Guardian Nexus)

- ~~**ZERO profile caching**~~ **DONE** — Raw profile cached in IDB via `idb-keyval`. Two-phase load in `useProfile.ts` (cache first, network second). Timestamp guard in `hydrate()` skips reprocessing when data isn't newer.
- Manifest definitions ARE cached (IDB + memory via ManifestManager) — good reference pattern.
- ~~`useAutoRefresh` is a naive `setInterval(90s)` with visibility + in-flight guards. No timestamp comparison, no smart skip.~~ **DONE** — Rewritten to `setTimeout` with smart skip (tab hidden, mid-drag, in-flight) and tab re-focus immediate refresh.
- ~~Tags/notes already stored in D1 via Cloudflare Worker, but loadouts are localStorage-only (not synced cross-device).~~ **DONE** — Loadouts and settings now synced to D1 via sync engine. Legacy localStorage data migrated on first sync.
- `idb-keyval` already a dependency.

---

### Implementation Plan A: Profile Caching (Stale-While-Revalidate) ✅

**Goal:** Instant UI on cold load by serving cached Bungie profile from IDB, then seamlessly swapping in fresh data from the network.

#### ~~Step 1: Profile Cache Service (`src/services/profile/profileCache.ts`)~~ ✅

- Create IDB read/write utilities for the raw Bungie profile response.
- Store under key `profile-${membershipId}` in a dedicated IDB store (reuse `idb-keyval` or create a new DB).
- Store alongside the profile: `responseMintedTimestamp`, `secondaryComponentsMintedTimestamp`, and a `cachedAt` wall-clock timestamp.
- Provide `getCache(membershipId)` → `CachedProfile | null` and `setCache(membershipId, profile)` → `void`.
- Add a `clearCache(membershipId)` for logout/account-switch.

#### ~~Step 2: Two-Phase Load in `useProfile.ts`~~ ✅

- **Phase 1 (Cache):** On mount, call `profileCache.getCache()`. If hit, immediately call `inventoryStore.hydrate(cachedProfile)`. Set a `fromCache: true` flag so the UI can optionally show a "refreshing..." indicator.
- **Phase 2 (Network):** Fire the network request to `/api/profile`. On success:
  - Compare `responseMintedTimestamp` from network vs. cached.
  - If network is newer: call `inventoryStore.hydrate(freshProfile)`, call `profileCache.setCache(freshProfile)`.
  - If network is same/older: skip reprocessing (no-op). Just update the "last checked" time.
- **Error fallback:** If network fails but cache exists, keep showing cached data with a warning banner.

#### ~~Step 3: Timestamp Guard in `useInventoryStore.hydrate()`~~ ✅

- Add a `lastMintedTimestamp` field to the store.
- At the top of `hydrate()`, compare incoming `responseMintedTimestamp` against `lastMintedTimestamp`. If not newer, return early (skip all item processing).
- This prevents wasted reprocessing on every 90s poll when nothing changed.

#### ~~Step 4: Smart Polling in `useAutoRefresh.ts`~~ ✅

- Replace `setInterval` with `setTimeout` that re-arms after each refresh completes (prevents overlapping requests on slow connections).
- Add skip conditions:
  - Tab hidden (`document.visibilityState === 'hidden'`)
  - User is mid-drag (check `useInventoryStore.isDragging` or similar)
  - Request already in-flight (existing guard, keep it)
- On tab re-focus: immediately trigger a refresh (catch up after idle).
- Keep the 90s default interval but make it configurable.

#### Step 5 (Optional/Future): Cross-Tab Coordination

- Use `BroadcastChannel('guardian-nexus-profile')` to share fresh profile data between tabs.
- Use `navigator.locks.request('profile-fetch', ...)` so only one tab hits Bungie at a time.
- Lower priority — implement after the core cache works.

**Files created:**

- `src/services/profile/profileCache.ts` ✅

**Files modified:**

- `src/hooks/useProfile.ts` — two-phase load ✅
- `src/hooks/useAutoRefresh.ts` — setTimeout + smart skip ✅
- `src/store/useInventoryStore.ts` — timestamp guard in `hydrate()` ✅

---

### Implementation Plan B: Cloud Sync (Cross-Device) ✅

**Goal:** Sync loadouts, settings, searches, and tags/notes across devices using our existing Cloudflare Worker + D1 backend.

#### ~~Step 1: Extend D1 Schema for Loadouts & Settings~~ ✅

- Add `loadouts` table: `(id TEXT PK, membership_id TEXT, name TEXT, class_type INT, data JSON, updated_at INT, deleted INT DEFAULT 0)`.
- Add `settings` table: `(membership_id TEXT PK, data JSON, updated_at INT)`.
- Add `sync_tokens` table: `(membership_id TEXT PK, last_sync_token TEXT, updated_at INT)` — for incremental sync.
- Tags/notes table already exists — verify it has `updated_at` for incremental sync.

#### ~~Step 2: Worker Sync Endpoints (`functions/api/[[route]].ts`)~~ ✅

- `POST /api/sync/export` — Client pushes local changes (loadouts, tags, settings). Body: `{ loadouts: [...], tags: [...], settings: {...}, syncToken?: string }`.
- `POST /api/sync/import` — Client pulls remote changes since last sync. Body: `{ syncToken?: string }`. Response: `{ loadouts: [...], tags: [...], settings: {...}, newSyncToken: string }`.
- `POST /api/sync/full` — Full bidirectional sync (used on first load or conflict resolution).
- Sync token = last `updated_at` timestamp seen by client. Server returns only rows with `updated_at > syncToken`.

#### ~~Step 3: Sync Queue in Zustand (`src/store/syncStore.ts`)~~ ✅

- Create a new Zustand store for the sync engine.
- **Queue:** Array of pending changes `{ type: 'loadout' | 'tag' | 'setting', action: 'upsert' | 'delete', payload: ... }`.
- **Debounced flush:** After any enqueue, start a 1s debounce timer. On flush, compact the queue (dedupe by type+id, keep latest), then POST to `/api/sync/export`.
- **Optimistic updates:** Changes apply to local stores immediately (loadoutStore, inventoryStore tags). On server failure, rollback from a snapshot.
- **Import on load:** On app init (after auth), call `/api/sync/import` with stored syncToken. Merge remote changes into local stores.
- **Conflict resolution:** Last-write-wins based on `updated_at`. Simple and predictable.

#### ~~Step 4: Migrate `loadoutStore.ts` from localStorage to D1~~ ✅

- Remove `localStorage.getItem/setItem` calls for loadouts.
- On loadout create/update/delete, push change to syncStore queue (which handles persistence).
- On app init, hydrate loadoutStore from sync import response.
- Keep a local IDB fallback for offline use (write to IDB + queue for server sync when back online).

#### ~~Step 5: Settings Persistence~~ ✅

- Create `src/store/settingsStore.ts` (or extend existing) with display preferences, sort options, behavior toggles.
- On change, push to syncStore queue.
- On app init, merge from sync import.

#### ~~Step 6: Incremental Sync Loop~~ ✅

- After initial sync, periodically check for remote changes (every 5 min or on tab focus).
- Use sync tokens so the server only returns deltas.
- Merge incoming changes into local stores without disrupting the user.

**Files created:**

- `src/store/syncStore.ts` — Sync engine with queue, flush, import ✅
- `src/services/sync/syncClient.ts` — HTTP client for sync endpoints ✅
- `src/store/settingsStore.ts` — Persistent user preferences ✅
- `src/hooks/useCloudSync.ts` — Sync lifecycle orchestration ✅
- `migrations/0001_cloud_sync.sql` — D1 migration for new tables ✅

**Files modified:**

- `functions/api/[[route]].ts` — Added sync endpoints ✅
- `src/store/loadoutStore.ts` — Removed localStorage, integrated with syncStore ✅
- `src/pages/Inventory.tsx` — Added `useCloudSync` hook call ✅

---

### Implementation Order

1. ~~**Profile Caching Steps 1-3** — Biggest UX win. Instant cold load.~~ ✅
2. ~~**Profile Caching Step 4** — Smart polling. Reduces wasted API calls.~~ ✅
3. ~~**Cloud Sync Steps 1-2** — D1 schema + worker endpoints.~~ ✅
4. ~~**Cloud Sync Steps 3-4** — Sync engine + loadout migration.~~ ✅
5. ~~**Cloud Sync Steps 5-6** — Settings + incremental sync.~~ ✅
6. **Profile Caching Step 5** — Cross-tab coordination (optional polish).

---

## Loadout Optimizer / Armor Builder: Research & Architecture

*Analysis of D2ArmorPicker and DIM approaches to armor optimization.*

### Overview

Both D2ArmorPicker and DIM implement Web Worker-based armor optimization to find the best stat distributions. The core challenge is combinatorial — with 100+ armor pieces across 5 slots and mod permutations, naive enumeration is computationally infeasible.

### Key Architectural Patterns

#### 1. Web Worker Architecture
Both implementations offload computation to a Web Worker to avoid blocking the main thread.

- **D2ArmorPicker**: `results-builder.worker.ts` — ~1100 lines of core logic
- **DIM**: `process-worker/process.ts` — ~600 lines + utilities

#### 2. Simplified Item Representation
Before passing to the worker, items are reduced to essential fields:

```typescript
// DIM's ProcessItem
interface ProcessItem {
  id: string;
  hash?: number;
  isExotic: boolean;
  isArtifice: boolean;
  remainingEnergyCapacity: number; // after slot-specific mods
  power: number;
  stats: { [statHash: number]: number };
  compatibleActivityMod?: string;
  setBonus?: number;
  includedTuningMod?: number;
}
```

#### 3. Pre-filtering Strategy
Items are filtered **before** the worker to reduce combinations:
- D2ArmorPicker: Complex filtering by source (raid, dungeon, vendor), season, masterwork status
- DIM: Per-slot minimum items retained via "enough to consider" logic

#### 4. Result Representation
```typescript
// DIM's ProcessArmorSet
interface ProcessArmorSet {
  stats: ArmorStats;          // with mods
  armorStats: ArmorStats;     // without mods  
  armor: string[];            // item IDs per slot
  statMods: number[];         // mod hashes applied
  enabledStatsTotal: number;  // sum of enabled stats
  statMix: number;            // encoded 48-bit stat signature
}
```

### D2ArmorPicker Specific Features

1. **Pre-calculated Mod Combinations** (`precalculatedModCombinations.ts`)
   - Generated offline, hardcoded mod permutations
   - Eliminates runtime mod combination generation

2. **Build Configuration Class**
   - Character class, stat tier minimums (with "fixed" toggle)
   - Mod limits (maxMods, maxMajorMods)
   - Exotic/armor source filters
   - Artifice assumptions
   - Perk/gearset requirements
   - Mod optimization strategies

3. **Strict Exotic Class Item Support**
   - Handles exotic class items differently

### DIM Specific Features

1. **HeapSetTracker** (`set-tracker.ts`)
   - Efficiently tracks top-N best sets using a heap
   - Avoids storing all permutations

2. **Auto Stat Mod Assignment**
   - Automatically picks optimal minor/major/artifice mods
   - Handles energy constraints

3. **Stat Constraint Editor**
   - UI for setting min/max stat tiers
   - Ignored stats support

4. **Process Statistics**
   - Detailed skip reason tracking (double exotic, low tier, etc.)
   - Mod assignment failure tracking

### Recommended Implementation Plan

#### Phase 1: Core Worker Infrastructure

1. **Create Worker File** (`src/workers/loadout-optimizer.worker.ts`)
   - Message-based communication
   - Input: filtered items, stat constraints, mod options
   - Output: top-N armor sets with stats

2. **ProcessItem Type** (`src/types/loadout-optimizer.ts`)
   - Simplified item representation
   - Stat values, energy, exotic/artifice flags

3. **Pre-filter Hook** (`src/hooks/useArmorFilter.ts`)
   - Filter inventory armor by:
     - Class type
     - Slot (helmet, gauntlets, chest, legs, class)
     - Exotic/legendary
     - Masterwork status
     - Energy capacity
   - Keep top-N per slot (DIM keeps ~20-50)

#### Phase 2: Core Algorithm

1. **Stat Combination Loop**
   ```typescript
   // Pseudocode
   for helm of helms:
     for gaunt of gaunts:
       for chest of chests:
         for legs of legs:
           for class of classes:
             // Quick reject: double exotic
             // Quick reject: can't meet stat minimums
             // Calculate total stats
             // Assign mods (if enabled)
             // Track in heap
   ```

2. **Mod Assignment** (initially simple, enhance later)
   - Artifice mods first
   - Then stat mods based on remaining energy

3. **Heap-Based Set Tracking**
   - Keep top 200-500 results
   - Sort by: enabled stats total, then by stat priority order

#### Phase 3: UI Integration

1. **LoadoutOptimizer Page**
   - Stat constraint editor (sliders for min tiers)
   - Exotic picker (lock specific exotics)
   - Mod selection panel
   - Results grid with stat breakdowns

2. **Loadout Generation**
   - "Equip" button to create loadout from result
   - Show mod assignments

### Key Files to Reference

- DIM: `src/app/loadout-builder/process-worker/process.ts` — core algorithm
- DIM: `src/app/loadout-builder/types.ts` — type definitions
- DIM: `src/app/loadout-builder/process-worker/types.ts` — worker types
- D2ArmorPicker: `src/app/services/results-builder.worker.ts` — worker logic
- D2ArmorPicker: `src/app/data/buildConfiguration.ts` — configuration class
- D2ArmorPicker: `src/app/data/types/IPermutatorArmorSet.ts` — result type

### Complexity Notes

- **Combinations**: 50×50×50×50×50 = 312M worst case
- **Early Rejection**: Check exotic count first, stat minimums early
- **Pre-filtering Critical**: Reduce to 20-30 items per slot before worker
- **Mod Assignment**: Separate from stat calculation (can add mods after)

---

## Architecture Notes

- **What NOT to import:** Do not port DIM's Redux state structure. Maintain our use of Zustand for headless, localized state management.
- **Performance:** For the Loadout Optimizer (when we get to it), we should leverage our Vite setup to easily implement Web Workers for stat permutations to avoid blocking the main React thread.
- **Profile Caching:** Store the raw `DestinyProfileResponse` in IDB (not processed items). Processing happens in `hydrate()` on every load — the cache just eliminates the network wait on cold start.
- **Cloud Sync:** Our Cloudflare Worker + D1 backend replaces DIM's dedicated API server. We already have the infrastructure; we just need to extend it with sync-specific endpoints and a client-side queue.

