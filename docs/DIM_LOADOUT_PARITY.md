# DIM Loadout Parity: Implementation Guide

This document outlines the feature gaps between Guardian Manager's current "Tactical Briefing" Loadouts and DIM's comprehensive system. It provides a roadmap for implementing the missing "invisible" logic (Mods, Subclasses, Validation) while retaining our unique UI.

## 1. Subclass Configuration (Aspects & Fragments)

**The Gap:**
We currently store the **Subclass Item Hash** (e.g., "Voidwalker"), but we do NOT store the **Plugs** (Aspects, Fragments, Super, Abilities). Equip fails if the user has switched subclass nodes.

**DIM Reference:**

- **File:** `dim-api-types/loadouts.ts` -> `LoadoutItem.socketOverrides`
- **Logic:** `app/loadout-drawer/loadout-utils.ts` -> `convertDimLoadoutItemToUnequippedItem`

**Implementation Checklist:**

- [ ] **Update Interface**: Modify `ILoadoutItem` to include `socketOverrides?: Record<number, number>` (SocketIndex -> PlugHash).
- [ ] **Capture Logic**: Update `saveLoadout` in `loadoutStore.ts` to scrape the `sockets` component of the currently equipped subclass.
- [ ] **Equip Logic**: Update `equipManager.ts` -> `applyLoadout` to call `Awaited<Device.equipItemPlugins>` for subclass sockets.
- [ ] **UI**: Add a hover tooltip or mini-icon row to `LoadoutCard` showing usage of specific Aspects/Fragments.

## 2. Armor Mods & Artifact Perks

**The Gap:**
We equip items but ignore their mods. A PvP loadout without Targeting/Dexterity mods is incomplete.

**DIM Reference:**

- **File:** `app/loadout/loadout-types.ts` -> `Loadout.parameters.modsByBucket`
- **Logic:** `app/loadout/mod-assignment-drawer/ModAssignmentDrawer.tsx`

**Implementation Checklist:**

- [ ] **Update Interface**: Add `modsByBucket?: Record<number, number[]>` to `ILoadout`.
- [ ] **Capture Logic**: Scrape `item.sockets` for all armor pieces during save. Filter for "Modification" socket types.
- [ ] **Equip Logic**: Implementing mod swapping is complex (Glimmer cost, socket compatibility).
  - *Phase 1*: Just warn the user ("Mods do not match").
  - *Phase 2*: Implement `applyMods` using `bungie-api-ts` `plugSocket`.
- [ ] **UI**: Add a "Mods" section to `LoadoutCard` (maybe expanded view) showing key mods.

## 3. Fashion (Ornaments & Shaders)

**The Gap:**
The user looks different when equipping the loadout because we don't apply their cosmetics.

**DIM Reference:**

- **File:** `app/loadout/loadout-types.ts` -> `LoadoutItem.socketOverrides` (Same as Subclass)
- **Logic:** `app/loadout-drawer/loadout-item-conversion.ts`

**Implementation Checklist:**

- [ ] **Consolidate**: Use the same `socketOverrides` field from Step 1 to store Ornament and Shader hashes.
- [ ] **Equip Logic**: `equipManager.ts` must iterate over these overrides and apply them if the item is capable.

## 4. Validation & Warnings

**The Gap:**
If an item is moved to another character or deleted, we just fail silently or show a generic error.

**DIM Reference:**

- **File:** `app/loadout/LoadoutView.tsx` -> `warnitems`
- **Logic:** `app/loadout-drawer/loadout-utils.ts` -> `getUnequippableItems`

**Implementation Checklist:**

- [ ] **Pre-Check**: Before equipping, run a `validateLoadout(loadout, inventory)` function.
  - Check if items exist (hash + instanceId match).
  - Check if items are on another character (needs transfer).
  - Check if items are in Vault (needs transfer).
- [ ] **UI**:
  - **Missing Item**: Render red `AlertTriangle` on the tile.
  - **Remote Item**: Render yellow `ArrowRight` (needs transfer).
  - **Class Mismatch**: Disable "Equip" button if loadout class != character class.

## 5. Metadata (Notes)

**The Gap:**
Users cannot describe *why* they built this loadout (e.g., "Use for DPS phase", "Requires 100 Rec").

**DIM Reference:**

- **UI:** `app/loadout/LoadoutView.tsx` -> `item.notes`

**Implementation Checklist:**

- [ ] **Update Interface**: Add `notes?: string` to `ILoadout`.
- [ ] **UI**: Add an editable text area in the "Edit" modal (Phase 6b).
- [ ] **Search**: Allow searching loadouts by notes content.

---

## Technical Roadmap

### Phase 6a: Robust Data Structure (Foundation)

1. Update `ILoadout` type definition.
2. Rewrite `createLoadoutFromEquipped` to capture Sockets (Subclass + Mods + Fashion).
3. Add database migration (if using IndexedDB/localStorage) to update old loadouts.

### Phase 6b: The "Edit" Drawer

1. Implement the `onEdit` handler in `LoadoutCard`.
2. Create a "Loadout Editor" side-sheet (like DIM's Drawer) to tweak these new values without re-equipping.

### Phase 6c: The "Apply" Engine

1. Upgrade `equipManager.ts` to handle:
    - `transferItem` (Vault -> Char).
    - `equipItem` (Base).
    - `applySocketOverrides` (Subclass/Fashion).
    - `applyMods` (Armor Mods).

## Technical Note: Definition "Hydration" for Mods & Aspects

**The Challenge:**
`useInventoryStore` only fetches definitions for *Instanced Items* (Weapons/Armor) currently in the user's inventory.
It does **not** automatically fetch definitions for:

- Mods (Loader, Scavenger, Resist, etc.)
- Subclass Verbs (Aspects, Fragments)
- Artifact Perks

**The Fix:**
You must implement "Just-In-Time" (JIT) fetching or bulk-loading for these hashes before rendering `LoadoutCard`.

```typescript
// Example: Ensure definitions are loaded before rendering Mod icons
const modHashes = loadout.items.flatMap(i => i.socketOverrides ? Object.values(i.socketOverrides) : []);
// Call this hook in your component or parent wrapper
useDefinitions('DestinyInventoryItemDefinition', modHashes);
```

Without this, `manifest[modHash]` will be undefined, and icons will not render.
