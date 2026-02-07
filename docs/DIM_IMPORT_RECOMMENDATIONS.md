# DIM Feature Import Recommendations

Analysis of which DIM features to port to Guardian Nexus, prioritized by value and complexity.

---

## High Priority (Immediate Value)

### 1. Wishlist System

**Source:** `app/wishlists/`

Tag rolls as "god roll" / "trash" based on community data. Instant engagement feature.

### 2. Item Comparisons

**Source:** `app/compare/`

Side-by-side weapon/armor comparison with stat deltas. Core power-user feature.

### 3. Search Filter Language

**Source:** `app/search/`

`is:dupe`, `perk:outlaw`, `stat:recovery:>60` syntax. Makes the app 10x more useful.

---

## Medium Priority (Quality of Life)

### 4. Loadout System

**Source:** `app/loadout-drawer/`, `app/loadout/`

Save/restore full equipment sets with one click.

### 5. Organizer View

**Source:** `app/organizer/`

Sortable table view with bulk actions for 500+ vault items.

### 6. Infusion Finder

**Source:** `app/infuse/`

Shows what items can infuse into what.

---

## Low Priority (Nice to Have)

- **Armory/Database** (`app/armory/`) — All possible rolls for a weapon
- **Farming Mode** (`app/farming/`) — Auto-move to vault during activities

---

## Do NOT Import

| Feature | Reason |
|---------|--------|
| Redux State | Using React Context + SWR |
| D1 Support | Legacy code not needed |
| IndexedDB | Cloudflare worker handles caching |
| Service Workers | Different deployment model |

---

## Recommended Starting Point

1. **Search filters** — High impact, differentiating
2. **Wishlist integration** — Community wishlists + indicators
3. **Comparison sheet** — Simple, high satisfaction
