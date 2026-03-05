# Guardian Nexus vs. DIM: Gap Analysis & Roadmap

This document provides a comprehensive audit of Destiny Item Manager (DIM) source modules compared to the current state of Guardian Nexus. It outlines missing features, existing features requiring upgrades, and a prioritized implementation roadmap.

## Executive Summary

- **Core Parity**: Guardian Nexus successfully handles basic inventory viewing, moving items, and simple loadout creation.
- **Major Gaps**: We completely lack advanced armor optimization, comprehensive search/filtering logic, vendor/collection views, and the robust loadout application pipeline (mods, fashion, conflicts).
- **Technical Advantage**: Our Vite/Zustand stack is leaner than DIM's legacy Angular-roots/Redux setup, allowing us to build these features with modern React patterns and better performance.

---

## Gap Analysis: Missing Features

### Tier 1: Critical Parity (High Priority / High Impact)

| Feature | DIM Source Reference | Description | Effort |
| :--- | :--- | :--- | :--- |
| ~~**Advanced Search & Filtering**~~ | `src/app/search/` | ~~50+ search filters with full boolean query parsing (`is:weapon AND (is:crafted OR is:deepsight)`). We currently have ~10 basic filters.~~ **DONE** — AST lexer/parser built in `query-parser.ts`, filter evaluator in `itemFilter.ts`. | ~~High~~ |
| **Loadout Application Pipeline** | `src/app/loadout-drawer/loadout-apply.ts` | Complete equip logic (~800 lines) handling mod assignment, exotic conflict resolution, and detailed progress notifications. *Partially done* — basic equip pipeline exists in `equipManager.ts` but lacks exotic conflict resolution and dequip logic. | High |
| ~~**In-Game Loadout Integration**~~ | `src/app/loadout/ingame/` | ~~Viewing, applying, and syncing with Destiny 2's native in-game loadout system.~~ **DONE** — Types & processing in `ingame-loadouts.ts`, `useInGameLoadouts` hook, `InGameLoadoutCard` UI, `applyInGameLoadout()` via worker proxy, integrated into `LoadoutDrawer`. | ~~Medium~~ |
| ~~**Drag-and-Drop Inventory**~~ | `src/app/inventory/` | ~~Dragging items between characters/vault for quick transfers.~~ **DONE** — `@dnd-kit/core` in `Inventory.tsx` with `StoreBucket`/`VirtualVaultGrid` drop targets, `InventoryItem` draggable (equipped items excluded). | ~~Medium~~ |

### Tier 2: Major Systems (Medium-High Priority)

| Feature | DIM Source Reference | Description | Effort |
| :--- | :--- | :--- | :--- |
| **Loadout Optimizer / Armor Builder** | `src/app/loadout-builder/` | Web Worker-powered armor optimization engine to hit specific stat tiers. | Very High |
| **Vendors Page** | `src/app/vendors/` | Viewing all vendor inventories, bounties, and engram focusing options. | High |
| **Collections, Triumphs & Metrics** | `src/app/records/` | Browsing game records, titles, and collectible checklists. | High |
| **Item Triage / Vault Cleaning** | `src/app/item-triage/` | Tools for identifying duplicate or low-stat rolls to dismantle. | Medium |
| **Organizer / Spreadsheet View** | `src/app/organizer/` | Table-based view for mass-comparing and tagging items. | Medium |

### Tier 3: Enhancements & Power User Tools (Medium Priority)

| Feature | DIM Source Reference | Description | Effort |
| :--- | :--- | :--- | :--- |
| **Infusion Finder** | `src/app/infuse/` | Recommending items to use as infusion fuel to raise power level. | Low |
| **Farming Mode** | `src/app/farming/` | Automatically moving engrams/items to the vault to keep character space clear during activities. | Low |
| **Socket Stripping** | `src/app/strip-sockets/` | Removing all mods from armor to prepare for new builds. | Low |
| **Fashion System** | `src/app/loadout/fashion/` | Saving and applying specific shaders and ornaments within loadouts. | Medium |
| **Keyboard Shortcuts** | `src/app/hotkeys/` | Global keybinds for searching, moving, and navigating. | Low |
| **Bulk Actions** | `src/app/inventory/bulk-actions.tsx` | Locking, unlocking, or moving multiple selected items at once. | Low |

### Tier 4: Polish & Ecosystem (Low Priority)

| Feature | DIM Source Reference | Description | Effort |
| :--- | :--- | :--- | :--- |
| **Cross-Device Sync** | `src/app/dim-api/` | Cloud syncing for custom tags, notes, and settings. | High |
| **Item Feed** | `src/app/item-feed/` | Real-time log of newly acquired items. | Low |
| **Hashtag Notes** | `src/app/inventory/note-hashtags.ts` | Adding `#pvp` or `#keep` text notes to items. | Low |
| **Clarity Integration** | `src/app/clarity/` | Sourcing community-sourced detailed perk stats (numbers/percentages). | Medium |
| **CSV Export** | `src/app/inventory/spreadsheets.ts` | Exporting inventory data to spreadsheets. | Low |
| **Themes & PWA** | `src/app/themes/` | Custom color schemes and offline/app installation support. | Low |

---

## Existing Features Requiring Upgrades

| Feature | Current State | Required Upgrades (to match DIM) |
| :--- | :--- | :--- |
| ~~**Search**~~ | ~~Text/name matching only.~~ **DONE** — Full AST parser with boolean logic, stat filters, perk filters. | ~~Needs a parser (AST) for boolean logic, stat filters (`stat:recovery:>60`), and perk filters.~~ |
| **Compare** | Basic 1v1 comparison. | Needs multi-item side-by-side comparison, auto-suggesting similar items. |
| **Postmaster** | View only. | Needs a "Pull from Postmaster" button and "Collect All" functionality. |
| **Notifications** | Simple toasts. | Needs persistent progress tracking (e.g., "Moving 5 items... 2/5 done") and undo actions. |
| **Settings** | Very minimal. | Needs extensive display, sorting, and behavior toggles. |

---

## Recommended Implementation Roadmap

### Phase 1: Foundation & Friction Removal
*Focus on making basic use as smooth as DIM.*
1. ~~Build the advanced search parser (Boolean logic, basic filters like `is:weapon`).~~ **DONE**
2. ~~Add Drag-and-Drop support for items across the main inventory grid.~~ **DONE**
3. Add Postmaster interactions (pulling items).
4. Implement Keyboard Shortcuts.

### Phase 2: The Loadout Upgrade
*Focus on robust buildcrafting.*
1. Re-write the loadout application pipeline to handle mods and exotics safely. *(In progress — basic pipeline exists, needs exotic conflict resolution & dequip logic.)*
2. ~~Integrate in-game loadouts (view and apply).~~ **DONE**
3. Add socket stripping and basic fashion integration.

### Phase 3: Advanced Tools
*Focus on power-user features.*
1. Build the Organizer/Spreadsheet view.
2. Implement Item Triage and bulk actions.
3. Develop the Vendors and Records pages.

### Phase 4: The Final Frontier
*Focus on the most complex, value-add features.*
1. **Loadout Optimizer**: Tackle the Web Worker-based armor builder. This is a massive project requiring substantial UI and background processing architecture.
2. Cross-device sync via a custom backend or indexedDB sync solutions.

---

## Architecture Notes

- **What NOT to import:** Do not port DIM's Redux state structure. Maintain our use of Zustand for headless, localized state management.
- **Performance:** For the Loadout Optimizer (when we get to it), we should leverage our Vite setup to easily implement Web Workers for stat permutations to avoid blocking the main React thread.
