# Guardian Manager — Developer Guide

Welcome to the **Guardian Manager** (Guardian Nexus) codebase. This guide describes layout, data flow, and where logic lives.

**Doc audit:** 2026-05-13 — aligned with current `src/` (inventory uses `StoreBucket` / `Inventory.tsx`, not legacy `CharacterColumn`).

## Project structure

```
src/
├── components/
│   ├── inventory/      # Inventory grid, ItemDetailModal, overlays, vault
│   ├── layout/         # TopBar, navigation
│   ├── loadouts/       # Loadout cards, editor drawer
│   └── ui/             # Shared UI (toasts, feed panel, etc.)
├── hooks/              # useProfile, useDefinitions, useHotkeys, etc.
├── lib/                # Pure logic — destiny/, search/, bungie/equipManager
├── pages/              # Route pages (Inventory, Loadouts, Organizer, …)
├── services/           # API client, profile cache, manifest
├── store/              # Zustand stores (inventory, loadouts, item popup, sync)
└── App.tsx             # Router, ItemPopupContainer, feed, clarity init
```

## Key surfaces

### `pages/Inventory.tsx`

Main dashboard: profile + definitions, **CSS Grid** columns per character + vault (`inventoryGridTemplate`), **TopBar** search, **DndContext** for drag-drop, **ItemPopupContainer** renders the global item popup (opened via `useItemPopupStore`).

### `components/inventory/StoreBucket.tsx`

Per-character bucket row: equipped tile + inventory grid using **`var(--item-size)`** / **`var(--item-gap)`**.

### `components/inventory/VirtualVaultGrid.tsx`

Vault column: grouped by type, flex-wrap, droppable regions.

### `components/inventory/InventoryItem.tsx`

Item tile: rarity border, masterwork, element, power — sized from CSS variables (`useResponsiveItemSize` on Inventory).

## Data flow

1. **Bungie API** (via Worker) → profile / components for items.
2. **Manifest** — definitions through `useDefinitions` + cached manifest manager.
3. **Zustand** — `useInventoryStore.hydrate()` merges profile + processed items; moves/equips go through store + services.

## Core utilities

- **`lib/destiny/powerUtils.ts`** — `calculateMaxPower` (exotic cap, best gear).
- **`components/ui/BungieImage.tsx`** — Bungie CDN paths + fallbacks.
- **`data/constants.ts`** — bucket hashes, stat hashes, damage types.

## Getting started

1. `npm install`
2. `npm run dev`
3. Secrets: `BUNGIE_*` in `.env` / `.dev.vars` for Workers.

## UI density

Target DIM-like density: **`--item-size`** scales with viewport (`useResponsiveItemSize`), grid uses **`minmax(0, 1fr)`** so the page does not horizontally scroll on desktop.
