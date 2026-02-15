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

### 2. Item Comparisons ✅

**Source:** `app/compare/`

Side-by-side weapon/armor comparison with stat deltas. Core power-user feature.

**Status:** IMPLEMENTED — Full comparison modal with DIM-style layout:

- ✅ **Stat Engine**: DIM-ported `calculateStats` with base stats, socket bonuses, interpolation (`src/lib/destiny/stat-manager.ts`)
- ✅ **Delta Calculator**: `compareStats` with stat-by-stat difference (`src/lib/inventory/statMath.ts`)
- ✅ **Stat Categorization**: `categorizeStatDeltas` groups stats into Weapon / Armor / Hidden
- ✅ **Tier Break Info**: `getTierBreakInfo` shows T1–T10 breakpoints for armor stats
- ✅ **Side-by-Side Item Cards**: Icon, name, power, rarity border with "VS" divider
- ✅ **Socket Comparison Grid**: Intrinsic / Perks / Mods aligned horizontally using `ItemSocket`
- ✅ **Dual-Layer Stat Bars**: Ghost bar (Item A) + solid bar (Item B) with green/red delta badges
- ✅ **Recoil Direction**: Two SVG arcs rendered side-by-side via `RecoilStat`
- ✅ **Zustand Integration**: `toggleCompare` / `clearCompare` actions in `useInventoryStore`

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
| Item Comparisons | ✅ | High |
| Search Filters | ✅ | High |
| Loadout System | ❌ | Medium |
| Organizer View | ❌ | Medium |
| Infusion Finder | ❌ | Medium |
| Armory/Database | ❌ | Low |
| Farming Mode | ❌ | Low |

---

## Recommended Next Steps

1. **Loadout System** — Save/restore full equipment sets with one click
2. **Organizer View** — Sortable table for bulk vault management
3. **Infusion Finder** — Show infusion paths between items
