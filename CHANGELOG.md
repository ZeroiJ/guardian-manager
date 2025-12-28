# Changelog

All notable changes to the "Guardian Nexus" project will be documented in this file.

## [0.7.0] - 2025-12-27

### Added
- **Core DIM Replication**: Achieved near-parity with DIM's core inventory UI and item movement logic.
- **Smart Item Transfers**: Implemented a `TransferService` that handles multi-hop moves (Character A -> Vault -> Character B) automatically.
- **Virtualized Vault**: Integrated `@tanstack/react-virtual` to support smooth scrolling for 600+ vault items without performance degradation.
- **Item Context Menu**: Added a Right-Click menu for items with options to Tag (Favorite, Junk, etc.), Lock (stub), and Move.
- **Metadata Persistence**: Implemented Cloudflare D1 backend (`/api/metadata`) to persistently store user Tags and Notes.
- **Drag & Drop**: Fully wired up Drag & Drop for transferring items between characters and the vault.
- **Optimistic UI**: Implemented instant UI updates for item moves and tagging, syncing with the backend in the background.

### Changed
- **Item Rendering**: Fixed "White Square" visual bug by implementing robust image error handling and fallbacks in `DestinyItemTile`.
- **Project Structure**: Organized project with Graphite "Stacked PR" workflow for better code review and feature isolation.

### Fixed
- **Type Safety**: Resolved 20+ TypeScript errors and unused variable warnings across the codebase.
- **Linting**: Cleaned up ESLint errors in legacy files.

### [Error Handling & Recovery]
- **Image Failure Mitigation**: Implemented a robust `BungieImage` component that uses `IntersectionObserver` for lazy loading and auto-hides broken images to prevent the "White Square of Death" UI glitch.
- **Vault Hydration Recovery**: Fixed a critical logic error where filtering by a raw Hash ID instead of the Bungie Enum caused the entire Vault to appear empty. Implemented `owner === 'vault'` check as the definitive source of truth.
- **Virtualization Stability**: Enforced fixed row heights in the Vault Grid to prevent scroll jumping and ensure consistent intersection detection during rapid scrolling.

### Known Issues
- **UI NEEDS TO BE FIXED**: While functional, the UI still has alignment issues, placeholder overlapping, and missing animations that need significant polish to match DIM's quality.

## [0.6.0] - 2025-12-23

### Changed
- **Infrastructure Migration**: Migrated backend from Cloudflare Workers to Cloudflare Pages Functions to establish a First-Party Cookie context (`/api/...`).
- **Auth Strategy**: Attempted to implement DIM-style Body Authentication and Standard Basic Auth for Bungie OAuth.

### Fixed
- **CORS/Cookies**: Resolved cross-site cookie blocking by serving the API from the same domain as the frontend.

### Known Issues
- **Critical Auth Failure**: Token exchange (`/api/auth/callback`) consistently fails with `invalid_client` (400), despite verifying credentials and trying multiple auth methods (Header vs Body) and Redirect URI configurations. The exact cause remains unidentified after extensive debugging.

## [0.5.0] - 2025-12-22

### Added
- **Frontend Refactor**: Migrated frontend to a modern, typed architecture under `src/services`, `src/hooks`, and `src/components/{inventory,destiny,auth,ui}`.
- **Typed API Client**: Implemented a robust `APIClient` (`src/services/api/client.ts`) for centralized backend communication.
- **Local Manifest Manager**: Created `ManifestManager` (`src/services/manifest/manager.ts`) with IndexedDB (`idb-keyval`) caching for high-performance definition lookups.
- **Zipper Data Model**: Implemented `useProfile` hook that "zips" live Bungie data with local user metadata (Tags/Notes).
- **Optimistic Updates**: Added support for immediate UI feedback when updating item metadata, with background synchronization.
- **DIM-Standard UI**: Refactored `ArsenalPage.tsx` and `ItemCard.tsx` to meet DIM's density and precision standards (48x48px tiles, rarity borders, power/element overlays).

### Changed
- **Vite Proxy**: Configured local development proxy to forward `/api` requests to the Cloudflare Worker.

### Fixed
- **Dashboard Stability**: Resolved crash issues on Dashboard load by implementing robust error boundaries and loading states in hooks.

### Known Issues
- **Last Line Failure**: Encountered 3 errors on the last line which need addressing later.

## [0.4.0] - 2025-12-22

### Added
- **Cloudflare Worker Backend**: Initialized a new serverless backend in `api/` using Hono and Cloudflare Workers.
- **Bungie OAuth Proxy**: Implemented secure OAuth 2.0 flow with state validation and HTTP-only cookies (`/auth/login`, `/auth/callback`).
- **Manifest Infrastructure**: Created a dedicated Manifest Service (`src/manifest.ts`) with Cloudflare KV caching for version metadata.
- **Manifest Proxy Endpoint**: Added `/api/manifest/definitions/:table` to proxy and cache Bungie manifest requests.
- **User Metadata Database**: Configured Cloudflare D1 database (`guardian-db`) and applied initial migration for `UserMetadata` (Tags, Notes).
- **Environment Security**: Implemented secure secret management using `.dev.vars` (local) and Wrangler secrets (production).

### Infrastructure
- **Deployment**: Successfully deployed the API worker to `https://guardian-nexus-api.zeroij.workers.dev`.

## [0.3.0] - 2025-12-13

### Added
- **Horizontal Dashboard**: Implemented a scrollable, DIM-like dashboard in `Arsenal.jsx` with dedicated Character Columns and Vault.
- **Top Navigation Bar**: Added a sticky header with Inventory, Progress, Vendors links, and a unified Search bar.
- **Character Stats**: Added real-time character stats (Mobility, Resilience, Recovery, etc.) to the column headers (`CharacterColumn.jsx`) [21e5878].
- **Item Overlays**: Added Power Level, Element Icons, and Masterwork borders to `ItemCard.jsx` [cee3855].
- **Constants**: Created `src/utils/constants.js` to centralize Bungie API hashes (Buckets, Stats, Damage Types) [21e5878].

### Changed
- **Performance**: Implemented **Chunked Manifest Fetching** (Batch Size: 50) in `Arsenal.jsx` to resolve 502 Bad Gateway errors when loading large vaults (400+ items) [3892788].
- **Item Cards**: Completely redesigned `ItemCard.jsx` to match DIM's 48x48px square tiles with rarity-colored borders and compact overlays [cee3855].
- **Vault Visibility**: Fixed the "Empty Vault" bug by filtering for "Instanced Items" only and chunking requests.
- **Column Layout**: Refactored `CharacterColumn.jsx` to support strict slot grouping (Kinetic, Energy, Power) [1bd1cdc].

### Fixed
- **API Timeouts**: Resolved backend timeouts by batching manifest definition requests.
- **Missing Imports**: Fixed `ReferenceError` in `CharacterColumn.jsx` by restoring missing React/ItemCard imports [7e267d1].

## [0.2.1] - 2025-11-22

### Changed
- **Manifest Strategy**: Switched from downloading the SQLite database to fetching definitions directly from the Bungie API (`/Platform/Destiny2/Manifest/...`). This resolves timeout issues on Vercel Serverless.
- **Inventory UI**: Revamped `Arsenal.jsx` to include Armor sections (Helmet, Gauntlets, Chest, Legs, Class).
- **Grid Layout**: Updated `WeaponGrid.jsx` to use a responsive auto-fill grid for better adaptability.
- **Item Cards**: Increased card size, added a premium hover glow, and improved the tooltip design.

### Fixed
- **Vercel 500 Error**: Resolved the "Internal Server Error" caused by the manifest download timeout.
- **Dependencies**: Removed `sqlite3` from `api/package.json` as it is no longer needed.

## [0.2.0] - 2025-11-22

### Added
- **Premium Design Integration**: Integrated a new high-fidelity UI ("Arsenal" theme) with a dark, sci-fi aesthetic.
- **Starfield Background**: Added an animated canvas-based starfield background (`StarfieldBackground.jsx`).
- **Arsenal View**: Implemented the main inventory interface (`Arsenal.jsx`) featuring a sidebar and categorized weapon grids.
- **Real Data Wiring**: Connected the new UI to the Bungie API, fetching real user inventory, equipment, and item definitions.
- **Item Cards**: Enhanced `ItemCard.jsx` with rarity-based borders (using the new color palette), power levels, and tooltips.

### Changed
- **UI Overhaul**: Replaced the basic Dashboard with the new Arsenal layout.
- **Styling**: Overwrote `index.css` with a comprehensive Tailwind setup for the new theme (custom scrollbars, fonts, animations).
- **Routing**: Updated `App.jsx` to support the new Home and Dashboard views with smooth transitions.

### Fixed
- **Data Merging**: Solved an issue where item instance data (Power Level, Perks) was not correctly merging with item definitions.
- **CSS Lints**: Fixed minor CSS validation errors in `index.css`.

## [0.1.0] - 2025-11-21

### Added
- **Project Foundation**: Initialized React + Vite project with Tailwind CSS.
- **Manifest System**: Implemented automated downloading and parsing of the Destiny 2 Manifest (SQLite) in `api/services/manifestService.js`.
- **Authentication**: Implemented Bungie.net OAuth 2.0 flow in `api/routes/auth.js`.
- **Dashboard**: Created a basic Dashboard component to display User Characters and Light Level.
- **Vercel Support**: Configured `vercel.json` and refactored backend to `api/index.js` for Serverless deployment.

### Changed
- **Backend Architecture**: Migrated from a stateful Express server (MongoDB) to a stateless Vercel Serverless architecture using `cookie-session`.
- **Manifest Storage**: Updated manifest service to use `/tmp` directory for compatibility with Vercel's ephemeral file system.
- **API Routing**: Updated frontend to use relative paths (`/api/...`) for seamless integration with the serverless backend.

### Fixed
- **Vercel 404 Errors**: Fixed routing issues by adding explicit rewrites in `vercel.json` for `/auth/callback`.
- **Public Client Auth**: Modified `authService.js` to support Public Clients by making `client_secret` optional (ignoring placeholders).
- **Profile Fetch Error**: Fixed 500 error by correctly fetching `destinyMembershipId` and `membershipType` (Steam/Xbox/PSN) instead of using the generic Bungie account ID.

### Security
- **Environment Variables**: Removed unused `MONGODB_URI`. Ensured sensitive keys are loaded from process.env.
