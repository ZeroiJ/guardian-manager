# Changelog

All notable changes to **Guardian Manager** will be documented in this file.

## [0.39.0] - 2026-05-13

### Inventory

- **DIM-style store header** (~118px): character columns use `store-row store-header` — emblem banner (class/race + ✦ power), helmet row with base + artifact and max-power hint, compact Mob–Str strip. Vault shows live **ProfileCurrencies** (component **103**) in a small icon grid; worker profile fetch now requests **103**.
- Removed redundant **All / Weapons / Armor / Ghosts** filter pills; use the search bar (`is:weapon`, etc.) for filtering.

### Documentation audit (`docs/`)

Reconciled **DIM_IMPORT_RECOMMENDATIONS**, **DIM_GAP_ANALYSIS_ROADMAP**, **DIM_LOADOUT_PARITY**, **DEVELOPER_GUIDE**, **DIM_UI_PATTERNS**, **GEMINI**, and **plans/** with the current codebase (Organizer, infusion, farming, item feed, Clarity, CSV export, strip sockets, loadout apply pipeline, drag-and-drop). Marked complete vs partial vs open accordingly.

### Item Popup — DIM `ItemPopupContainer` Pattern

Mirrors Destiny Item Manager’s `item-popup.ts` + `ItemPopupContainer` + `ItemPopup` flow (DIM does not use names “ItemOverlay” / “ItemOverlayPopup”; `ItemDetailOverlay` remains our full-screen overlay when expanding from the popup header):

- **`useItemPopupStore`** — global single-popup state; **`show()`** toggles closed when the same instance is clicked again (same as DIM).
- **`ItemPopupContainer`** — mounted once in **`App`** under **`Router`**; closes the popup on route change; renders **`ItemDetailModal`** (anchored popup body).
- **`ItemDetailModal`** — Floating UI **`arrow`** + **`FloatingArrow`**, **`useDismiss`** for outside-click close (no full-screen dimmer), fixed hooks order for loading paths, removed unused transfer stub.

### Desktop Layout — No Page-Wide Horizontal Scroll + Priority Nav

- **Fix (hooks)**: `inventoryGridTemplate` `useMemo` must run before loading/error early returns on `Inventory`; otherwise React error #310 (“Rendered more hooks than during the previous render”) occurs when transitioning from the loading screen to the main grid.
- **Inventory grid**: Character columns and vault share the viewport width via CSS Grid (`minmax(0, 1fr)` columns) instead of a fixed-width flex row with horizontal scroll.
- **Headers / buckets / Postmaster**: Same grid template so columns stay aligned.
- **Store headers & buckets**: Fluid width (`min-w-0`, no rigid `w-[290px]`) so columns can shrink with `--item-size` scaling.
- **Top bar**: Left cluster (`GM` + nav) uses `min-w-0` / `flex-1` so the strip does not force overflow.
- **Navigation**: Primary links (feed, Inventory, Loadouts, Optimizer) stay visible; secondary links (Progress → Settings by priority) collapse into a **More** menu when space is tight (`useNavigationFit` + Floating UI).

### Responsive UI Scaling — DIM-Style Auto-Resizing

The entire inventory UI now scales proportionally based on window size, just like DIM. Item tiles shrink before the page scrolls sideways on desktop-sized windows.

#### CSS Variable-Based Scaling

- **New CSS Variables**: `--item-size`, `--item-gap`, `--badge-font-size`, etc.
- **10 Responsive Breakpoints**: From 36px (mobile) to 80px (4K) item sizes
- **Automatic Adjustment**: Window resize triggers smooth recalculation
- **Proportional Scaling**: Everything scales together - items, text, badges, gaps

#### Breakpoints

| Window Width | Item Size | Description |
|--------------|-----------|-------------|
| ≥2500px | 80px | 4K ultra-wide |
| ≥2000px | 72px | Large monitors |
| ≥1600px | 60px | Desktop default |
| ≥1400px | 56px | Small desktop |
| ≥1200px | 52px | Large tablets |
| ≥1024px | 48px | Tablets |
| ≥900px | 44px | Small tablets |
| ≥768px | 40px | Large phones |
| ≥540px | 36px | Phones |

#### Components Updated

- `InventoryItem` — Uses `var(--item-size)` for width/height
- `StoreBucket` — Grid gaps and empty slots use CSS variables
- `VirtualVaultGrid` — Separator tiles and item tiles scale proportionally
- `Inventory.tsx` — Added `useResponsiveItemSize()` hook

#### New Hook: `useResponsiveItemSize()`

```typescript
// Automatically handles window resize
useResponsiveItemSize();

// Or with options
useResponsiveItemSize({ enableDynamic: true, debounceMs: 100 });
```

Includes utility functions:
- `setCustomItemSize(size)` — Manual override (32-100px)
- `resetToResponsiveSizing()` — Return to auto mode

#### Files Added

- `src/hooks/useResponsiveItemSize.ts` — Resize detection and CSS variable management

#### Files Modified

- `src/index.css` — Added CSS variables and media queries
- `src/components/inventory/InventoryItem.tsx` — Responsive badges, power level, crafted indicator
- `src/components/inventory/StoreBucket.tsx` — Responsive grid and gaps
- `src/components/inventory/VirtualVaultGrid.tsx` — Responsive separator tiles
- `src/pages/Inventory.tsx` — Added hook integration

## [0.38.0] - 2026-05-13

### Compare Feature Enhancement — DIM-Style Side-by-Side Comparison

Major visual and UX improvements to the item comparison system, bringing it closer to DIM's polished compare experience.

#### Visual Enhancements

- **Framer Motion Animations**: Smooth slide-up animation with spring physics when opening the compare sheet
- **Stat Bars**: Visual progress bars under each stat value showing relative performance across compared items
- **Color-Coded Highlighting**:
  - **Green** = Best value (bold text + green bar + green background tint)
  - **Red** = Worst value (red bar + red background tint)
  - **Yellow** = Middle values (yellow bar)
- **Power Level Row**: Dedicated row for power comparison with highlighting for highest/lowest

#### Improved Item Headers

- Rarity-colored borders (exotic gold, legendary purple, rare blue, etc.)
- Masterwork crown indicator for masterworked items
- Lock status icon for locked items
- Power level badge overlay
- "Initial" badge highlighting the original compared item

#### UI Controls

- **Bars Toggle**: Button to show/hide stat visualization bars
- **Perks Toggle**: Button to show/hide perks and mods in the comparison
- **Remove Button (×)**: Click to remove individual items from comparison
- Auto-closes when last item is removed

#### Technical Improvements

- Better responsive layout with CSS Grid
- Sticky headers that stay visible while scrolling
- Footer legend explaining color coding

#### Files Modified

- `src/components/CompareModal.tsx` — Complete overhaul with animations, stat bars, and enhanced styling
- `src/lib/destiny/stat-utils.ts` — New utility functions for stat calculations and comparisons

## [0.37.0] - 2026-03-16

### 🌟 Core Feature Parity Update: Clarity, Item Feed, & Loadout Mods

This update introduces three massive quality-of-life features inspired by DIM, bringing Guardian Nexus even closer to full feature parity.

#### 📊 Clarity Integration (Community Insights)
- We now integrate the community-sourced **Clarity** database directly into the app!
- **What this means for you:** When you inspect weapons in the Item Detail popup, you'll see exact, hidden numbers for perks instead of Bungie's vague descriptions. (e.g., instead of "increases reload speed", you'll see exactly "+50 Reload Speed, 0.85x animation duration").
- The app automatically downloads and caches this data in the background, keeping it fast and lightweight.

#### 🔔 Live Item Feed
- Similar to DIM's item feed, Guardian Nexus now tracks your loot drops in real-time.
- **What this means for you:** There is a new "Bell" icon in the top navigation bar. Whenever a new item drops in-game or appears in your inventory while the app is open, you'll see a notification badge.
- Clicking the bell opens a slide-out panel showing a chronological history of your newly acquired loot, cleanly styled by item rarity. You can dismiss items individually or clear them all at once to keep your feed tidy.

#### ⚙️ Full Loadout Mod Assignment
- **What this means for you:** When you click "Equip" on a saved loadout, the app now actively slots your saved armor mods into your equipped armor!
- Previously, the app only equipped the armor pieces themselves. Now, the final phase of the equip engine scans your armor's mod sockets and automatically inserts exactly what you had saved, meaning your build is 100% ready to play the moment the loadout finishes applying.

#### 🛠 Polish & UI Cleanup
- Fixed missing UI icons (`ThumbsUp`, `ThumbsDown`, `Zap`) throughout the Wishlist and Triage menus.
- Cleaned up background code warnings to ensure the app continues to build and run flawlessly.

## [0.36.0] - 2026-03-10
### Loadout Optimizer — Phase 2: Bug Fixes, Exotic Picker & DIM-Style UI

Major improvements to the Loadout Optimizer based on a deep analysis of DIM's `loadout-builder/` implementation (~60 files).

#### Critical Bug Fixes

- **Fixed `addStats` Bug**: `ProcessItem.stats` changed from `Partial<ArmorStats>` to full `ArmorStats` — all 6 stats always initialized to 0. This fixes the root cause of stat miscalculations where keys from one object were missing in another.
- **Fixed `useArmorFilter` type errors**: Changed `state.definitions` → `state.manifest` and `item.definition` → `manifest[item.itemHash]` — the filter was returning zero items due to accessing non-existent properties on the store and item types.

#### Worker Rewrite

- **Flat Stat Arrays**: Pre-computed `statsCache` Map with 6-element flat arrays per item (like DIM's approach). Eliminates the buggy `addStats()` function entirely and speeds up the inner loop.
- **Auto Stat Mod Assignment**: New `assignAutoStatMods()` greedy algorithm assigns artifice (+3, free), minor (+5, 1 energy), and major (+10, 3 energy) mods based on stat deficits and remaining energy capacity.
- **Energy Awareness**: `remainingEnergy` tracked per item, consumed during auto mod assignment.
- **Exotic Locking**: Worker supports `lockedExoticHash` with 4 modes: no preference, no exotic, any exotic, or specific hash.
- **Heap Optimization**: Added `couldInsert` early rejection to skip sets that can't beat the current worst in the heap.

#### Exotic Picker

- **New `ExoticPicker.tsx` Component**: Full modal with search, 3 special modes (No Preference / Any Exotic / No Exotic), and exotic grid grouped by armor slot showing Bungie CDN icons.
- **`useArmorFilter` Integration**: `lockedExoticHash` filter removes non-matching exotics at the filter level before optimization.
- **Replaced** the old "Allow multiple exotics" checkbox with the exotic picker button showing the selected exotic name.

#### DIM-Style Results Layout

- **Inline Per-Set Display**: Replaced the click-to-select card pattern with DIM's inline layout where each set shows everything in one block.
- **Stat Summary Row**: `Total: {sum}` followed by each stat with its Bungie stat icon and colored value, then `★{power}`.
- **Real Bungie Armor Icons**: 48×48 item icons from Bungie CDN with exotic gold ring, artifice `A` badge, and power number overlay.
- **Per-Set Buttons**: Save Loadout / Equip buttons stacked vertically on the right side of each set row.
- **Auto Mod Display**: Mod count badges on result rows, per-stat bonus indicators, and "X stat mods auto-assigned" notice.

#### Equip Button Wired

- **`createLoadoutFromSet` action** in `optimizerStore.ts` builds an `ILoadout` from the selected `ProcessArmorSet` and saves it via `loadoutStore.addLoadout()`.
- **Success feedback**: "✓ Loadout Saved!" confirmation with `lastAction` feedback banner.
- **Progress bar**: Animated progress bar during optimization.

#### Files Added

- `src/components/loadout-optimizer/ExoticPicker.tsx` — Exotic selection modal

#### Files Modified

- `src/lib/loadout-optimizer/types.ts` — Full `ArmorStats` on `ProcessItem`, `icon` field, `remainingEnergy`, auto mod constants
- `src/workers/loadout-optimizer.worker.ts` — Complete rewrite with flat stat arrays, auto mod assignment, exotic locking
- `src/hooks/useArmorFilter.ts` — Fixed type errors (`definitions`→`manifest`, `item.definition`→manifest lookup), added `icon` + `lockedExoticHash` filter
- `src/store/optimizerStore.ts` — Added `lockedExoticHash`, `setLockedExotic`, `createLoadoutFromSet`, `lastAction`
- `src/components/loadout-optimizer/OptimizerResults.tsx` — DIM-style inline per-set layout with Bungie icons
- `src/pages/LoadoutOptimizer.tsx` — Exotic picker integration, progress bar, character ID resolution

## [0.35.0] - 2026-03-09

### Loadout Optimizer — Phase 1 Complete

Added a Web Worker-based armor optimization system inspired by DIM's Loadout Optimizer and D2ArmorPicker. Located at `/optimizer` via the top navigation bar.

#### Loadout Optimizer Features

- **Web Worker Architecture**: Offloads heavy computation to a background thread to avoid blocking the UI. Uses a min-heap to efficiently track the top 200 best sets.
- **Pre-filtering**: `useArmorFilter` hook reduces inventory armor to ~30 items per slot before optimization, dramatically reducing combinations.
- **Early Rejection**: Double exotic detection and quick stat minimum checks prune invalid combinations early.
- **Stat Constraint Editor**: Interactive sliders for setting min/max stat requirements (Mobility, Resilience, Recovery, Discipline, Intellect, Strength).
- **Quick Presets**: One-click buttons for common builds (100/100, Rec 100, Res 100, 30+ All).
- **Results Display**: Scrollable list showing stat bars, power level, enabled stats total, and armor piece details.
- **Class Selector**: Filter by Titan, Hunter, or Warlock.
- **Exotic Toggle**: Option to allow multiple exotics in a set.

#### Files Added

- `src/lib/loadout-optimizer/types.ts` — Type definitions for ProcessItem, ProcessArmorSet, StatConstraint, etc.
- `src/workers/loadout-optimizer.worker.ts` — Web Worker with optimization algorithm
- `src/hooks/useArmorFilter.ts` — Pre-filtering hook for inventory armor
- `src/store/optimizerStore.ts` — Zustand store for optimizer state
- `src/pages/LoadoutOptimizer.tsx` — Main optimizer page
- `src/components/loadout-optimizer/StatConstraintEditor.tsx` — Stat slider UI with presets
- `src/components/loadout-optimizer/OptimizerResults.tsx` — Results list and details

### Destiny Icon Library

Added a comprehensive inline SVG icon library sourced from DIM's destiny-icons submodule, eliminating the need for Bungie API requests for weapon types, ammo types, armor slots, damage elements, and champion icons.

#### Icon Categories

- **Weapon Types**: Auto Rifle, Hand Cannon, Pulse Rifle, Scout Rifle, Shotgun, Sniper Rifle, Fusion Rifle, Rocket Launcher, Sword, SMG, Sidearm, Bow, Grenade Launcher, Machine Gun, Glaive, Trace Rifle, Linear Fusion
- **Ammo Types**: Primary (white), Special (green), Heavy (purple) — multi-path SVGs
- **Armor Slots**: Helmet, Gauntlets, Chest, Legs, Class Item
- **Damage/Element**: Kinetic, Solar, Arc, Void, Stasis — with hardcoded element colors
- **Champions**: Stagger, Pierce, Overload
- **Meta Icons**: Shaped (crafted), Enhanced, Masterwork Hammer, Artifice

#### Wiring

- **VendorItemTile**: Added element and ammo type badges to item tiles
- **Organizer**: Added weapon/armor icons to category sidebar tree

#### Files Modified

- `src/components/ui/DestinyIcons.tsx` — Expanded from 148 to 513+ lines with all icon categories
- `src/components/vendors/VendorItemTile.tsx` — Added element/ammo badges
- `src/pages/Organizer.tsx` — Added category icons

### Navigation Updates

- Added "Optimizer" link to the top navigation bar with green "NEW" badge
- Loadouts link now highlights when on the Optimizer page

## [0.34.0] - 2026-03-05

### Tier 2 Feature Completion — Organizer, Triage, Vendors, Collections

Four major systems built to close out Phase 3 of the DIM gap analysis roadmap. All four are lazy-loaded via `React.lazy()` for optimal bundle splitting.

#### Organizer / Spreadsheet View (`/organizer`)

- **Column system**: 25+ typed column definitions with value extractors, sort comparators, and CSV formatters. Columns grouped into core, weapon, armor stats, weapon stats, and meta categories.
- **Category tree**: Hierarchical sidebar with 17 weapon types and armor organized by slot and class. Smart column switching between armor and weapon modes.
- **CSS-grid spreadsheet**: Multi-column sort (shift+click), row selection (click, shift+range, checkbox select-all), progressive rendering starting at 50 rows with IntersectionObserver expansion.
- **Bulk actions**: Tag (favorite/keep/infuse/junk/archive/clear), Lock, Unlock, Move (vault + per-character). Actions apply to all selected rows.
- **CSV export**: Downloads filtered and sorted data with all visible columns.
- **Column visibility toggle**: Show/hide columns by group with dropdown panel.
- **Cell formatting**: Rarity border colors, damage element colors, stat gradient coloring (red→yellow→green), masterwork gold, tag emojis.

#### Item Triage / Vault Cleaning

- **Triage utility library** (`src/lib/triage/triage.ts`):
  - `countSimilarItems()` — factor-based similarity counting (name, bucket, class).
  - `compareArmorStats()` — per-stat comparison to best-in-slot for same class.
  - `compareBetterWorse()` — strict dominance check (better or equal in ALL stats). Artifice armor receives +3 bonus to one stat.
  - `getNotableStats()` — highlights stats ≥82% of best comparable item (≥90% for totals). Color coded via HSL gradient.
  - `isArtificeArmor()` — detects artifice via empty plug hash 4173924323.
- **TriagePanel component** in item detail overlay with loadout count, similar items count (warning coloring), better/worse dominance counts, notable stat bars, and full armor stat comparison table (You vs Best).

#### Vendors Page (`/vendors`)

- **Worker endpoints**: `GET /api/vendors` (all vendors, components 400,401,402) and `GET /api/vendors/:vendorHash` (single vendor with item details, components 400,401,402,300,302,304,305,310).
- **API client methods**: `getVendors()` and `getVendor()` added to `APIClient`.
- **Vendor store** (`src/store/vendorStore.ts`): Zustand store with two-phase loading (bulk vendors → individual vendor item details), per-character caching.
- **Vendors page**: Character selector tabs, vendor groups (from Bungie vendor group definitions), collapsible vendor cards with icon/subtitle/refresh countdown, sale items organized by display categories with item tiles and cost badges, hide-owned toggle, sale status badges (Owned, Unavailable, Already Held).

#### Collections, Triumphs & Metrics (`/collections`)

- **Profile API update**: Component 800 (Collectibles) added to core profile request in worker.
- **Presentation node tree builder** (`src/lib/records/presentation-nodes.ts`):
  - `buildPresentationNodeTree()` — recursive tree builder from root hash with completion tracking.
  - `getRootNodeHashes()` — extracts collection/triumph/seal/metric root hashes from profile response.
  - Scope resolution: character-scoped records use first character; character-scoped collectibles take best (least "not acquired") across all characters.
  - Title/seal resolution with gilding tracking via `completionRecordHash` → `gildingTrackingRecordHash`.
  - State bit flags: `Invisible`, `RecordRedeemed`, `ObjectiveNotCompleted`, `NotAcquired`.
  - Full type system: `PresentationNode`, `RecordNode`, `CollectibleNode`, `MetricNode`, `TitleInfo`, `ObjectiveProgress`.
- **Collections page**: Tab bar (Triumphs, Collections, Seals, Metrics), breadcrumb navigation for nested nodes, node cards with progress bars, seal cards with special styling (purple completed, gold gilded with count), record rows with objectives and score, collectible tiles with acquired/locked state, metric rows with progress bars.

#### Infrastructure

- **Routing**: Three new lazy-loaded routes (`/organizer`, `/vendors`, `/collections`) in `App.tsx`.
- **Navigation**: "Organizer" and "Collections" links added to `Navigation.tsx`.
- **Bundle splitting**: Organizer (22.5 kB), Vendors (12.6 kB), Collections (19.4 kB) as separate chunks.

## [0.33.0] - 2026-03-05

### Phase 1 Completion + Tier 3 Quick Wins

Six features implemented in one batch to close out Phase 1 of the DIM gap analysis roadmap and land several Tier 3 quick wins.

#### Lock API (End-to-End)

- **Worker endpoint**: `POST /api/actions/setLockState` proxies to Bungie's `SetLockState` API.
- **APIClient method**: `APIClient.setLockState()` with full request shaping.
- **Store action**: `useInventoryStore.setLockState()` with optimistic update (toggles bit 0 of `item.state`) and rollback on failure.
- **Context menu wired**: `ItemContextMenu.tsx` calls real lock API (no longer stubbed), shows only for `lockable` items, displays `L` shortcut hint.

#### Postmaster Pull / Collect All

- **Worker endpoint**: `POST /api/actions/pullFromPostmaster` proxies to Bungie's `PullFromPostmaster` API.
- **APIClient method**: `APIClient.pullFromPostmaster()` with `itemReferenceHash`, `stackSize`, `itemId`, `characterId`, `membershipType`.
- **Store actions**: `pullFromPostmaster()` (single item with optimistic bucket update) and `pullAllFromPostmaster()` (sequential loop with success/fail counters).
- **TransferService**: Detects `isPostmaster` flag and routes through `PullFromPostmaster` API, with follow-up transfers if target is vault or another character.
- **UI**: Postmaster row added to main `Inventory.tsx` after Class Items row, with item tiles + "Collect All (N)" button per character. Context menu shows "Pull to Character" for postmaster items.

#### Keyboard Shortcuts

- **Generic hook**: `useHotkeys.ts` — registers keybindings on the document, suppresses shortcuts when input/textarea is focused (unless `global: true`), supports modifier keys.
- **Bindings**: `/` and `Ctrl+K` (search focus), `Escape` (close popup / clear bulk selection / close drawer / clear search), `R` (refresh), `L` (lock selected item), `1-4` (page navigation).
- **`HOTKEY_MAP`** constant for potential help overlay display.

#### Infusion Finder

- **Pure logic**: `infusionFinder.ts` — `findInfusionCandidates()` finds all items in the same bucket with higher power, respects class compatibility for armor, sorts by power descending.
- **Modal component**: `InfusionFinder.tsx` — full-screen modal with candidate list, power delta display, owner labels, "Bring" button to transfer fuel to the target item's location.
- **Integration**: "Find Infusion Fuel" button added to `ItemDetailModal` for any item with a power level.

#### Farming Mode

- **Store state**: `farmingMode: { active: boolean, characterId: string | null }` in `useInventoryStore` with `toggleFarmingMode()` action.
- **Auto-move hook**: `useFarmingMode.ts` — watches inventory for engrams (bucket 375726501) and consumables (bucket 1469714392) on the farming character and auto-moves them to vault. Sequential API calls, respects farming mode toggle mid-batch.
- **UI**: Green-highlighted "Farm" / "Farming" toggle button in the Inventory top bar with tooltip.

#### Bulk Actions

- **Selection store**: `useBulkSelectStore.ts` — dedicated Zustand store for multi-item selection (toggle, select, deselect, selectMany, clear, activate/deactivate).
- **InventoryItem integration**: `Ctrl/Cmd+Click` toggles bulk selection. When bulk mode is active, normal clicks also toggle. Gold ring + checkmark indicator on selected items.
- **Floating action bar**: `BulkActionBar.tsx` — fixed bottom bar with count badge, Lock/Unlock/Vault/Transfer actions, character dropdown for transfer targets, X to clear. Sequential API execution with processing state.
- **Escape integration**: `Escape` key clears bulk selection (after closing any open popups).

#### DnD Click Fix

- `PointerSensor` with `distance: 8` and `TouchSensor` with `delay: 150, tolerance: 5` prevent drag activation from intercepting normal click/tap events.

#### Files Added

- `src/lib/destiny/infusionFinder.ts` — Infusion fuel candidate finder
- `src/components/inventory/InfusionFinder.tsx` — Infusion finder modal
- `src/hooks/useHotkeys.ts` — Global keyboard shortcut hook
- `src/hooks/useFarmingMode.ts` — Farming mode auto-move hook
- `src/store/useBulkSelectStore.ts` — Bulk selection state store
- `src/components/inventory/BulkActionBar.tsx` — Floating bulk action bar

#### Files Modified

- `functions/api/[[route]].ts` — Added `setLockState` and `pullFromPostmaster` endpoints
- `src/services/api/client.ts` — Added `setLockState()` and `pullFromPostmaster()` methods
- `src/services/inventory/transferService.ts` — Added `isPostmaster` flag, postmaster-aware routing
- `src/store/useInventoryStore.ts` — Added `setLockState`, `pullFromPostmaster`, `pullAllFromPostmaster`, `farmingMode`, `toggleFarmingMode`
- `src/components/inventory/ItemContextMenu.tsx` — Wired lock API, added postmaster pull, shortcut hints
- `src/components/inventory/ItemDetailModal.tsx` — Added infusion finder button + modal
- `src/components/inventory/InventoryItem.tsx` — Bulk selection (Ctrl+click), selection indicator
- `src/pages/Inventory.tsx` — DnD sensors, postmaster row, hotkeys, farming mode toggle, bulk action bar

## [0.32.0] - 2026-03-05

### Phase 1.5: Profile Caching + Cloud Sync

Two major infrastructure systems that dramatically improve load times and enable cross-device data persistence.

#### Profile Caching (Stale-While-Revalidate)

- **Instant cold-load UI**: Bungie profile responses are cached in IndexedDB via `idb-keyval`. On page load, the cached profile is hydrated immediately (~instant) while a network fetch runs in the background.
- **Timestamp guard**: `useInventoryStore.hydrate()` compares `responseMintedTimestamp` — if the network response is not newer than the cached version, reprocessing is skipped entirely.
- **Smart polling**: `useAutoRefresh` rewritten to use `setTimeout` (not `setInterval`) with skip logic when the tab is hidden, and immediate refresh on tab re-focus.

#### Cloud Sync (Loadouts + Settings via D1)

- **D1 schema**: New `loadouts`, `settings`, and `sync_tokens` tables for persistent cross-device storage.
- **Worker sync endpoints**: `/api/sync/import`, `/api/sync/export`, `/api/sync/full` — incremental delta sync via sync tokens, last-write-wins conflict resolution.
- **Sync engine** (`syncStore.ts`): Zustand-based queue with 1-second debounced flush, queue compaction (merges redundant updates), optimistic local updates with server reconciliation.
- **Loadout store rewrite**: Removed `zustand/persist` localStorage middleware. Every mutation (save, delete, rename, updateNotes, updateItems) now enqueues a sync change. One-time migration reads legacy localStorage data via `drainLegacyLoadouts()`.
- **Settings store** (`settingsStore.ts`): First persistent settings store for user preferences (itemSortOrder, wishlistUrl, characterOrder) with automatic sync integration.
- **Sync lifecycle** (`useCloudSync.ts`): Full sync on mount + legacy migration, 5-minute periodic incremental imports, tab-focus imports, and `beforeunload` flush to prevent data loss.

#### Files Added

- `src/services/profile/profileCache.ts` — IDB cache service for raw Bungie profile responses
- `src/services/sync/syncClient.ts` — HTTP client for sync endpoints
- `src/store/syncStore.ts` — Sync engine (queue, flush, compaction, format converters)
- `src/store/settingsStore.ts` — Persistent user preferences store
- `src/hooks/useCloudSync.ts` — Sync lifecycle orchestration hook
- `migrations/0001_cloud_sync.sql` — D1 migration for loadouts, settings, sync_tokens tables

#### Files Modified

- `src/hooks/useProfile.ts` — Two-phase loading (cache → network), timestamp comparison
- `src/hooks/useAutoRefresh.ts` — setTimeout + smart skip + tab re-focus
- `src/store/useInventoryStore.ts` — Added `lastMintedTimestamp` field + timestamp guard in `hydrate()`
- `src/store/loadoutStore.ts` — Rewritten: removed localStorage persist, added cloud sync integration
- `functions/api/[[route]].ts` — Added sync endpoints (import/export/full)
- `src/pages/Inventory.tsx` — Added `useCloudSync` hook call

## [0.31.0] - 2026-03-03

### 🎨 Item Popup UI Overhaul (DIM Parity)

Completely redesigned the floating \`ItemDetailModal.tsx\` to perfectly match DIM's classic Item Popup layout and information density.

#### New Features

- **Segmented Stat Bars**:
  - Upgraded the simple stat bars in the popup to use the same color-coded segmentation engine (base/parts/traits/mod/masterwork) as the full Item Detail Overlay.
- **Advanced Metadata Badges**:
  - Extracted shared badge components (\`KillTrackerBadge\`, \`CraftedWeaponBadge\`, \`DeepsightBadge\`, \`CatalystProgress\`) into a new reusable \`ItemPopupInfo.tsx\` module.
  - Wired live Bungie profile data directly into the floating popup, rendering the badges directly under the notes section exactly like DIM.
- **Layout Restructuring**:
  - Sidebar Actions: Moved the action menu (Lock, Tag, Compare) from a right-side strip to a left-side panel that includes wide buttons and "Equip on:" / "Pull to:" character icon rows.
  - Tabs: Added "Overview" and "Triage" tab styling (UI only for now).
  - Intrinsic Frame: Pinned the intrinsic frame perk toward the bottom of the content area with the weapon's RPM/Impact data inline.
  - Sockets Grid: Consolidated all weapon perks, armor mods, cosmetics, and the catalyst socket into a dense bottom-footer grid.
- **Floating UI Positioning**:
  - Added \`data-popper-placement\` logic to the floating UI configuration so the internal layout accurately flips the sidebar to the opposite side if the popup collides with the screen edge.

#### Files Added

- \`src/components/item/ItemPopupInfo.tsx\` — Reusable metadata badges for kill trackers, crafting, and catalysts.

#### Files Modified

- \`src/components/inventory/ItemDetailModal.tsx\` — Massive layout and CSS rewrite, integrated live metadata hooks and segmented stat bars.
- \`src/components/inventory/ItemDetailOverlay.tsx\` — Extracted metadata UI components to the shared \`ItemPopupInfo\` file.

## [0.30.0] - 2026-03-01

### Wishlist System — Full Implementation & Overlay Integration (Feature 14/14)

Built a complete wishlist system from scratch and integrated it into the Item Detail Overlay, completing all 14 planned overlay features.

#### New Features

- **Wishlist Parser** (`src/lib/wishlist/parser.ts`):
  - Parses DIM's `dimwishlist:item=HASH&perks=HASH1,HASH2#notes:text` format
  - Supports trash list rolls (negative item hash), wildcard rolls (`-69420`), and block notes (`//notes:`)
  - Parses legacy Banshee-44.com and DestinyTracker URL formats
  - Title/description metadata extraction from file headers
  - Deduplication across multiple wishlist files via roll hashing

- **Wishlist Matcher** (`src/lib/wishlist/matcher.ts`):
  - Expert mode matching: ALL recommended perks must exist somewhere across the item's plug options (active + alternatives from component 305 + manifest plug sets)
  - Per-perk highlighting: `isPerkWishlisted()` checks individual perk hashes against all matching rolls
  - `matchItemAll()` returns every matching roll (not just first), enabling multi-roll note display
  - Supports both exact item hash and wildcard (`-69420`) lookups

- **Wishlist Store** (`src/store/useWishlistStore.ts`):
  - Zustand store with `init()`, `setSource()`, and `refresh()` actions
  - Auto-fetches Voltron community wishlist from `raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt`
  - Caches raw wishlist text in localStorage to avoid re-fetching on page reload
  - 24-hour stale threshold triggers background re-fetch
  - GitHub URL normalization (`github.com/blob/` → `raw.githubusercontent.com/`)
  - Pre-built `rollsByHash` Map for O(1) item lookups

- **Overlay Integration**:
  - **Verdict Banner**: Green thumbs-up "Wishlist Roll" or red thumbs-down "Trash List Roll" banner at the top of the overlay content area, with curator notes and "+N more matching rolls" count
  - **Grid Mode Perk Dots**: Small green/red dots on the top-right of SVG PerkCircles indicating wishlisted/trash perks
  - **List Mode Perk Badges**: Inline ThumbsUp/ThumbsDown icons next to perk names, with green/red tinted perk card borders for wishlisted perks
  - **Early Loading**: Wishlist store initialized on Inventory page mount (background fetch), so data is ready before user opens any overlay

#### Overlay Layout Order (Final — All 14 Features)
1. Screenshot header (with season info)
2. Source string
3. **Wishlist verdict banner** (new)
4. Kill Tracker + Crafted + Deepsight badges
5. Intrinsic frame perk (with key stats)
6. Perks (grid/list with socket overrides + SVG PerkCircles + **wishlist indicators**)
7. Catalyst progress (exotics only)
8. Mods
9. Energy meter (armor only)
10. Stats (segmented color-coded bars)
11. Cosmetics
12. Flavor text / Lore
13. Your Items grid
14. External links

#### Files Added

- `src/lib/wishlist/types.ts` — Data structures: `WishListRoll`, `WishListMatch`, `WishListInfo`, `WishListAndInfo`
- `src/lib/wishlist/parser.ts` — Multi-format wishlist parser with deduplication (~190 lines)
- `src/lib/wishlist/matcher.ts` — Item matching and per-perk highlighting (~200 lines)
- `src/lib/wishlist/index.ts` — Barrel re-export
- `src/store/useWishlistStore.ts` — Zustand store with fetch, cache, and refresh lifecycle (~210 lines)

#### Files Modified

- `src/components/inventory/ItemDetailOverlay.tsx` — Added wishlist verdict banner, per-perk wish/trash indicators on grid and list mode PerkCircles, WishlistDot helper component
- `src/pages/Inventory.tsx` — Added early wishlist store initialization on page mount

## [0.29.0] - 2026-03-01

### Item Detail Overlay — Advanced Item Metadata (Features 8-12)

Added five new data-rich features to the Item Detail Overlay: kill tracker, crafted weapon info, deepsight pattern progress, exotic catalyst progress, and armor energy meter.

#### New Features

- **Kill Tracker Display**:
  - Detects kill tracker socket via `socketTypeHash === 1282012138` from manifest socket entries
  - Reads `plugObjectives[0].progress` from live Bungie component 302 socket data
  - Classifies kills into PvP (red badge), PvE (blue badge), or Gambit (green badge) using 10 known objective hashes ported from DIM
  - Displays as color-coded inline badge with icon, formatted count, and activity label

- **Crafted Weapon Info ("Shaped" Badge)**:
  - Detects crafted weapons via `item.state & 8` (ItemState.Crafted bitmask)
  - Finds crafted socket category (hash `3583996951`) and reads plug objectives for weapon level
  - Distinguishes level value from crafted date via value-range heuristic (Unix timestamps > 2020)
  - Shows amber "Shaped" badge with level number and progress bar toward next level

- **Deepsight / Pattern Progress**:
  - Loads full `DestinyRecordDefinition` table to find records with `toastStyle === CraftingRecipeUnlocked` (value 3)
  - Builds name-to-record-hash lookup map (same approach as DIM's `patterns.ts`)
  - Reads incomplete objectives from `profileRecords.data.records[hash]`
  - Shows cyan "Pattern" badge with X/Y progress and visual progress bar

- **Exotic Catalyst Progress**:
  - Uses static `exotic-to-catalyst-record.json` (112 entries, copied from DIM's `data/d2/`)
  - Looks up catalyst record hash from exotic item hash, reads profile/character records
  - Checks `DestinyRecordState` flags: ObjectiveNotCompleted (4), Obscured (16), RecordRedeemed (2)
  - Shows yellow progress section with objective bars (only for unlocked, incomplete catalysts)

- **Armor Energy Meter**:
  - Reads `item.instanceData.energy` (type added in v0.28.0)
  - Renders 10-slot bar (11 for T5 armor): filled blue = used, outlined blue = available, dim = locked
  - Shows used/available counts below the meter
  - Positioned before stats section for armor items

#### Overlay Layout Order (Updated)
1. Screenshot header (with season info)
2. Source string
3. **Kill Tracker + Crafted + Deepsight badges** (new — inline row)
4. Intrinsic frame perk (with key stats)
5. Perks (grid/list with socket overrides + SVG PerkCircles)
6. **Catalyst progress** (new — after perks, exotics only)
7. Mods
8. **Energy meter** (new — before stats, armor only)
9. Stats (segmented color-coded bars)
10. Cosmetics
11. Flavor text / Lore
12. Your Items grid
13. External links

#### Files Added

- `src/lib/destiny/item-info.ts` — Pure utility module: `getKillTracker()`, `getCraftedInfo()`, `getArmorEnergy()`, `getCatalystInfo()`, `getDeepsightInfo()`
- `src/data/exotic-to-catalyst-record.json` — Static mapping of exotic item hash to catalyst record hash (112 entries, from DIM)

#### Files Modified

- `src/components/inventory/ItemDetailOverlay.tsx` — Integrated all 5 features with new imports, derived data hooks, and UI sections

## [0.28.0] - 2026-03-01

### Item Detail Overlay — Full Item Breakdown Modal (Features 1-7)

Added a large, centered overlay modal that shows a weapon or armor's complete breakdown — similar to DIM's Armory view. Includes segmented stat bars, key stats, perk swap preview, SVG perk circles, season info, and "Your Items" grid.

#### New Features

- **Item Detail Overlay (`ItemDetailOverlay.tsx`)**:
  - Opens when clicking the item name in the existing floating popup header
  - Large centered modal at `z-[200]` with dark backdrop and blur
  - Closes via backdrop click, Escape key, or X button

- **Weapon Screenshot Header**:
  - Full-width 16:9 weapon screenshot from `definition.screenshot`
  - Gradient overlay for text readability
  - Item icon with rarity-colored border, name (gold for exotics), damage type icon, item type, power level
  - Season watermark in corner from `definition.iconWatermark`
  - Graceful fallback header when no screenshot exists (armor, etc.)

- **Season Info** (`season-info.ts`):
  - Watermark-to-season mapping covering 80 URLs across 28 seasons
  - Displays season name, number, and Destiny year in the screenshot header

- **Segmented Stat Bars**:
  - Each stat bar decomposed into color-coded segments: gray=base, blue=parts (barrels/mags), green=traits (perks), purple=mods, gold=masterwork
  - Computed from socket `investmentStats` via `classifyPlug()` and `getSegmentedSocketBonuses()`
  - Hover tooltips show per-segment breakdown with sign-prefixed deltas

- **Key Stats on Intrinsic Frame**:
  - First 2 stats displayed inline (e.g., "900 rpm / 21 impact")
  - Excludes swords, LFRs, and Blast Radius

- **Socket Override System (Perk Swap Preview)**:
  - Hydrated `reusablePlugs` from Bungie component 305 onto `GuardianItem`
  - `getSocketAlternatives()` enumerates available plugs per socket (4 fallback sources)
  - Click a perk to preview stat changes; click original to remove override
  - Live stat recalculation via modified `calculateStats()` and `categorizeSockets()`
  - Amber highlight for overridden perks, reset button to clear all overrides

- **SVG Perk Circles** (`PerkCircle.tsx`):
  - SVG viewBox 0 0 100 100 with circular mask clipping
  - State-dependent fills: blue=plugged, gold=selected, semi-transparent blue=notSelected
  - Enhanced perk gold gradient + diamond arrow indicator
  - `isEnhancedPerk()` detection (tierType=0 + Frames/Origins/weapon component PCH)
  - Hover highlight ring, `cannotRoll` dashed stroke

- **Perk List View Toggle**:
  - Grid (default) and List modes with toggle buttons
  - List mode shows perk icon, name, type, and full description
  - Both modes support socket override clicking

- **"Your Items" Section**:
  - Grid of all owned copies of the same weapon/armor
  - Shows power level, owner on hover (character class or Vault)
  - Compare button triggers existing comparison system

- **Intrinsic Frame Perk**:
  - Displays the weapon/armor frame with icon, name (gold text), type label, and full description

- **Lore & Flavor Text**:
  - Flavor text displayed as italic quote with left border accent
  - Full lore text fetched from `DestinyLoreDefinition` table, scrollable if long

- **Source Info**:
  - Source string from `DestinyCollectibleDefinition.sourceString`

- **External Links**:
  - Quick links to light.gg and D2 Foundry for the item hash

#### Files Added

- `src/components/inventory/ItemDetailOverlay.tsx` — Full item detail overlay modal (~920 lines)
- `src/components/item/PerkCircle.tsx` — SVG perk circle component
- `src/lib/destiny/season-info.ts` — Watermark-to-season mapping utility

#### Files Modified

- `src/components/inventory/ItemDetailModal.tsx` — Added click handler on item name to open overlay
- `src/lib/destiny/stat-manager.ts` — Added `StatSegment`, `classifyPlug()`, `getSegmentedSocketBonuses()`, `applySocketOverridesToItem()`, `getSocketAlternatives()`, `PlugAlternative`/`SocketAlternatives` types; `calculateStats()` now accepts optional `socketOverrides`
- `src/lib/destiny/socket-helper.ts` — `categorizeSockets()` accepts optional `socketOverrides`, resolves plug hash from override first
- `src/services/profile/types.ts` — Added `reusablePlugs` field to `GuardianItem`, added `energy` to `instanceData` type
- `src/store/useInventoryStore.ts` — Hydrates `reusablePlugs` from component 305 data onto items

## [0.27.0] - 2026-03-01

### Inline Mod Slots, Masterwork Borders & ModPicker UX

UI/UX improvements to the Loadout Editor and inventory item display.

#### New Features

- **Inline Mod Slots Under Armor Pieces**:
  - Each armor slot (Helmet, Gauntlets, Chest, Legs, Class Item) now shows 4 mod boxes directly below the armor icon (1 general + 3 slot-specific)
  - Clicking a mod box opens the ModPicker pre-filtered to the correct armor slot tab
  - Removed the separate "Armor Mods" button — mod selection is now fully integrated

- **Selected Armor Display in ModPicker**:
  - ModPicker now shows the equipped armor piece (icon + name) at the top of each slot tab
  - Helps identify which armor you're selecting mods for
  - Added `targetBucket` prop to auto-select the correct tab when opened from a mod box
  - Added `loadoutItems` prop to display the armor piece context

- **Masterwork Gold Borders**:
  - Masterworked items now display a gold border (`#eade8b`) instead of rarity color
  - Uses Bungie API `item.state` bitmask (`& 4`) for detection — same approach as DIM
  - Gold background tint and inner glow overlay on masterworked items
  - Power level badge: solid gold with dark text for masterworked, dark with white text for normal
  - Compact bottom-right corner badge for power level (reduced from full-width strip)

#### Files Modified

- `src/components/inventory/InventoryItem.tsx` - Masterwork detection, gold border, gold power badge
- `src/components/loadouts/LoadoutEditorDrawer.tsx` - Inline mod slots UI, removed Armor Mods button
- `src/components/loadouts/ModPicker.tsx` - `targetBucket` and `loadoutItems` props, armor piece display

## [0.26.0] - 2026-02-27

### Loadout Editor: Armor Mods & Selection Improvements

Continued work on the Loadout Editor with new functionality and bug fixes.

#### New Features

- **Armor Mod Picker Integration**:
  - Added "Armor Mods" section to the Loadout Editor drawer
  - Opens the existing ModPicker component for mod selection
  - Mods are saved with the loadout and applied when equipping
  - Toast notifications show success/failure when equipping loadouts with mods

- **Exotic Uniqueness Enforcement**:
  - When adding an exotic weapon or armor piece to a loadout, automatically removes any existing exotic in that category
  - Ensures only one exotic weapon and one exotic armor piece can be in a loadout at a time

- **Expanded Item Selection**:
  - Removed the top 10 limit from dropdown item selection
  - All available items for each bucket are now shown, sorted by power

#### Bug Fixes

- **Helmet & Gauntlets Selection**:
  - Fixed issue where Helmet and Gauntlet slots could not be selected
  - Added defensive checks for manifest lookup in armor filtering logic
  - Now checks both `bucketHash` and `bucketTypeHash` from item definitions

- **Variable Initialization Order**:
  - Fixed "Cannot access 'L'/'M' before initialization" error by properly ordering state declarations

#### Files Modified

- `src/components/loadouts/LoadoutEditorDrawer.tsx` - Added mod picker, exotic logic, item selection fixes
- `src/store/loadoutStore.ts` - Updated updateItems to accept modsByBucket

## [0.25.0] - 2026-02-27

### 🎯 Loadout Editor: Subclass Configuration & Class Filtering

Major improvements to the Loadout Editor, bringing it closer to DIM parity with full subclass customization and class-specific filtering.

#### New Features

- **Subclass Configuration Modal (`SubclassPlugDrawer.tsx`)**:
  - Full ability to configure subclass sockets: Abilities, Aspects, and Fragments
  - Dynamic categorization based on `plugCategoryIdentifier` (detects "aspect", "fragment", "super" automatically)
  - Visual selection grid with icons and names
  - Socket overrides saved with loadout

- **Class-Specific Filtering**:
  - **Armor**: When creating a loadout for a specific class (e.g., Warlock), only Warlock-specific armor is shown in the item picker
  - **Subclasses**: Only subclasses matching the selected character's class are displayed
  - Filtering logic mirrors DIM's `isItemLoadoutCompatible` function

- **Manifest Pipeline Enhancements**:
  - Added `DestinyPlugSetDefinition` table loading for subclass sockets, mods, and perks
  - Updated `useDefinitions` hook to load full tables when no specific hashes are provided
  - Fixed socket data hydration in `useInventoryStore`

- **Utility Function**:
  - Created `getSubclassPlugsFromManifest()` in `src/lib/destiny/subclass-utils.ts` to extract available plugs from manifest definitions
  - Dynamically resolves `reusablePlugSetHash` and `randomizedPlugSetHash` from socket entries
  - Falls back to direct `reusablePlugItems` when plug sets aren't available

#### UI Improvements

- **Loadout Editor Drawer**:
  - Removed header ("CREATE LOADOUT") and close button
  - Removed "Fill Equipped" and "Fill Best" action buttons
  - Added "Configure" button on subclass to open the socket configuration modal
  - Opens subclass picker in full drawer instead of inline dropdown

#### Bug Fixes

- **TDZ Error**: Fixed "Cannot access 'M' before initialization" error by moving `selectedCharId` state declaration before the callback that uses it
- **TypeScript Errors**:
  - Fixed `ARMOR_BUCKETS` type error by explicitly typing as `number[]`
  - Fixed category array type errors in `SubclassPlugDrawer`
  - Fixed `ModPicker` component props type definition
- **Socket Data**: Fixed socket structure in store hydration to properly wrap sockets in `{ sockets: [...] }` object

#### Files Added

- `src/lib/destiny/subclass-utils.ts` — Utility for extracting subclass plugs from manifest

#### Files Modified

- `src/components/loadouts/LoadoutEditorDrawer.tsx` — UI cleanup, class filtering, subclass integration
- `src/components/loadouts/SubclassPlugDrawer.tsx` — Complete rewrite for proper socket rendering
- `src/components/loadouts/ModPicker.tsx` — Fixed type definition
- `src/pages/Inventory.tsx` — Added `DestinyPlugSetDefinition` loading
- `src/hooks/useDefinitions.ts` — Added full table loading support
- `src/services/manifest/manager.ts` — Added `getFullTableSync` method
- `src/services/profile/types.ts` — Updated GuardianItem socket type
- `src/store/useInventoryStore.ts` — Fixed socket data hydration

## [0.24.0] - 2026-02-19

### 🗂️ Phase 6: Loadout Dashboard — "The Hub"

Extracted the Loadout Card into a standalone component and rebuilt the `/loadouts` page as a clean, always-visible card hub. Inspired by DIM's `LoadoutView.tsx` separation of presentation vs. behavior, but in our own Void "Tactical Briefing" style.

#### New Component: `LoadoutCard.tsx`

- **Created `src/components/loadouts/LoadoutCard.tsx`** — Standalone "Tactical Briefing" card component.
- **Always-Expanded Layout**: No more accordion — all gear is visible at a glance on every card.
- **Header**: Thin class-colored accent bar (Titan=orange, Hunter=cyan, Warlock=purple), loadout name in `font-rajdhani uppercase`, class pill badge, item count, and timestamp. Equip result feedback renders inline ("EQUIPPED" / "FAILED").
- **Body — Horizontal Gear Grid**:
  - **Subclass**: Large 56×56px icon with name label.
  - **Weapons Strip**: 3 tiles (KIN / ENE / PWR) at 44×44px with abbreviated bucket labels.
  - **Armor Strip**: 5 tiles (HELM / ARMS / CHEST / LEGS / CLASS) at 44×44px.
  - Sections separated by subtle `white/5` vertical dividers.
  - Each tile has rarity-colored borders (exotic gold, legendary purple, rare blue) and floating power badges.
  - Empty slots render as dashed `border-white/8` placeholders.
- **Footer Actions**: Three buttons — `Equip` (with multi-character picker dropdown), `Edit` (placeholder for Phase 6 Step 2), `Delete` (with 4-second auto-dismiss confirmation).

#### Refactored: `Loadouts.tsx`

- **Stripped from ~1070 lines to ~200 lines** by extracting all inline sub-components (`ItemTile`, `EmptySlot`, `StatTierBar`, `TotalTierBadge`, `ClassBadge`, `SectionLabel`, `EquipResultBadge`, and the 500-line inline `LoadoutCard`) into the new standalone component.
- **Page is now a pure hub**: `text-4xl` "LOADOUTS" Rajdhani header, `max-w-4xl` centered column, class filter pills, card list, empty state, and footer disclaimer.
- **Imports `LoadoutCard` and `EquipState` type** from the new component file.

### Files Added

- `src/components/loadouts/LoadoutCard.tsx` — Standalone loadout card component

### Files Modified

- `src/pages/Loadouts.tsx` — Rewritten as a lean hub page

## [0.23.0] - 2026-02-19

### 🚧 Progress Page: Maintenance Mode (Beta)

After achieving core feature parity, the Progress Page has been shifted to **Maintenance Mode**. Development is paused to focus on other areas, but all current features remain active and functional.

#### Active Features (Beta)
- **Ranks**: Seasonal Rank & Prestige working. Faction Ranks logic exists but UI is simplified.
- **Challenges**: Seasonal Challenges & Event Cards fully functional.
- **Records**: Tracked Triumphs working.
- **API**: Components `202, 700, 900, 1100` are active in the backend to support these features.

### 🚀 Progress Page: DIM Feature Parity

Achieved near-complete feature parity with DIM's Progress page by implementing major missing sections and fixing underlying data pipelines.

#### New Features

- **Seasonal Rank**:
  - Displays current Season Pass level, progress to next level (XP bar), and prestige rank.
  - Shows the **Well-Rested** buff indicator ("2x XP") when active.
  - Dynamic season background art.
- **Tracked Triumphs**:
  - Shows the player's in-game tracked triumph with detailed objective progress bars.
- **Seasonal Challenges**:
  - Full support for the Seasonal Challenge tree structure (Weeks -> Challenges).
  - Automatically filters hidden/invalid challenges and visualizes completion status.
- **Event Cards**:
  - Added support for active seasonal events (Solstice, Dawning, Guardian Games).
  - Renders the event card banner and description when an event is live.

#### Architecture & Backend

- **Expanded Profile Data**:
  - Updated the Cloudflare Backend (`functions/api/[[route]].ts`) to request additional Bungie API components:
    - `700` (CharacterRecords)
    - `900` (ProfileRecords)
    - `1100` (PresentationNodes)
  - This enables full tracking of triumphs, challenges, and seals.

### 🐛 Fixes

- **Manifest Pipeline Repair**:
  - **Cache Buster v3**: Forced a global manifest refresh to fix "Found 0 definitions" errors caused by stale IndexedDB data.
  - **Debug Logging**: Added granular logging to `ManifestManager` to identify specific missing definition hashes in production.

## [0.22.0] - 2026-02-17

### 🚀 Progress Dashboard & Sidebar Navigation

Introduced a comprehensive **Progress Dashboard** (`/progress`) that mirrors DIM's functionality, unifying all character objectives into a single, organized view.

#### New Features

- **Character Sidebar**: Implemented a persistent left-hand sidebar for seamless character switching. It displays the character's emblem, light level, and class, replacing top-level tabs for better vertical rhythm.
- **Unified Pursuit System**:
  - **Universal Cards**: Created `PursuitCard.tsx`, a "smart" component that renders Bounties, Quests, Milestones, and Raid Challenges with consistent visual language (progress bars, expiration badges, tracked status).
  - **Rich Tooltips**: Hovering over any pursuit reveals detailed objective data (e.g., "Precision Kills: 15/25").
- **Section Breakdown**:
  - **Milestones**: Automatically fetches and filters Weekly Powerful/Pinnacle challenges.
  - **Bounties & Quests**: Features complex sorting logic (Completed > Tracked > Expiring > Rarity).
  - **Raids**: Identifies the Weekly Featured Raid and displays its specific challenges.
  - **Pathfinder**: Initial implementation for tracking the Pale Heart Pathfinder node.

#### Architecture

- **Data Modeling**: Defined a unified `ProgressItem` interface in `services/profile/types.ts` to normalize disparate Bungie API data sources (Progression vs. Objectives vs. Records).
- **Component Reusability**: Extracted `PursuitGrid` for consistent grid layouts across all sections.

## [0.21.0] - 2026-02-15

### 🚀 DIM-Parity: Compare UI & Watermarks

Achieved near 1:1 visual parity with DIM's Comparison feature and Item Tiles.

#### Compare UI Redesign

- **Stat Numbers Only**: Removed progress bars in favor of clean, color-coded numbers (`#51b853` green for best, `#d14334` red for worst).
- **Archetype Row**: Added a dedicated row showing the item's frame archetype (icon + name).
- **Compact Layout**: Significantly reduced padding and adopted DIM's information-dense table structure.
- **Perk Alignment**: Perks and mods are now left-aligned and consistent with DIM's column layout.

#### Season/Expansion Watermarks

- **Full-Tile Overlay**: Replaced tiny corner badges with full-tile seasonal watermarks at 80% opacity.
- **DIM Logic**: Implemented DIM's exact watermark priority system:
  1. `quality.displayVersionWatermarkIcons` (Uses `currentVersion` index) - Critical for re-issued items like *Afterlight*.
  2. `iconWatermark` - Standard fallback.
  3. `iconWatermarkShelved` - For sunset/legacy items.

### 🐛 Fixes

- **Compare Stats**: Fixed a bug where comparing identical items showed definition-level stats instead of per-instance stats.
- **Missing Perks**: Fixed an issue where perks/mods wouldn't render in comparison because their definitions weren't being fetched from the manifest.

## [0.20.0] - 2026-02-15

### 🚀 Features

- **Item Comparison:** Added side-by-side comparison modal (`CompareModal.tsx`).
- **Stat Math:** Added pure TypeScript stat calculation engine (`statMath.ts`) with "Tier Break" logic.
- **Search Engine:** Implemented `is:dupe` filter using cached Set lookups for O(1) performance.

### 🛠 Tech Debt & Architecture

- **Rust Removal:** Completely removed `guardian-engine` (Rust/WASM) in favor of lightweight TypeScript.
- **Build System:** Switched strict usage to `vite build` (removed `tsc` bottleneck).
- **Config:** Fixed `tsconfig.json` to exclude `node_modules` (Zombie Build fix).
- **Styling:** Standardized on Tailwind v3 "Void" theme.

### 🐛 Fixes

- Fixed "1-hour hang" during build process.
- Fixed conflict between Tailwind v3 and PostCSS v4.

## [0.19.0] - 2026-02-13

### 🔍 Search & Discovery Overhaul

A massive upgrade to how you find items in your inventory, moving from basic filtering to a power-user "Spotlight" experience.

#### Advanced Search Syntax

- **Duplicate Detection (`is:dupe`)**: Instantly find duplicate items. Implemented with an optimized O(1) lookup map calculated during hydration to ensure zero lag even with 600+ items.
- **Perk Search (`perk:<name>`)**: Search for specific perks by name (e.g., `perk:firefly`, `perk:outlaw`). Matches against the full socket plug definition.
- **Stat Filtering (`stat:<name>:<op><value>`)**: Filter items by specific stats.
  - Supports standard stats (`mobility`, `resilience`, `recovery`, `discipline`, `intellect`, `strength`) and their abbreviations (`mob`, `res`, `rec`, `dis`, `int`, `str`).
  - Supports comparison operators: `>`, `<`, `>=`, `<=`, `=`.
  - Example: `stat:res:>=100` finds items with 100+ Resilience.

#### Spotlight UI

- **Dropdown Results**: Search results now appear in a floating "Spotlight" dropdown below the search bar instead of hiding your entire inventory.
- **Top 10 Matches**: Shows the most relevant results instantly.
- **Non-Destructive**: Your main inventory grid stays visible while you search, maintaining context.
- **Quick Actions**: Clicking a result instantly opens the Item Detail Modal.

### ✨ UI Polish

- **Delayed Tooltips**: Added a "Long Hover" tooltip to inventory items. Hovering for 6 seconds reveals the Item Name and Type in a small popover, useful for identifying items without clicking.

## [0.18.0] - 2026-02-11

### 🖱️ Click-to-Move & API Hardening

Replaced the experimental Drag-and-Drop system with a robust, DIM-style "Click-to-Move" interface. This update focuses on speed, stability, and cross-platform compatibility.

#### Interaction Overhaul: Click-to-Move

- **Item Detail Transfers**: added "Transfer" buttons directly to the Item Detail Modal.
  - **One-Click Vaulting**: "Store in Vault" button (disabled for equipped items).
  - **Character-to-Character**: Direct "Transfer to [Class]" buttons that handle the Vault hop automatically.
- **Instant UX**: Implemented "Fire-and-Forget" logic. The modal closes *instantly* upon clicking a transfer button, and the item moves visually in the background (Optimistic UI) while the API processes safely.
- **Safety Locks**: Buttons are immediately disabled upon click to prevent race conditions (Error 1623) caused by double-submitting transfers.

#### API Fixes

- **Dynamic Platform Detection**: Fixed `DestinyCharacterNotFound` (Error 1620) by extracting the correct `membershipType` (Steam, Xbox, PSN) from the user's profile instead of hardcoding it to Steam.
- **Strict ID Validation**: Added guards to `APIClient` to crash early if "vault" is accidentally passed as a Character ID, preventing malformed requests.

### Changed

- **Reverted DnD**: Removed `react-dnd` and `react-dnd-html5-backend` dependencies to reduce bundle size and complexity until a more stable implementation is ready.

## [0.17.1] - 2026-02-07

### 🏗️ Vault Refactor: Vertical Stacking

Changed the Vault rendering logic to match DIM's "Stacked" layout.

- **Type Grouping**: Instead of one continuous "snake" of items, the Vault now renders distinct blocks for each weapon type (e.g., Auto Rifles, then Hand Cannons, etc.).
- **Vertical Growth**: This forces the Vault column to grow vertically with clear visual separation between types, rather than filling horizontal space indefinitely.
- **Sorting**: Items within each block are sorted by Power Level (Descending).

## [0.17.0] - 2026-02-06

### 🎹 Vertical Rhythm Refactor

Refactored the dashboard to enforce strict "Slot-Based" Vertical Rhythm. Instead of grouping all Weapons into one big block, we now render explicit rows for each inventory bucket.

#### Why?

To solve the "Jagged Alignment" issue where a massive Vault Weapon collection would push the Armor section down, misaligning it with characters who have fewer weapons. Now, **Row 1 (Kinetic)** stretches to the height of the tallest Kinetic section (usually Vault), and **Row 2 (Energy)** starts cleanly below it for everyone.

#### Structural Changes

- **8 Explicit Rows**: Kinetic, Energy, Power, Helmet, Gauntlets, Chest, Legs, Class Item.
- **StoreBucket**: Specialized component to render a single inventory slot (Equipped + 3x3 Grid).
- **InventoryBucketLabel**: Sticky header for each specific row.
- **VirtualVaultGrid**: Updated to support filtering by `bucketHash` to render "Mini Walls" for each slot.

### Files Modified

- `src/App.tsx` - Replaced "Floor System" with "Slot Loop".
- `src/components/inventory/StoreBucket.tsx` - New component.
- `src/components/inventory/InventoryBucketLabel.tsx` - New component.
- `src/components/inventory/VirtualVaultGrid.tsx` - Added `bucketHash` prop.

## [0.16.0] - 2026-02-06

### 🧱 Layout Overhaul: The Floor System

Rewrote the main dashboard to use a "Floor-based" layout (Rows) instead of independent columns. This ensures perfect alignment of inventory sections across all characters and the vault.

#### Synchronized Shelves

- **Header Floor**: Emblems and Stats are now aligned in a top row.
- **Weapons Floor**: The "Great Wall of Guns". All character weapons and the Vault's weapon grid are horizontally adjacent.
  - **Vault Grid Merge**: The Vault now renders a single continuous list for **Weapons** (Kinetic + Energy + Power merged), sorted by slot and type. No more sub-headers breaking the flow.
- **Armor Floor**: Starts at the exact same Y-pixel for everyone, solving the misalignment caused by expanding vault lists.

#### Components Refactor

- **StoreHeader**: Extracted emblem/stats logic into a standalone component.
- **InventoryFloor**: New wrapper component that enforces `align-stretch` on its children.
- **CharacterBucket**: Specialized component for rendering strict category groups (Weapons/Armor) for characters.

### Files Modified

- `src/App.tsx` - Complete layout rewrite.
- `src/components/inventory/StoreHeader.tsx` - New component.
- `src/components/inventory/InventoryFloor.tsx` - New component.
- `src/components/inventory/CharacterBucket.tsx` - New component.
- `src/components/inventory/VirtualVaultGrid.tsx` - Added `category` prop for merged rendering.

## [0.15.0] - 2026-02-06

### 🚀 DIM-Style Vault & Project Polish

Achieved visual parity with DIM's Vault Grid and performed a major cleanup of the project structure and authentication logic.

#### Visual Overhaul

- **Phantom Separators**: Replaced text headers in the Vault with "Inline Icon Separators". These use official SVG icons (Auto Rifle, Hand Cannon, etc.) rendered with a "Phantom" style (`bg-white/5`, no border, transparent icon) to blend seamlessly into the grid.
- **Flat List Rendering**: Refactored `VirtualVaultGrid` to flatten items and separators into a single continuous list. Items now wrap naturally around the separator icons, creating a dense, space-efficient grid (gap-1).
- **Vector Icons**: Configured the project to load **local SVG icons** (imported from `destiny-icons`) instead of relying on Bungie's raster PNGs. This ensures crisp rendering at any scale.

#### Architectural Cleanup

- **Slim Cookies**: Fixed the persistent `401 Unauthorized` loop by "slimming down" the auth cookie keys (t, r, m) to avoid browser size limits.
- **Dynamic Secure Flag**: Implemented auto-detection for `secure` cookies to support both `localhost` (http) and Production (https) without manual config changes.
- **Project Reorg**: Moved `src/conductor` documentation to `docs/conductor`. Grouped root components into clear subdirectories (`src/components/ui`, `src/components/inventory`).

### Files Modified

- `src/components/inventory/VirtualVaultGrid.tsx` - Flat List logic & Separator styling.
- `src/lib/destiny/sort-engine.ts` - Updated to use local SVG imports.
- `functions/api/[[route]].ts` - Updated auth logic for Slim Cookies.
- `src/assets/icons/weapons/*.svg` - Added 17 weapon type icons.

### [0.14.0] - 2026-02-04

### 🌟 Footer Implementation (Item Popup)

Added a comprehensive footer to the Item Detail Popup, bringing it closer to DIM parity.

#### New Features

- **Exotic Box**: Dedicated section for Exotics showing:
  - **Ornaments**: Displays active ornament icon.
  - **Catalysts**: Displays active catalyst icon OR a "Golden Box" placeholder for unobtained catalysts.
- **Mod Bar**: Displays weapon mods and shaders as small circular icons.

#### Logic Enhancements

- **Catalyst Detection**: Updated `socket-helper.ts` to identify catalyst sockets including `WeaponModsIntrinsic` (2237038328) for robust handling.
- **Missing Catalyst State**: Implemented specific logic to render the "Golden Box" when a catalyst socket exists (or needs to be shown) but is empty/inactive.

### Files Modified

- `src/components/inventory/ItemDetailModal.tsx` - Added Footer JSX section.
- `src/lib/destiny/socket-helper.ts` - Extended categorization logic.
- `src/lib/destiny-constants.ts` - Added `WeaponModsIntrinsic` hash.

## [0.13.0] - 2026-02-04

### 🎯 Floating UI Popup Positioning

Converted the Item Popup from a centered modal to a **floating popover** that anchors to clicked items with collision-aware positioning.

#### New Dependencies

- **`@floating-ui/react`**: Industry-standard library for popup positioning.

#### Positioning Behavior

- **Default Placement**: `right-start` - popup appears to the right of the clicked item.
- **Collision Detection**: Uses `flip()` middleware to automatically switch to `left-start`, `bottom`, or `top` when hitting screen edges.
- **Boundary Padding**: `shift({ padding: 8 })` keeps popup 8px from viewport edges.
- **Dynamic Updates**: `autoUpdate` repositions popup when window scrolls/resizes.

#### Architecture Changes

- **Click Event Propagation**: Updated `onClick` signatures across 5 files to pass `MouseEvent` and capture `event.currentTarget` as reference element.
- **FloatingPortal**: Popup renders at document root, escaping `overflow: hidden` constraints.
- **Backdrop**: Semi-transparent `bg-black/30` overlay closes popup on click.

### Files Modified

- `App.tsx` - State now includes `referenceElement: HTMLElement | null`
- `InventoryItem.tsx` - onClick now passes MouseEvent
- `DestinyItemTile.tsx` - onClick now passes MouseEvent
- `CharacterColumn.tsx` - Propagates event through all onClick handlers
- `VirtualVaultGrid.tsx` - Propagates event through all onClick handlers
- `ItemDetailModal.tsx` - Uses `useFloating` with offset/flip/shift middleware
- `package.json` - Added `@floating-ui/react` dependency

## [0.12.0] - 2026-02-04

### 🎨 DIM-Exact Item Popup Replication

Completely rebuilt the Item Detail Modal to achieve a **1:1 visual match** with Destiny Item Manager (DIM).

#### Hybrid Styling Architecture

- **Installed `sass`**: Added Dart Sass to enable SCSS compilation in Vite.
- **Ported DIM SCSS Files**: Copied and adapted core DIM stylesheets:
  - `src/styles/dim/_variables.scss` - All DIM color tokens, mixins, and utility functions.
  - `src/styles/dim/dim-ui/common.module.scss` - Shared layout utilities (flexbox, reset button styles).
  - `src/components/inventory/styles/ItemPopup.module.scss` - Main popup container, rarity backgrounds, desktop layout.
  - `src/components/inventory/styles/ItemPopupHeader.module.scss` - Header typography, rarity colors, element icon styling.
- **CSS Modules Integration**: Enabled importing `.module.scss` files directly in React components via TypeScript declarations (`src/declarations.d.ts`).

#### Visual Fidelity

- **Rarity-Based Theming**: Header and body backgrounds now match DIM's exact hex codes:
  - Exotic: Header `#ceae33`, Body `#161204`
  - Legendary: Header `#513065`, Body `#0e0811`
  - Rare: Header `#5076a3`, Body `#0a0f15`
  - Uncommon: Header `#366e42`, Body `#081109`
  - Common: Header `#dcdcdc`, Body `#121212`
- **320px Desktop Body Width**: Matches DIM's standard popup width.
- **Right-Side Action Sidebar**: Lock, Tag, Compare, and Close buttons in a vertical strip.

#### ItemDetailModal.tsx Refactor

- **Layout Structure**: `styles.desktopPopup` (flex-row) with `styles.desktopPopupBody` (left) and `styles.desktopActions` (right).
- **Header Component**: Uses `headerStyles.header`, `headerStyles.title`, `headerStyles.subtitle` for DIM-accurate typography.
- **Rarity Class Binding**: Dynamic `styles[rarity]` and `headerStyles[rarity]` classes applied based on `tierType`.
- **JIT Definition Fetching**: Preserved the Just-In-Time plug definition fetching for perks/mods.

### 🔧 Technical Improvements

#### Build System

- **TypeScript Declarations**: Created `src/declarations.d.ts` to allow importing `*.module.scss` and `*.m.scss` files without type errors.
- **SCSS Parsing Fix**: Renamed `common.m.scss` to `common.module.scss` and removed `@layer` wrapper to fix PostCSS parsing errors.
- **Build Verification**: Confirmed `npm run build` passes with zero errors. Sass deprecation warnings are tool-level and safe to ignore.

#### Code Cleanup

- **Removed Unused Imports**: Cleaned up `BungieImage` and other unused imports from `ItemDetailModal.tsx`.
- **Removed Unused Props**: Removed `characters` and `allItems` props from `ItemDetailModal` signature and `App.tsx` usage.
- **Fixed Corrupted File**: Recovered `ItemDetailModal.tsx` from a malformed edit using `write_to_file` with full file overwrite.

### Files Added

- `src/styles/dim/_variables.scss`
- `src/styles/dim/dim-ui/common.module.scss`
- `src/components/inventory/styles/ItemPopup.module.scss`
- `src/components/inventory/styles/ItemPopupHeader.module.scss`
- `src/declarations.d.ts`

### Files Modified

- `src/components/inventory/ItemDetailModal.tsx` - Complete rewrite to use CSS Modules
- `src/App.tsx` - Removed unused props from `ItemDetailModal` component call
- `package.json` - Added `sass` dev dependency

## [0.11.0] - 2026-02-01

### Added

- **Auto-Refresh "Heartbeat" System**: Implemented smart polling that automatically fetches the latest inventory data from Bungie every 30 seconds.
  - **Visibility Check**: Skips fetches when the browser tab is hidden to save API quota.
  - **In-Flight Guard**: Prevents duplicate requests when one is already in progress.
  - **Refresh Button**: Added a spinning refresh icon to the top navigation bar with a "Last updated: X ago" tooltip.
  - **Optimistic Updates**: Old data stays visible during refresh to prevent UI flashing.

### Files Added

- `src/hooks/useAutoRefresh.ts` - Smart polling hook with configurable interval
- `src/components/ui/RefreshButton.tsx` - Animated refresh button with relative time tooltip

## [0.10.0] - 2026-01-31

### Feature Parity (DIM Match)

- **Max Power Calculation**: Implemented a sophisticated power calculation engine (`powerUtils.ts`) that determines the user's "Base Power". It strictly respects Destiny 2's "One Exotic Weapon + One Exotic Armor" equip rule to show the true potential level. This appears in **Gold** next to the current light level.
- **Postmaster Integration**: Added a dedicated "Postmaster" row in the Character Column to display lost items (Bucket Hash `215593132`) directly within the inventory view.
- **Granular Vault Categorization**: The Vault now groups items by their specific sub-category (e.g., "Auto Rifle", "Helmet", "Fusion Rifle") instead of broad generic buckets. These sub-groups are sorted alphabetically for easier browsing.

### UI Polish (The "Bungie Standard")

- **Pixel-Perfect Alignment**:
  - Rebuilt the **Vault Header** to exactly match the Character Column headers (48px top bar + 103px stats block), ensuring the first row of items aligns perfectly across the screen.
  - Implemented **"Ghost Slots"** in character inventory rows to maintain a rigid grid structure even when slots are empty.
- **Armor 3.0 Stats**:
  - Updated stat labels to use functional names: **Health** (Resilience), **Melee** (Strength), **Grenade** (Discipline), **Super** (Intellect), **Class** (Recovery), **Weapons** (Mobility).
  - Visualization changed to prioritize the **Raw Value** (large, bold text) over progress bars, with gold highlighting for T10 (100+) stats.
- **Unified Scrolling**: The entire dashboard (Characters + Vault) now scrolls together in a single viewport, replacing independent column scrolling for a more cohesive desktop experience.

### Fixed

- **Image Rendering**: Solved broken image links by implementing a robust `BungieImage` component that correctly handles relative Bungie paths and provides fallbacks.
- **Type Safety**: Improved type definitions for Profile and Item interfaces.

## [0.9.0] - 2026-01-31

### Architecture Revert

- **Back to Vite**: Reverted the entire project from a Next.js Server-Side experimentation back to a stable **Vite + React (SPA)** architecture.
- **Client-Side Rendering**: Restored standard Client-Side Rendering (CSR) for better performance and compatibility with Bungie's heavy manifest data.
- **Cloudflare Pages**: Deployment target switched from Vercel Hybrid to **Cloudflare Pages** (Static Assets + Functions).

### The "Git Crisis"

- **History Restoration**: Recovered from an accidental force-push that wiped 200+ commits. Successfully grafted the new Vite architecture onto the original `0.8.0` history, preserving all prior work.
- **Cleanup**: Deleted the massive `reference/` (DIM source) folder and uninstalled all Next.js dependencies (`next`, `@cloudflare/next-on-pages`) to ensure a clean slate.

### Fixed

- **Deployment**: Resolved Cloudflare Pages "Root Directory" build failures by flattening the repository structure.
- **API Restoration**: Manually restored the `functions/` API directory (which was accidentally deleted during cleanup) and adapted it from Next.js API Routes to **Hono + Cloudflare Pages Functions**.
- **OAuth Hell**: Resolved persistent `401 Unauthorized` / `invalid_client` errors during Bungie Token Exchange:
  - **Configuration**: Added `BUNGIE_AUTH_URL` to environment variables (`wrangler.toml` and `.dev.vars`).
  - **Whitespace**: Implemented `.trim()` on all environment variables to prevent invisible copy-paste errors.
  - **Auth Method**: Switched from `Authorization: Basic` header to sending `client_id` and `client_secret` in the **POST Body** for better stability.
  - **Debugging**: Added robust logging (without exposing full secrets) to verify credential propagation in production.

### Infrastructure

- **Local Dev**: Created `.dev.vars` for secure local development of Cloudflare Functions.
- **Wrangler**: Updated `wrangler.toml` to publicly expose non-sensitive vars (`BUNGIE_CLIENT_ID`) while keeping secrets secure in the dashboard.

## [0.8.0] - 2026-01-10

### Critical Failures

- **Item Icons**: Item icons are NOT showing up in the TypeScript + React environment. Despite implementing backend proxies, cache clearing, and CSS fixes, the images fail to render.

## [0.7.0] - 2025-12-27

### Added

- **Core DIM Replication**: Achieved near-parity with DIM's core inventory UI and item movement logic.
- **Smart Item Transfers**: Implemented a `TransferService` that handles multi-hop moves (Character A -> Vault -> Character B) automatically.
- **Virtualized Vault**: Integrated `@tanstack/react-virtual` to support smooth scrolling for 600+ vault items without performance degradation.
- **Item Context Menu**: Added a Right-Click menu for items with options to Tag (Favorite, Junk, etc.), Lock (stub), and Move.
- **Metadata Persistence**: Implemented Cloudflare D1 backend (`/api/metadata`) to persistently store user Tags and Notes.
- **Drag & Drop**: Fully wired up Drag & Drop for transferring items between characters and the vault.
- **Optimistic UI**: Implemented instant UI updates for item moves and tagging, syncing with the backend in the background.

### Changed

- **Item Rendering**: Fixed "White Square" visual bug by implementing robust image error handling and fallbacks in `DestinyItemTile`.
- **Project Structure**: Organized project with Graphite "Stacked PR" workflow for better code review and feature isolation.

### Fixed

- **Type Safety**: Resolved 20+ TypeScript errors and unused variable warnings across the codebase.
- **Linting**: Cleaned up ESLint errors in legacy files.

### [Error Handling & Recovery]

- **Image Failure Mitigation**: Implemented a robust `BungieImage` component that uses `IntersectionObserver` for lazy loading and auto-hides broken images to prevent the "White Square of Death" UI glitch.
- **Vault Hydration Recovery**: Fixed a critical logic error where filtering by a raw Hash ID instead of the Bungie Enum caused the entire Vault to appear empty. Implemented `owner === 'vault'` check as the definitive source of truth.
- **Virtualization Stability**: Enforced fixed row heights in the Vault Grid to prevent scroll jumping and ensure consistent intersection detection during rapid scrolling.

### Known Issues

- **UI NEEDS TO BE FIXED**: While functional, the UI still has alignment issues, placeholder overlapping, and missing animations that need significant polish to match DIM's quality.

## [0.6.0] - 2025-12-23

### Changed

- **Infrastructure Migration**: Migrated backend from Cloudflare Workers to Cloudflare Pages Functions to establish a First-Party Cookie context (`/api/...`).
- **Auth Strategy**: Attempted to implement DIM-style Body Authentication and Standard Basic Auth for Bungie OAuth.

### Fixed

- **CORS/Cookies**: Resolved cross-site cookie blocking by serving the API from the same domain as the frontend.

### Known Issues

- **Critical Auth Failure**: Token exchange (`/api/auth/callback`) consistently fails with `invalid_client` (400), despite verifying credentials and trying multiple auth methods (Header vs Body) and Redirect URI configurations. The exact cause remains unidentified after extensive debugging.

## [0.5.0] - 2025-12-22

### Added

- **Frontend Refactor**: Migrated frontend to a modern, typed architecture under `src/services`, `src/hooks`, and `src/components/{inventory,destiny,auth,ui}`.
- **Typed API Client**: Implemented a robust `APIClient` (`src/services/api/client.ts`) for centralized backend communication.
- **Local Manifest Manager**: Created `ManifestManager` (`src/services/manifest/manager.ts`) with IndexedDB (`idb-keyval`) caching for high-performance definition lookups.
- **Zipper Data Model**: Implemented `useProfile` hook that "zips" live Bungie data with local user metadata (Tags/Notes).
- **Optimistic Updates**: Added support for immediate UI feedback when updating item metadata, with background synchronization.
- **DIM-Standard UI**: Refactored `ArsenalPage.tsx` and `ItemCard.tsx` to meet DIM's density and precision standards (48x48px tiles, rarity borders, power/element overlays).

### Changed

- **Vite Proxy**: Configured local development proxy to forward `/api` requests to the Cloudflare Worker.

### Fixed

- **Dashboard Stability**: Resolved crash issues on Dashboard load by implementing robust error boundaries and loading states in hooks.

### Known Issues

- **Last Line Failure**: Encountered 3 errors on the last line which need addressing later.

## [0.4.0] - 2025-12-22

### Added

- **Cloudflare Worker Backend**: Initialized a new serverless backend in `api/` using Hono and Cloudflare Workers.
- **Bungie OAuth Proxy**: Implemented secure OAuth 2.0 flow with state validation and HTTP-only cookies (`/auth/login`, `/auth/callback`).
- **Manifest Infrastructure**: Created a dedicated Manifest Service (`src/manifest.ts`) with Cloudflare KV caching for version metadata.
- **Manifest Proxy Endpoint**: Added `/api/manifest/definitions/:table` to proxy and cache Bungie manifest requests.
- **User Metadata Database**: Configured Cloudflare D1 database (`guardian-db`) and applied initial migration for `UserMetadata` (Tags, Notes).
- **Environment Security**: Implemented secure secret management using `.dev.vars` (local) and Wrangler secrets (production).

### Infrastructure

- **Deployment**: Successfully deployed the API worker to `https://guardian-nexus-api.zeroij.workers.dev`.

## [0.3.0] - 2025-12-13

### Added

- **Horizontal Dashboard**: Implemented a scrollable, DIM-like dashboard in `Arsenal.jsx` with dedicated Character Columns and Vault.
- **Top Navigation Bar**: Added a sticky header with Inventory, Progress, Vendors links, and a unified Search bar.
- **Character Stats**: Added real-time character stats (Mobility, Resilience, Recovery, etc.) to the column headers (`CharacterColumn.jsx`) [21e5878].
- **Item Overlays**: Added Power Level, Element Icons, and Masterwork borders to `ItemCard.jsx` [cee3855].
- **Constants**: Created `src/utils/constants.js` to centralize Bungie API hashes (Buckets, Stats, Damage Types) [21e5878].

### Changed

- **Performance**: Implemented **Chunked Manifest Fetching** (Batch Size: 50) in `Arsenal.jsx` to resolve 502 Bad Gateway errors when loading large vaults (400+ items) [3892788].
- **Item Cards**: Completely redesigned `ItemCard.jsx` to match DIM's 48x48px square tiles with rarity-colored borders and compact overlays [cee3855].
- **Vault Visibility**: Fixed the "Empty Vault" bug by filtering for "Instanced Items" only and chunking requests.
- **Column Layout**: Refactored `CharacterColumn.jsx` to support strict slot grouping (Kinetic, Energy, Power) [1bd1cdc].

### Fixed

- **API Timeouts**: Resolved backend timeouts by batching manifest definition requests.
- **Missing Imports**: Fixed `ReferenceError` in `CharacterColumn.jsx` by restoring missing React/ItemCard imports [7e267d1].

## [0.2.1] - 2025-11-22

### Changed

- **Manifest Strategy**: Switched from downloading the SQLite database to fetching definitions directly from the Bungie API (`/Platform/Destiny2/Manifest/...`). This resolves timeout issues on Vercel Serverless.
- **Inventory UI**: Revamped `Arsenal.jsx` to include Armor sections (Helmet, Gauntlets, Chest, Legs, Class).
- **Grid Layout**: Updated `WeaponGrid.jsx` to use a responsive auto-fill grid for better adaptability.
- **Item Cards**: Increased card size, added a premium hover glow, and improved the tooltip design.

### Fixed

- **Vercel 500 Error**: Resolved the "Internal Server Error" caused by the manifest download timeout.
- **Dependencies**: Removed `sqlite3` from `api/package.json` as it is no longer needed.

## [0.2.0] - 2025-11-22

### Added

- **Premium Design Integration**: Integrated a new high-fidelity UI ("Arsenal" theme) with a dark, sci-fi aesthetic.
- **Starfield Background**: Added an animated canvas-based starfield background (`StarfieldBackground.jsx`).
- **Arsenal View**: Implemented the main inventory interface (`Arsenal.jsx`) featuring a sidebar and categorized weapon grids.
- **Real Data Wiring**: Connected the new UI to the Bungie API, fetching real user inventory, equipment, and item definitions.
- **Item Cards**: Enhanced `ItemCard.jsx` with rarity-based borders (using the new color palette), power levels, and tooltips.

### Changed

- **UI Overhaul**: Replaced the basic Dashboard with the new Arsenal layout.
- **Styling**: Overwrote `index.css` with a comprehensive Tailwind setup for the new theme (custom scrollbars, fonts, animations).
- **Routing**: Updated `App.jsx` to support the new Home and Dashboard views with smooth transitions.

### Fixed

- **Data Merging**: Solved an issue where item instance data (Power Level, Perks) was not correctly merging with item definitions.
- **CSS Lints**: Fixed minor CSS validation errors in `index.css`.

## [0.1.0] - 2025-11-21

### Added

- **Project Foundation**: Initialized React + Vite project with Tailwind CSS.
- **Manifest System**: Implemented automated downloading and parsing of the Destiny 2 Manifest (SQLite) in `api/services/manifestService.js`.
- **Authentication**: Implemented Bungie.net OAuth 2.0 flow in `api/routes/auth.js`.
- **Dashboard**: Created a basic Dashboard component to display User Characters and Light Level.
- **Vercel Support**: Configured `vercel.json` and refactored backend to `api/index.js` for Serverless deployment.

### Changed

- **Backend Architecture**: Migrated from a stateful Express server (MongoDB) to a stateless Vercel Serverless architecture using `cookie-session`.
- **Manifest Storage**: Updated manifest service to use `/tmp` directory for compatibility with Vercel's ephemeral file system.
- **API Routing**: Updated frontend to use relative paths (`/api/...`) for seamless integration with the serverless backend.

### Fixed

- **Vercel 404 Errors**: Fixed routing issues by adding explicit rewrites in `vercel.json` for `/auth/callback`.
- **Public Client Auth**: Modified `authService.js` to support Public Clients by making `client_secret` optional (ignoring placeholders).
- **Profile Fetch Error**: Fixed 500 error by correctly fetching `destinyMembershipId` and `membershipType` (Steam/Xbox/PSN) instead of using the generic Bungie account ID.

### Security

- **Environment Variables**: Removed unused `MONGODB_URI`. Ensured sensitive keys are loaded from process.env.
