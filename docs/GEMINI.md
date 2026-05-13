# PROJECT NOTES (legacy constitution)

> **2026-05-13:** This file predates current Guardian Manager behavior. Treat it as **historical guidance**, not strict law.

## Contradictions vs current repo

- **Drag-and-drop:** This doc previously discouraged `dnd-kit`. The app **ships `@dnd-kit/core`** on **`Inventory.tsx`** for tile transfers alongside click-to-popup. Both interaction models are intentional.
- **Store path:** References to `src/store/inventoryStore.ts` → use **`src/store/useInventoryStore.ts`**.
- **Item actions:** `ItemActionModal` naming may not match current `ItemDetailModal` / popup container pattern.

## Still useful themes

- Prefer **Zustand** for cross-cutting client state.
- Prefer **optimistic** store updates where safe.
- **Vite** build (`npm run build`), not Next.js.

For architecture truth, see **`DEVELOPER_GUIDE.md`** and **`DIM_GAP_ANALYSIS_ROADMAP.md`**.
