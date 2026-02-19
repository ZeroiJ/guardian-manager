# PROJECT CONSTITUTION (Updated: Feb 2026)

## 1. ARCHITECTURE & STATE
- **State Management:** Strict usage of **Zustand** (`src/store`).
- **Logic Pattern:** "Headless Engine." Logic (moves, equips, loads) lives in the Store, NOT in React components.
- **UI Pattern:** Components are "dumb." They only render data from the Store and trigger Store actions.

## 2. INTERACTION MODEL
- **Approved:** "Click-to-Move." (Click Item -> Open Modal -> Select Target).
- **BANNED:** Drag-and-Drop. Do not suggest `react-dnd` or `dnd-kit`. It is too buggy for this grid density.
- **Optimistic UI:** All actions must update the Zustand store *instantly* (0ms latency) before awaiting the API.

## 3. BUILD & TOOLS
- **Bundler:** Vite (NOT Next.js). Do not create `next.config.ts`.
- **Build Script:** `vite build` ONLY. Do not use `tsc && vite build` (causes hangs).
- **TypeScript:** `tsconfig.json` MUST exclude `node_modules` to prevent "Zombie Builds."
- **Styling:** Tailwind v3 (Standard). Do not use v4 features or `postcss-import` that conflicts with our config.

## 4. CRITICAL FILES
- `src/store/inventoryStore.ts`: The Brain.
- `src/components/ItemActionModal.tsx`: The Interaction.
- `package.json`: Scripts must match the "Vite" pattern.
