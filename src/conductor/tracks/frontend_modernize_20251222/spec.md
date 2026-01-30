# Specification: Frontend Modernization & Zipper Integration

## 1. Overview
Rebuild the core frontend architecture to leverage the new Cloudflare Worker backend. This involves creating a robust API client, a local Manifest cache using IndexedDB, and a high-performance inventory UI that replicates DIM's density and responsiveness.

## 2. Goals
- **API Integration:** Connect the frontend to the new Cloudflare Worker endpoints for Auth, Manifest, and Profile data.
- **Manifest Management:** Implement a local caching layer (IndexedDB) to store item definitions, eliminating the need for repeated large JSON downloads.
- **"Zipper" Model Implementation:** Create a data layer that merges live Bungie inventory state with local metadata (Tags, Notes) from our D1 database.
- **UI/UX Polishing:** Refactor `ArsenalPage` and its components to match DIM's dense, grid-based layout and fluid interactions.

## 3. Technical Requirements
- **Framework:** React 19, TypeScript.
- **State Management:** React Context + Hooks (or lightweight store).
- **Storage:** `idb-keyval` for local Manifest caching.
- **Styling:** Tailwind CSS v4 (Destiny-Dark palette).
- **Performance:** Optimized rendering for large lists (Virtualization if needed, though DIM-style grids often rely on dense flexbox).

## 4. Components to Refactor
- `ArsenalPage.tsx`: Main view logic and data orchestration.
- `CharacterColumn.tsx`: Dense display of equipped/inventory items.
- `ItemCard.tsx`: Square 48x48 tiles with rich overlays (Power, Element, Masterwork).
- `APIClient.ts`: New service for talking to the Cloudflare Worker.

## 5. Security
- Use secure cookies set by the backend for authentication.
- No sensitive Bungie tokens should be handled directly in frontend application code (only in the Proxy).
