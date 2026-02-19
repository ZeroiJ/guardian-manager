# DIM Loadout Parity: Implementation Guide

This document outlines the feature gaps between Guardian Manager's current "Tactical Briefing" Loadouts and DIM's comprehensive system. It provides a roadmap for implementing the missing "invisible" logic (Mods, Subclasses, Validation) while retaining our unique UI.

## 1. Subclass Configuration (Aspects & Fragments) — DONE

**The Gap:**
We currently store the **Subclass Item Hash** (e.g., "Voidwalker"), but we do NOT store the **Plugs** (Aspects, Fragments, Super, Abilities). Equip fails if the user has switched subclass nodes.

**DIM Reference:**

- **File:** `dim-api-types/loadouts.ts` -> `LoadoutItem.socketOverrides`
- **Logic:** `app/loadout-drawer/loadout-utils.ts` -> `convertDimLoadoutItemToUnequippedItem`

**Implementation Checklist:**

- [x] **Update Interface**: `ILoadoutItem.socketOverrides?: Record<number, number>` — `loadoutStore.ts:39`
- [x] **Capture Logic**: `captureSubclassSocketOverrides()` saves all non-empty plugs (Super, Abilities, Aspects, Fragments) — `loadoutStore.ts:89-105`, called in `saveCurrentLoadout` at line 299
- [ ] **Equip Logic**: Update `equipManager.ts` -> `applyLoadout` to call `InsertSocketPlugFree` for subclass sockets. *(Phase 6c — not started)*
- [x] **UI**: "Config" `PlugIconRow` in `LoadoutCard` shows all subclass plug icons with JIT definition hydration — `LoadoutCard.tsx:603-611`

## 2. Armor Mods & Artifact Perks — DONE (capture + display)

**The Gap:**
We equip items but ignore their mods. A PvP loadout without Targeting/Dexterity mods is incomplete.

**DIM Reference:**

- **File:** `app/loadout/loadout-types.ts` -> `Loadout.parameters.modsByBucket`
- **Logic:** `app/loadout/mod-assignment-drawer/ModAssignmentDrawer.tsx`

**Implementation Checklist:**

- [x] **Update Interface**: `ILoadout.modsByBucket?: Record<number, number[]>` — `loadoutStore.ts:67`
- [x] **Capture Logic**: `captureArmorMods()` extracts mod plug hashes from ArmorMods/ArmorPerks_Reusable socket categories — `loadoutStore.ts:113-141`, called in `saveCurrentLoadout` at line 307
- [ ] **Equip Logic**: Implementing mod swapping is complex (Glimmer cost, socket compatibility). *(Phase 6c — not started)*
  - *Phase 1*: Just warn the user ("Mods do not match").
  - *Phase 2*: Implement `applyMods` using `InsertSocketPlugFree`.
- [x] **UI**: "Mods" `PlugIconRow` in `LoadoutCard` shows mod icons — `LoadoutCard.tsx:614-622`

## 3. Fashion (Ornaments & Shaders) — DONE (capture + display)

**The Gap:**
The user looks different when equipping the loadout because we don't apply their cosmetics.

**DIM Reference:**

- **File:** `app/loadout/loadout-types.ts` -> `LoadoutItem.socketOverrides` (Same as Subclass)
- **Logic:** `app/loadout-drawer/loadout-item-conversion.ts`

**Implementation Checklist:**

- [x] **Consolidate**: `captureFashionOverrides()` uses the same `socketOverrides` field, capturing from ArmorCosmetics/WeaponCosmetics socket categories — `loadoutStore.ts:149-177`, called in `saveCurrentLoadout` at line 316 for all non-subclass items
- [x] **UI**: "Fashion" `PlugIconRow` in `LoadoutCard` shows ornament/shader icons — `LoadoutCard.tsx:625-633`
- [ ] **Equip Logic**: `equipManager.ts` must iterate over these overrides and apply them via `InsertSocketPlugFree`. *(Phase 6c — not started)*

## 4. Validation & Warnings — DONE

**The Gap:**
If an item is moved to another character or deleted, we just fail silently or show a generic error.

**DIM Reference:**

- **File:** `app/loadout/LoadoutView.tsx` -> `warnitems`
- **Logic:** `app/loadout-drawer/loadout-utils.ts` -> `getUnequippableItems`

**Implementation Checklist:**

- [x] **Pre-Check**: `validateLoadout()` checks each item against live inventory (missing/remote/ok status) and class mismatch — `loadoutStore.ts:492-530`
  - Checks if items exist (hash + instanceId match).
  - Checks if items are on another character (needs transfer).
  - Checks class mismatch against target character.
- [x] **UI**:
  - **Missing Item**: Red `AlertTriangle` badge on `ItemTile` + grayscale + reduced opacity — `LoadoutCard.tsx:173-178`
  - **Remote Item**: Amber `ArrowRight` badge on `ItemTile` + amber border — `LoadoutCard.tsx:180-184`
  - **Class Mismatch**: Disables equip button and shows "mismatch" label in character picker — `LoadoutCard.tsx:737-767`
  - **Warning Banner**: Summary banner above gear grid shows missing count, remote count, and class mismatch — `LoadoutCard.tsx:502-524`
- Validation computed per-loadout in `Loadouts.tsx:236` and passed as prop.

## 5. Metadata (Notes) — DONE

**The Gap:**
Users cannot describe *why* they built this loadout (e.g., "Use for DPS phase", "Requires 100 Rec").

**DIM Reference:**

- **UI:** `app/loadout/LoadoutView.tsx` -> `item.notes`

**Implementation Checklist:**

- [x] **Update Interface**: `ILoadout.notes?: string` — `loadoutStore.ts:61`
- [x] **UI**: Inline editable textarea in `LoadoutCard` with Save/Cancel buttons, Ctrl+Enter shortcut, click-to-edit display — `LoadoutCard.tsx:636-686`
- [x] **Store Action**: `updateNotes(id, notes)` action in loadoutStore — `loadoutStore.ts:390-396`
- [x] **Wiring**: `Loadouts.tsx` passes `onUpdateNotes` handler to LoadoutCard — `Loadouts.tsx:240`
- [ ] **Search**: Allow searching loadouts by notes content. *(Not started)*

---

## Technical Roadmap

### Phase 6a: Robust Data Structure (Foundation) — DONE

1. ~~Update `ILoadout` type definition.~~ Done — `socketOverrides`, `modsByBucket`, `notes` all added.
2. ~~Rewrite `createLoadoutFromEquipped` to capture Sockets (Subclass + Mods + Fashion).~~ Done — `saveCurrentLoadout` captures all three via dedicated helper functions.
3. ~~Add database migration (if using IndexedDB/localStorage) to update old loadouts.~~ Done — localStorage persist version 1→2 migration in `loadoutStore.ts:411-431`.

### Phase 6b: The "Edit" Drawer — NOT STARTED

1. Implement the `onEdit` handler in `LoadoutCard`. *(Currently a no-op placeholder)*
2. Create a "Loadout Editor" side-sheet (like DIM's Drawer) to tweak subclass config, mods, fashion without re-equipping.

### Phase 6c: The "Apply" Engine — NOT STARTED

1. Upgrade `equipManager.ts` to handle:
    - `transferItem` (Vault -> Char, Char -> Char via Vault).
    - `equipItem` (Base — already working).
    - `applySocketOverrides` (Subclass/Fashion via `InsertSocketPlugFree`).
    - `applyMods` (Armor Mods via `InsertSocketPlugFree`).

Currently `equipManager.ts` only uses the basic `EquipItems` batch API. Socket overrides and mods from the loadout are captured and displayed but **not applied** during equip.

## Technical Note: Definition "Hydration" for Mods & Aspects — DONE

**The Challenge:**
`useInventoryStore` only fetches definitions for *Instanced Items* (Weapons/Armor) currently in the user's inventory.
It does **not** automatically fetch definitions for:

- Mods (Loader, Scavenger, Resist, etc.)
- Subclass Verbs (Aspects, Fragments)
- Artifact Perks

**Solution Implemented:**
`LoadoutCard` collects all plug hashes (subclass + mods + fashion), deduplicates them, and uses `useDefinitions('DestinyInventoryItemDefinition', allPlugHashes)` for JIT loading from the manifest IndexedDB cache — `LoadoutCard.tsx:335-345`.

```typescript
// Actual implementation in LoadoutCard.tsx
const allPlugHashes = useMemo(() => {
    const set = new Set([...subclassPlugHashes, ...modHashes, ...fashionHashes]);
    return Array.from(set);
}, [subclassPlugHashes, modHashes, fashionHashes]);

const { definitions: plugDefs } = useDefinitions(
    'DestinyInventoryItemDefinition',
    allPlugHashes,
);
```
