# Plan: UI/UX Polish & DIM Parity

## Phase 1: High-Fidelity Item Tiles
- [ ] Task: Create `DestinyItemTile` Component
    - Implement 48x48px container.
    - Add Rarity Border logic.
    - Add Icon/Watermark layers.
- [ ] Task: Implement Stat/Element Overlays
    - Create the "Bottom Bar" overlay.
    - Map DamageType hashes to icons.

## Phase 2: Character Columns & Stats
- [ ] Task: Refactor `CharacterColumn`
    - Implement "Emblem Header" with Power Level.
    - Add T1-T10 Stat Bars (Mob/Res/Rec).
- [ ] Task: Implement Bucket Grouping
    - Ensure items are sorted into Kinetic/Energy/Power slots correctly.

## Phase 3: Drag & Drop Infrastructure
- [ ] Task: Install `@dnd-kit`
    - `npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` (Already installed).
- [ ] Task: Implement Draggable Item Wrapper
    - Wrap `DestinyItemTile` with `useDraggable`.
- [ ] Task: Implement Droppable Containers
    - Make Character Buckets droppable targets.

## Phase 4: Search & filtering
- [ ] Task: Implement Basic Text Search
    - Filter items by name.
    - (Bonus) Parse `is:exotic` or `is:weapon`.
