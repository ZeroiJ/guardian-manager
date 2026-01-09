# DIM Replication Plan

**Goal:** Replicate the core UI logic of Destiny Item Manager (DIM) for Guardian Manager, using `dim-source` as the reference blueprint but implementing with modern React/Tailwind/Vite.

## Phase 1: Inventory Structure & Rendering [COMPLETED]
- [x] **Analyze Inventory Structure**: Map `Inventory.tsx` and `Stores.tsx` to `ArsenalPage` and `CharacterColumn`.
- [x] **Extract Item Rendering**: Replicate `InventoryItem.tsx` as `DestinyItemTile` (48x48px, high density, overlays).
- [x] **Implement Drag & Drop**: Integrate `@dnd-kit` for item movement.
- [x] **Character Columns**: Implement DIM-style headers, stats, and bucket grouping.

## Phase 2: Virtualization Strategy [COMPLETED]
- [x] **Analysis**: Review `VirtualList.tsx` in `dim-source` (`@tanstack/react-virtual`).
- [x] **Implementation**: Create `VirtualVaultGrid` to handle 600+ vault items efficiently.
- [x] **Integration**: Replace naive Vault rendering in `ArsenalPage` with `VirtualVaultGrid`.

## Phase 3: The "Zipper" Selector [COMPLETED]
- [x] **Data Model**: Replicate `src/app/inventory/selectors.ts` to merge Bungie Manifest + Live Instances + Local Metadata.
    - [x] `useProfile` hook basic implementation.
    - [x] Optimistic UI updates for item moves.
- [x] **Write-Back UI**: Implement Context Menu (Right-Click) for setting Tags and Notes.
- [x] **Persistence**: Implement backend API (`/api/metadata`) to store Tags/Notes in Cloudflare D1.
- [ ] **Advanced Filtering**: Enable search filters based on tags (e.g., `tag:junk`, `tag:favorite`).

## Phase 4: Item Logic & Actions [IN PROGRESS]
- [x] **Move Logic**: Robust transfer logic.
    - [x] Basic API Client (`transferItem`).
    - [x] Basic Backend Proxy (`/api/actions/transfer`).
    - [x] **Smart Transfers**: Handle "Cross-Character" moves (Source -> Vault -> Destination) automatically (`TransferService`).
- [ ] **Equip Logic**: Handle "Equip" actions (drag to slot, double-click).
- [ ] **Loadouts**: Implement the "Loadout Optimizer" engine core.

## Phase 5: Modernization [ONGOING]
- [x] **Strict Types**: Ensure no `any` types are used; leverage `bungie-api-ts`.
- [x] **Tailwind CSS**: All styling must use utility classes (no CSS-in-JS or SCSS).
- [x] **Performance**: Ensure 60fps scrolling and instant interactions.
