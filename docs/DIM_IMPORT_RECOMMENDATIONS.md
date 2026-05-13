# DIM Feature Import Recommendations

Analysis of which DIM features to port to Guardian Manager, prioritized by value and complexity.

**Legend:** ✅ Implemented | 🚧 Partial | ❌ Not Started  
**Audit:** 2026-05-13 — statuses verified against `src/` (see codebase, not historical labels alone).

---

## High Priority (Immediate Value)

### 1. Interaction Model ✅

**Source:** `app/item-popup/`

Primary flow: click item → popup with transfers. **Additionally**, inventory supports `@dnd-kit` drag-and-drop between buckets/vault (see `Inventory.tsx`).

**Status:** IMPLEMENTED

- ✅ **Item popup**: Floating `ItemDetailModal` via global `ItemPopupContainer` / `useItemPopupStore` (DIM-style single popup).
- ✅ **Transfer controls**: Vault / character moves from popup and bulk bar.
- ✅ **Optimistic UI**: Store-driven updates.
- ✅ **Drag-and-drop**: `@dnd-kit/core` on inventory grid (contradicts older “click-only”-only docs — both coexist).

### 2. Wishlist System ✅

**Source:** `app/wishlists/`

**Status:** IMPLEMENTED — parser, matcher, settings UI, indicators on tiles/popup.

### 3. Item Comparisons ✅ / 🚧

**Source:** `app/compare/`

**Status:** IMPLEMENTED — `CompareModal` with multi-item columns (`items[]`), stat highlights, sockets. DIM extras like auto-picking “similar rolls” may still differ.

### 4. Search Filter Language ✅

**Source:** `app/search/`

**Status:** IMPLEMENTED — `query-parser` + `itemFilter.ts` with boolean queries and filters.

---

### 5. Progress Page 🚧

**Source:** `app/progress/`

**Status:** SHIPPED AS BETA — Seasonal rank, challenges, events; some sections (faction diamonds, milestone filtering) remain polish items.

---

## Medium Priority (Quality of Life)

### 6. Loadout System 🚧

**Source:** `app/loadout-drawer/`, `app/loadout/`

**Status:** PARTIAL — editor drawer, subclass plugs, mods capture, validation UI, `equipManager.applyLoadout` with transfers, socket overrides (`InsertSocketPlugFree`), and naive armor mod application. Remaining: share codes, robust exotic/mod ordering parity with DIM, optional “analyzer”.

### 7. Masterwork Detection & Display ✅

**Status:** IMPLEMENTED — `item.state` bitmask, gold treatment on `InventoryItem`.

### 8. Organizer View ✅

**Source:** `app/organizer/`

**Status:** IMPLEMENTED — `src/pages/Organizer.tsx`, CSV export (`exportToCSV` / `downloadCSV`).

### 9. Infusion Finder ✅

**Source:** `app/infuse/`

**Status:** IMPLEMENTED — `InfusionFinder.tsx` + `infusionFinder.ts`, wired from `ItemDetailModal`.

### 10. Item Detail Overlay (Armory-style) ✅

**Status:** IMPLEMENTED — `ItemDetailOverlay.tsx` (full breakdown; overlaps DIM Armory + popup concepts).

---

## Low Priority (Nice to Have)

- 🚧 **Armory / all-rolls grid** — Overlay covers most; dedicated “every roll” grid not a priority.
- ✅ **Farming mode** — `useFarmingMode`, store toggle, auto-move (`Inventory.tsx` top bar).

---

## Do NOT Import (historical)

| Feature | Reason |
|---------|--------|
| Redux layout | We use Zustand |
| D1 game | Out of scope |

**Note:** Older drafts said “IndexedDB / Cloudflare” contradictions — we use **IDB for profile + manifest** and **Cloudflare Worker + D1** for API/sync; both are intentional.

---

## Implementation Summary (audit snapshot)

| Feature | Status | Priority |
|---------|--------|----------|
| Interaction + popup + DnD | ✅ | High |
| Wishlist | ✅ | High |
| Compare | ✅ / 🚧 | High |
| Search | ✅ | High |
| Progress | 🚧 | High |
| Loadouts | 🚧 | Medium |
| Masterwork | ✅ | Medium |
| Organizer | ✅ | Medium |
| Infusion | ✅ | Medium |
| Item overlay | ✅ | Medium |
| Farming | ✅ | Low |

---

## Recommended Next Steps

1. **Loadout parity** — Share codes, DIM-grade mod assignment ordering, clearer exotic conflict UX.
2. **Progress polish** — Faction / milestone UX where still generic.
3. **Compare** — Optional “suggest similar” from wishlist or stat proximity.
