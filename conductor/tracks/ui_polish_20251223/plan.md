# Plan: UI/UX Polish & DIM Parity

## Phase 1: High-Fidelity Item Tiles
- [x] Task: Create `DestinyItemTile` Component
    - Implement 48x48px container.
    - Add Rarity Border logic.
    - Add Icon/Watermark layers.
- [x] Task: Implement Stat/Element Overlays
    - Create the "Bottom Bar" overlay.
    - Map DamageType hashes to icons.

## Phase 2: Character Columns & Stats
- [x] Task: Refactor `CharacterColumn`
    - Implement "Emblem Header" with Power Level.
    - Add T1-T10 Stat Bars (Mob/Res/Rec).
- [x] Task: Implement Bucket Grouping
    - Ensure items are sorted into Kinetic/Energy/Power slots correctly.

## Phase 3: Drag & Drop Infrastructure
- [x] Task: Install `@dnd-kit`
    - `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` (Already installed).
- [x] Task: Implement Draggable Item Wrapper
    - Wrap `DestinyItemTile` with `useDraggable`.
- [x] Task: Implement Droppable Containers
    - Make Character Buckets droppable targets. (Context wrapper implemented, specific drop zones next track).

## Phase 4: Search & filtering
- [x] Task: Implement Basic Text Search
    - Filter items by name.
    - (Bonus) Parse `is:exotic` or `is:weapon`.
