# Changelog

All notable changes to the "Guardian Nexus" project will be documented in this file.

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
