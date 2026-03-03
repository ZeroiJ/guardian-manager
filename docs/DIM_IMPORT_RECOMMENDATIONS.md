# DIM Feature Import Recommendations

Analysis of which DIM features to port to Guardian Nexus, prioritized by value and complexity.

**Legend:** ✅ Implemented | 🚧 Partial | ❌ Not Started

---

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

### 4. Progress Page (v0.23.0) 🚧

**Source:** `app/progress/`

Comprehensive dashboard for Ranks, Challenges, and Triumphs.

**Status:** BETA / MAINTENANCE MODE

- ✅ **Seasonal Rank**: Full XP bar & prestige logic.
- ✅ **Challenges**: Tree traversal for Seasonal Challenges.
- ✅ **Event Cards**: Active event detection.
- 🚧 **Faction Ranks**: Logic ported (`useProgressStore`), UI needs detailed "diamond" steps.
- 🚧 **Milestones**: Logic exists, needs "Challenge" specific filtering.

---

## Medium Priority (Quality of Life)

### 5. Loadout System 🚧

**Source:** `app/loadout-drawer/`, `app/loadout/`

Save/restore full equipment sets with one click.

**Status:** PARTIAL — Core functionality implemented in v0.24.0-v0.27.0

- ✅ **Loadout Card**: Standalone "Tactical Briefing" card component with class-colored accents
- ✅ **Loadout Page**: `/loadouts` hub with card grid, equip/delete actions
- ✅ **Loadout Editor Drawer**: Full slide-up drawer for creating/editing loadouts
- ✅ **Class Filtering**: Armor and subclass filtering by character class (like DIM's `isItemLoadoutCompatible`)
- ✅ **Item Picker**: Full drawer showing all items from inventory + vault, filtered by bucket and class
- ✅ **Subclass Configuration**: `SubclassPlugDrawer` for configuring abilities, aspects, and fragments
- ✅ **Socket Overrides**: Save subclass plug selections with loadout
- ✅ **Manifest Integration**: `DestinyPlugSetDefinition` loading for plug set lookups
- ✅ **Inline Mod Slots**: 4 mod boxes per armor piece (1 general + 3 slot-specific) shown directly in editor
- ✅ **ModPicker Categorization**: Tabbed by slot (Helmet, Gauntlets, Chest, Legs, Class Item, General)
- ✅ **ModPicker Armor Context**: Shows selected armor piece at top of each tab
- ✅ **ModPicker Auto-Tab**: `targetBucket` prop auto-selects the correct slot tab when opened from a mod box
- 🚧 **Equip Action**: Basic equip flow wired up
- ❌ **Loadout Sharing**: DIM-style share codes
- ❌ **Auto-Equip**: One-click equip from saved loadouts
- ❌ **Loadout Analyzer**: What-if scenarios

### 6. Masterwork Detection & Display ✅

**Source:** `app/inventory/store/masterwork.ts`, `app/utils/socket-utils.ts`

DIM uses socket plug analysis to determine masterwork status and display gold borders.

**Status:** IMPLEMENTED — Using Bungie API `item.state` bitmask (`& 4`):

- ✅ **Gold Border**: Masterworked items show `#eade8b` border instead of rarity color
- ✅ **Gold Background**: Warm golden tint behind masterworked item icons
- ✅ **Gold Power Badge**: Solid gold compact badge with dark text (bottom-right corner)
- ✅ **Normal Items**: Dark badge with white text, rarity-based border unchanged

### 7. Organizer View ❌

**Source:** `app/organizer/`

Sortable table view with bulk actions for 500+ vault items.

**Status:** Not implemented.

### 8. Infusion Finder ❌

**Source:** `app/infuse/`

Shows what items can infuse into what.

**Status:** Not implemented.

### 9. Item Detail Overlay (Armory View) ✅

**Source:** `app/armory/`, `app/item-popup/`

Full item breakdown modal with stats, perks, lore, and advanced metadata. DIM splits this across Armory (full page) and Item Popup (floating). We unified both into a single overlay modal.

**Status:** IMPLEMENTED — v0.28.0 (base) + v0.29.0 (advanced metadata)

- ✅ **Screenshot Header**: Full-width weapon screenshot with gradient overlay, season watermark
- ✅ **Segmented Stat Bars**: Color-coded segments (base/parts/traits/mod/masterwork) with hover tooltips
- ✅ **Key Stats on Intrinsic**: Inline RPM/Impact display on frame perk
- ✅ **Socket Override / Perk Swap Preview**: Click alternative perks to preview stat changes live
- ✅ **SVG Perk Circles**: DIM-accurate circular perk rendering with enhanced perk gold treatment
- ✅ **Perk Grid/List Toggle**: Two view modes with full perk descriptions in list mode
- ✅ **"Your Items" Grid**: All owned copies with power, owner tooltip, Compare button
- ✅ **Season Info**: Watermark-to-season mapping (80 URLs, 28 seasons)
- ✅ **Kill Tracker**: PvP/PvE/Gambit classification from 10 known objective hashes
- ✅ **Crafted Weapon Info**: Shaped badge with level + progress bar
- ✅ **Deepsight Pattern Progress**: Pattern completion via DestinyRecordDefinition lookup
- ✅ **Exotic Catalyst Progress**: Objective bars via exotic-to-catalyst-record mapping
- ✅ **Armor Energy Meter**: 10-slot used/available/locked bar from instanceData.energy
- ✅ **Lore & Flavor Text**: Full lore from DestinyLoreDefinition, source from DestinyCollectibleDefinition
- ✅ **External Links**: light.gg and D2 Foundry
- ✅ **Wishlist Badge in Overlay**: Show wishlist match status in the overlay with detailed verdict banners

---

## Low Priority (Nice to Have)

- 🚧 **Armory/Database** (`app/armory/`) — All possible rolls for a weapon. Partial: Item Detail Overlay covers most of the Armory view (stats, perks, perk swap preview, lore, season info). Missing: community roll ratings, all possible random rolls grid.
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
| Interaction Model | ✅ | High |
| Wishlist System | ✅ | High |
| Item Comparisons | ✅ | High |
| Search Filters | ✅ | High |
| Progress Page | 🚧 | High |
| Loadout System | 🚧 | Medium |
| Masterwork Detection | ✅ | Medium |
| Organizer View | ❌ | Medium |
| Infusion Finder | ❌ | Medium |
| Item Detail Overlay | ✅ | Medium |
| Armory/Database | 🚧 | Low |
| Farming Mode | ❌ | Low |

---

## Recommended Next Steps

1. **Complete Loadout System** — Auto-equip, loadout sharing, analyzer
2. **Review Progress Page Beta** — Ensure Ranks and Challenges remain stable
3. **Organizer View** — Sortable table for bulk vault management
