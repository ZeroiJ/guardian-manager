# DIM Feature Import Recommendations

Analysis of which DIM features to port to Guardian Nexus, prioritized by value and complexity.

**Legend:** ✅ Implemented | 🚧 Partial | ❌ Not Started

---

## High Priority (Immediate Value)

### 1. Wishlist System ❌

**Source:** `app/wishlists/`

Tag rolls as "god roll" / "trash" based on community data. Instant engagement feature.

**Status:** Not implemented. No wishlist integration found.

### 2. Item Comparisons ❌

**Source:** `app/compare/`

Side-by-side weapon/armor comparison with stat deltas. Core power-user feature.

**Status:** Not implemented. No comparison view/modal found.

### 3. Search Filter Language 🚧

**Source:** `app/search/`

`is:dupe`, `perk:outlaw`, `stat:recovery:>60` syntax. Makes the app 10x more useful.

**Status:** PARTIAL — Basic `is:` filters implemented in `src/lib/search/itemFilter.ts`:

- ✅ `is:exotic`, `is:legendary`, `is:rare`, `is:common` (rarity)
- ✅ `is:weapon`, `is:armor` (category)
- ✅ `is:kinetic`, `is:arc`, `is:solar`, `is:void`, `is:stasis`, `is:strand` (element)
- ❌ `is:dupe` (duplicate detection)
- ❌ `perk:*` (perk filtering)
- ❌ `stat:*:>N` (stat comparison)

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
| Wishlist System | ❌ | High |
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
2. **Wishlist Integration** — Community wishlists + god roll indicators
3. **Comparison Sheet** — Side-by-side weapon stats
