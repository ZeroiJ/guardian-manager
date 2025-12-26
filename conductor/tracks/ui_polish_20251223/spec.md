# Spec: UI/UX Polish & DIM Parity

## Context
We have the data flowing (Zipper model working), but the UI is still a basic grid. To compete with DIM, we need to match its information density and utility.

## Requirements

### 1. Inventory Grid (The "Vault" View)
- **Density:** Items must be 48x48px (desktop) or adaptive (mobile).
- **Gap:** Minimal gap (2px or less) to maximize screen real estate.
- **Buckets:** Group items strictly by Kinetic, Energy, Power, Helmet, Gauntlets, Chest, Legs, Class Item, Ghost, Artifact.
- **Responsive:** Horizontal scrolling for Characters (like DIM) vs Vertical for mobile? No, DIM uses horizontal columns for characters on desktop.

### 2. Item Tile (The "Atom")
- **Icons:** Bungie Image server.
- **Borders:** Color-coded by rarity (Exotic=#ceae33, Legendary=#522f65).
- **Overlays:**
    - **Top Right:** Season Watermark / Locked Icon.
    - **Bottom Bar:** Element Icon (left), Power Level (right).
    - **Masterwork:** Gold border overlay if masterworked.
    - **Wishlist:** Thumbs up/down overlay (future proofing).
    - **New Item:** subtle glow/dot.

### 3. Character Headers
- **Emblem:** Background image.
- **Stats:** Mobility, Res, Rec, Dis, Int, Str (with tier progress bars).
- **Power:** Base Power + Artifact Bonus = Total.

### 4. Drag & Drop (Interaction)
- **Library:** `@dnd-kit`.
- **Logic:** Dragging an item from Character A to Character B should invoke the "Move" logic (via Vault if needed).
- **Feedback:** "Ghost" image while dragging.

## Reference (dim-source)
- `dim-source/src/app/inventory/InventoryGrid.tsx`
- `dim-source/src/app/inventory/ConnectedInventoryItem.tsx`
- `dim-source/src/app/css/dim.scss` (variables)
