# DIM Feature Import Recommendations

Analysis of which DIM features to port to Guardian Nexus, prioritized by value and complexity.

**Legend:** ✅ Implemented | 🚧 Partial | ❌ Not Started

---

## High Priority (Immediate Value)

## High Priority (Immediate Value)

### 1. Interaction Model (Click-to-Move) ✅

**Source:** `app/item-popup/`

DIM's primary interaction model is clicking an item to open a detailed menu with transfer controls.

**Status:** IMPLEMENTED — Replaced unstable Drag-and-Drop with robust Click-to-Move.

- ✅ **Item Popup**: Detailed floating modal with stats, perks, and mods.
- ✅ **Transfer Controls**: "Store in Vault", "Transfer to Character".
- ✅ **Optimistic UI**: Instant visual feedback.
- ❌ **Drag-and-Drop**: Reverted due to complexity/instability. (Future consideration)

### 2. Wishlist System ✅

**Source:** `app/wishlists/`

Tag rolls as "god roll" / "trash" based on community data. Instant engagement feature.

**Status:** IMPLEMENTED — Full wishlist system with Voltron auto-load:

- ✅ Parser for DIM/DTR/Banshee formats (`src/lib/wishlist/parser.ts`)
- ✅ Matcher for perk combinations (`src/lib/wishlist/matcher.ts`)
- ✅ React hook with localStorage (`src/hooks/useWishlist.ts`)
- ✅ Global context provider (`src/contexts/WishlistContext.tsx`)
- ✅ 👍/👎 indicators on vault and character items
- ✅ Green border + badge on matching perks in popup
- ✅ Settings UI for managing sources (`src/components/settings/WishlistSettings.tsx`)

### 2. Item Comparisons ❌

**Source:** `app/compare/`

Side-by-side weapon/armor comparison with stat deltas. Core power-user feature.

**Status:** Not implemented. No comparison view/modal found.

### 3. Search Filter Language ✅

**Source:** `app/search/`

`is:dupe`, `perk:outlaw`, `stat:recovery:>60` syntax. Makes the app 10x more useful.

**Status:** IMPLEMENTED — Advanced syntax engine operational in `src/lib/search/itemFilter.ts`.

- ✅ `is:exotic`, `is:legendary`, `is:rare`, `is:common` (rarity)
- ✅ `is:weapon`, `is:armor` (category)
- ✅ `is:kinetic`, `is:arc`, `is:solar`, `is:void`, `is:stasis`, `is:strand` (element)
- ✅ `is:dupe` (duplicate detection via Set<InstanceId>)
- ✅ `perk:*` (perk filtering via socket plugs)
- ✅ `stat:*:>N` (stat comparison with aliases like `res`, `rec`)

---

## Medium Priority (Quality of Life)

### 4. Loadout System 🚧

**Source:** `app/loadout-drawer/`, `app/loadout/`

Save/restore full equipment sets with one click.

**Status:** PARTIAL reference only — `powerUtils.ts` mentions loadout concept but no full implementation.

### 5. Organizer View ❌

**Source:** `app/organizer/`

Sortable table view with bulk actions for 500+ vault items.

**Status:** Not implemented.

### 6. Infusion Finder ❌

**Source:** `app/infuse/`

Shows what items can infuse into what.

**Status:** Not implemented.

---

## Low Priority (Nice to Have)

- ❌ **Armory/Database** (`app/armory/`) — All possible rolls for a weapon
- ❌ **Farming Mode** (`app/farming/`) — Auto-move to vault during activities

---

## Do NOT Import

| Feature | Reason |
|---------|--------|
| Redux State | Using React Context + SWR |
| D1 Support | Legacy code not needed |
| IndexedDB | Cloudflare worker handles caching |
| Service Workers | Different deployment model |

---

## Implementation Summary

| Feature | Status | Priority |
|---------|--------|----------|
| Wishlist System | ✅ | High |
| Item Comparisons | ❌ | High |
| Search Filters | 🚧 (basic `is:`) | High |
| Loadout System | ❌ | Medium |
| Organizer View | ❌ | Medium |
| Infusion Finder | ❌ | Medium |
| Armory/Database | ❌ | Low |
| Farming Mode | ❌ | Low |

---

## Recommended Next Steps

1. **Complete Search Filters** — Add `is:dupe`, `perk:*`, `stat:*` syntax
2. **Comparison Sheet** — Side-by-side weapon stats
3. **Loadout System** — Save/restore equipment sets
