# Changelog


All notable changes to the "Guardian Nexus" project will be documented in this file.

## [0.23.0] - 2026-02-19

### 🚀 Progress Page: DIM Feature Parity

Achieved near-complete feature parity with DIM's Progress page by implementing major missing sections and fixing underlying data pipelines.

#### New Features

- **Seasonal Rank**:
  - Displays current Season Pass level, progress to next level (XP bar), and prestige rank.
  - Shows the **Well-Rested** buff indicator ("2x XP") when active.
  - Dynamic season background art.
- **Tracked Triumphs**:
  - Shows the player's in-game tracked triumph with detailed objective progress bars.
- **Seasonal Challenges**:
  - Full support for the Seasonal Challenge tree structure (Weeks -> Challenges).
  - Automatically filters hidden/invalid challenges and visualizes completion status.
- **Event Cards**:
  - Added support for active seasonal events (Solstice, Dawning, Guardian Games).
  - Renders the event card banner and description when an event is live.

#### Architecture & Backend

- **Expanded Profile Data**:
  - Updated the Cloudflare Backend (`functions/api/[[route]].ts`) to request additional Bungie API components:
    - `700` (CharacterRecords)
    - `900` (ProfileRecords)
    - `1100` (PresentationNodes)
  - This enables full tracking of triumphs, challenges, and seals.

### 🐛 Fixes

- **Manifest Pipeline Repair**:
  - **Cache Buster v3**: Forced a global manifest refresh to fix "Found 0 definitions" errors caused by stale IndexedDB data.
  - **Debug Logging**: Added granular logging to `ManifestManager` to identify specific missing definition hashes in production.

## [0.22.0] - 2026-02-17

### 🚀 Progress Dashboard & Sidebar Navigation

Introduced a comprehensive **Progress Dashboard** (`/progress`) that mirrors DIM's functionality, unifying all character objectives into a single, organized view.

#### New Features

- **Character Sidebar**: Implemented a persistent left-hand sidebar for seamless character switching. It displays the character's emblem, light level, and class, replacing top-level tabs for better vertical rhythm.
- **Unified Pursuit System**:
  - **Universal Cards**: Created `PursuitCard.tsx`, a "smart" component that renders Bounties, Quests, Milestones, and Raid Challenges with consistent visual language (progress bars, expiration badges, tracked status).
  - **Rich Tooltips**: Hovering over any pursuit reveals detailed objective data (e.g., "Precision Kills: 15/25").
- **Section Breakdown**:
  - **Milestones**: Automatically fetches and filters Weekly Powerful/Pinnacle challenges.
  - **Bounties & Quests**: Features complex sorting logic (Completed > Tracked > Expiring > Rarity).
  - **Raids**: Identifies the Weekly Featured Raid and displays its specific challenges.
  - **Pathfinder**: Initial implementation for tracking the Pale Heart Pathfinder node.

#### Architecture

- **Data Modeling**: Defined a unified `ProgressItem` interface in `services/profile/types.ts` to normalize disparate Bungie API data sources (Progression vs. Objectives vs. Records).
- **Component Reusability**: Extracted `PursuitGrid` for consistent grid layouts across all sections.

## [0.21.0] - 2026-02-15

### 🚀 DIM-Parity: Compare UI & Watermarks

Achieved near 1:1 visual parity with DIM's Comparison feature and Item Tiles.

#### Compare UI Redesign

- **Stat Numbers Only**: Removed progress bars in favor of clean, color-coded numbers (`#51b853` green for best, `#d14334` red for worst).
- **Archetype Row**: Added a dedicated row showing the item's frame archetype (icon + name).
- **Compact Layout**: Significantly reduced padding and adopted DIM's information-dense table structure.
- **Perk Alignment**: Perks and mods are now left-aligned and consistent with DIM's column layout.

#### Season/Expansion Watermarks

- **Full-Tile Overlay**: Replaced tiny corner badges with full-tile seasonal watermarks at 80% opacity.
- **DIM Logic**: Implemented DIM's exact watermark priority system:
  1. `quality.displayVersionWatermarkIcons` (Uses `currentVersion` index) - Critical for re-issued items like *Afterlight*.
  2. `iconWatermark` - Standard fallback.
  3. `iconWatermarkShelved` - For sunset/legacy items.

### 🐛 Fixes

- **Compare Stats**: Fixed a bug where comparing identical items showed definition-level stats instead of per-instance stats.
- **Missing Perks**: Fixed an issue where perks/mods wouldn't render in comparison because their definitions weren't being fetched from the manifest.

## [0.20.0] - 2026-02-15

### 🚀 Features

- **Item Comparison:** Added side-by-side comparison modal (`CompareModal.tsx`).
- **Stat Math:** Added pure TypeScript stat calculation engine (`statMath.ts`) with "Tier Break" logic.
- **Search Engine:** Implemented `is:dupe` filter using cached Set lookups for O(1) performance.

### 🛠 Tech Debt & Architecture

- **Rust Removal:** Completely removed `guardian-engine` (Rust/WASM) in favor of lightweight TypeScript.
- **Build System:** Switched strict usage to `vite build` (removed `tsc` bottleneck).
- **Config:** Fixed `tsconfig.json` to exclude `node_modules` (Zombie Build fix).
- **Styling:** Standardized on Tailwind v3 "Void" theme.

### 🐛 Fixes

- Fixed "1-hour hang" during build process.
- Fixed conflict between Tailwind v3 and PostCSS v4.

## [0.19.0] - 2026-02-13

### 🔍 Search & Discovery Overhaul

A massive upgrade to how you find items in your inventory, moving from basic filtering to a power-user "Spotlight" experience.

#### Advanced Search Syntax

- **Duplicate Detection (`is:dupe`)**: Instantly find duplicate items. Implemented with an optimized O(1) lookup map calculated during hydration to ensure zero lag even with 600+ items.
- **Perk Search (`perk:<name>`)**: Search for specific perks by name (e.g., `perk:firefly`, `perk:outlaw`). Matches against the full socket plug definition.
- **Stat Filtering (`stat:<name>:<op><value>`)**: Filter items by specific stats.
  - Supports standard stats (`mobility`, `resilience`, `recovery`, `discipline`, `intellect`, `strength`) and their abbreviations (`mob`, `res`, `rec`, `dis`, `int`, `str`).
  - Supports comparison operators: `>`, `<`, `>=`, `<=`, `=`.
  - Example: `stat:res:>=100` finds items with 100+ Resilience.

#### Spotlight UI

- **Dropdown Results**: Search results now appear in a floating "Spotlight" dropdown below the search bar instead of hiding your entire inventory.
- **Top 10 Matches**: Shows the most relevant results instantly.
- **Non-Destructive**: Your main inventory grid stays visible while you search, maintaining context.
- **Quick Actions**: Clicking a result instantly opens the Item Detail Modal.

### ✨ UI Polish

- **Delayed Tooltips**: Added a "Long Hover" tooltip to inventory items. Hovering for 6 seconds reveals the Item Name and Type in a small popover, useful for identifying items without clicking.

## [0.18.0] - 2026-02-11

### 🖱️ Click-to-Move & API Hardening

Replaced the experimental Drag-and-Drop system with a robust, DIM-style "Click-to-Move" interface. This update focuses on speed, stability, and cross-platform compatibility.

#### Interaction Overhaul: Click-to-Move

- **Item Detail Transfers**: added "Transfer" buttons directly to the Item Detail Modal.
  - **One-Click Vaulting**: "Store in Vault" button (disabled for equipped items).
  - **Character-to-Character**: Direct "Transfer to [Class]" buttons that handle the Vault hop automatically.
- **Instant UX**: Implemented "Fire-and-Forget" logic. The modal closes *instantly* upon clicking a transfer button, and the item moves visually in the background (Optimistic UI) while the API processes safely.
- **Safety Locks**: Buttons are immediately disabled upon click to prevent race conditions (Error 1623) caused by double-submitting transfers.

#### API Fixes

- **Dynamic Platform Detection**: Fixed `DestinyCharacterNotFound` (Error 1620) by extracting the correct `membershipType` (Steam, Xbox, PSN) from the user's profile instead of hardcoding it to Steam.
- **Strict ID Validation**: Added guards to `APIClient` to crash early if "vault" is accidentally passed as a Character ID, preventing malformed requests.

### Changed

- **Reverted DnD**: Removed `react-dnd` and `react-dnd-html5-backend` dependencies to reduce bundle size and complexity until a more stable implementation is ready.

## [0.17.1] - 2026-02-07

### 🏗️ Vault Refactor: Vertical Stacking

Changed the Vault rendering logic to match DIM's "Stacked" layout.

- **Type Grouping**: Instead of one continuous "snake" of items, the Vault now renders distinct blocks for each weapon type (e.g., Auto Rifles, then Hand Cannons, etc.).
- **Vertical Growth**: This forces the Vault column to grow vertically with clear visual separation between types, rather than filling horizontal space indefinitely.
- **Sorting**: Items within each block are sorted by Power Level (Descending).

## [0.17.0] - 2026-02-06

### 🎹 Vertical Rhythm Refactor

Refactored the dashboard to enforce strict "Slot-Based" Vertical Rhythm. Instead of grouping all Weapons into one big block, we now render explicit rows for each inventory bucket.

#### Why?

To solve the "Jagged Alignment" issue where a massive Vault Weapon collection would push the Armor section down, misaligning it with characters who have fewer weapons. Now, **Row 1 (Kinetic)** stretches to the height of the tallest Kinetic section (usually Vault), and **Row 2 (Energy)** starts cleanly below it for everyone.

#### Structural Changes

- **8 Explicit Rows**: Kinetic, Energy, Power, Helmet, Gauntlets, Chest, Legs, Class Item.
- **StoreBucket**: Specialized component to render a single inventory slot (Equipped + 3x3 Grid).
- **InventoryBucketLabel**: Sticky header for each specific row.
- **VirtualVaultGrid**: Updated to support filtering by `bucketHash` to render "Mini Walls" for each slot.

### Files Modified

- `src/App.tsx` - Replaced "Floor System" with "Slot Loop".
- `src/components/inventory/StoreBucket.tsx` - New component.
- `src/components/inventory/InventoryBucketLabel.tsx` - New component.
- `src/components/inventory/VirtualVaultGrid.tsx` - Added `bucketHash` prop.

## [0.16.0] - 2026-02-06

### 🧱 Layout Overhaul: The Floor System

Rewrote the main dashboard to use a "Floor-based" layout (Rows) instead of independent columns. This ensures perfect alignment of inventory sections across all characters and the vault.

#### Synchronized Shelves

- **Header Floor**: Emblems and Stats are now aligned in a top row.
- **Weapons Floor**: The "Great Wall of Guns". All character weapons and the Vault's weapon grid are horizontally adjacent.
  - **Vault Grid Merge**: The Vault now renders a single continuous list for **Weapons** (Kinetic + Energy + Power merged), sorted by slot and type. No more sub-headers breaking the flow.
- **Armor Floor**: Starts at the exact same Y-pixel for everyone, solving the misalignment caused by expanding vault lists.

#### Components Refactor

- **StoreHeader**: Extracted emblem/stats logic into a standalone component.
- **InventoryFloor**: New wrapper component that enforces `align-stretch` on its children.
- **CharacterBucket**: Specialized component for rendering strict category groups (Weapons/Armor) for characters.

### Files Modified

- `src/App.tsx` - Complete layout rewrite.
- `src/components/inventory/StoreHeader.tsx` - New component.
- `src/components/inventory/InventoryFloor.tsx` - New component.
- `src/components/inventory/CharacterBucket.tsx` - New component.
- `src/components/inventory/VirtualVaultGrid.tsx` - Added `category` prop for merged rendering.

## [0.15.0] - 2026-02-06

### 🚀 DIM-Style Vault & Project Polish

Achieved visual parity with DIM's Vault Grid and performed a major cleanup of the project structure and authentication logic.

#### Visual Overhaul

- **Phantom Separators**: Replaced text headers in the Vault with "Inline Icon Separators". These use official SVG icons (Auto Rifle, Hand Cannon, etc.) rendered with a "Phantom" style (`bg-white/5`, no border, transparent icon) to blend seamlessly into the grid.
- **Flat List Rendering**: Refactored `VirtualVaultGrid` to flatten items and separators into a single continuous list. Items now wrap naturally around the separator icons, creating a dense, space-efficient grid (gap-1).
- **Vector Icons**: Configured the project to load **local SVG icons** (imported from `destiny-icons`) instead of relying on Bungie's raster PNGs. This ensures crisp rendering at any scale.

#### Architectural Cleanup

- **Slim Cookies**: Fixed the persistent `401 Unauthorized` loop by "slimming down" the auth cookie keys (t, r, m) to avoid browser size limits.
- **Dynamic Secure Flag**: Implemented auto-detection for `secure` cookies to support both `localhost` (http) and Production (https) without manual config changes.
- **Project Reorg**: Moved `src/conductor` documentation to `docs/conductor`. Grouped root components into clear subdirectories (`src/components/ui`, `src/components/inventory`).

### Files Modified

- `src/components/inventory/VirtualVaultGrid.tsx` - Flat List logic & Separator styling.
- `src/lib/destiny/sort-engine.ts` - Updated to use local SVG imports.
- `functions/api/[[route]].ts` - Updated auth logic for Slim Cookies.
- `src/assets/icons/weapons/*.svg` - Added 17 weapon type icons.

### [0.14.0] - 2026-02-04

### 🌟 Footer Implementation (Item Popup)

Added a comprehensive footer to the Item Detail Popup, bringing it closer to DIM parity.

#### New Features

- **Exotic Box**: Dedicated section for Exotics showing:
  - **Ornaments**: Displays active ornament icon.
  - **Catalysts**: Displays active catalyst icon OR a "Golden Box" placeholder for unobtained catalysts.
- **Mod Bar**: Displays weapon mods and shaders as small circular icons.

#### Logic Enhancements

- **Catalyst Detection**: Updated `socket-helper.ts` to identify catalyst sockets including `WeaponModsIntrinsic` (2237038328) for robust handling.
- **Missing Catalyst State**: Implemented specific logic to render the "Golden Box" when a catalyst socket exists (or needs to be shown) but is empty/inactive.

### Files Modified

- `src/components/inventory/ItemDetailModal.tsx` - Added Footer JSX section.
- `src/lib/destiny/socket-helper.ts` - Extended categorization logic.
- `src/lib/destiny-constants.ts` - Added `WeaponModsIntrinsic` hash.

## [0.13.0] - 2026-02-04

### 🎯 Floating UI Popup Positioning

Converted the Item Popup from a centered modal to a **floating popover** that anchors to clicked items with collision-aware positioning.

#### New Dependencies

- **`@floating-ui/react`**: Industry-standard library for popup positioning.

#### Positioning Behavior

- **Default Placement**: `right-start` - popup appears to the right of the clicked item.
- **Collision Detection**: Uses `flip()` middleware to automatically switch to `left-start`, `bottom`, or `top` when hitting screen edges.
- **Boundary Padding**: `shift({ padding: 8 })` keeps popup 8px from viewport edges.
- **Dynamic Updates**: `autoUpdate` repositions popup when window scrolls/resizes.

#### Architecture Changes

- **Click Event Propagation**: Updated `onClick` signatures across 5 files to pass `MouseEvent` and capture `event.currentTarget` as reference element.
- **FloatingPortal**: Popup renders at document root, escaping `overflow: hidden` constraints.
- **Backdrop**: Semi-transparent `bg-black/30` overlay closes popup on click.

### Files Modified

- `App.tsx` - State now includes `referenceElement: HTMLElement | null`
- `InventoryItem.tsx` - onClick now passes MouseEvent
- `DestinyItemTile.tsx` - onClick now passes MouseEvent
- `CharacterColumn.tsx` - Propagates event through all onClick handlers
- `VirtualVaultGrid.tsx` - Propagates event through all onClick handlers
- `ItemDetailModal.tsx` - Uses `useFloating` with offset/flip/shift middleware
- `package.json` - Added `@floating-ui/react` dependency

## [0.12.0] - 2026-02-04

### 🎨 DIM-Exact Item Popup Replication

Completely rebuilt the Item Detail Modal to achieve a **1:1 visual match** with Destiny Item Manager (DIM).

#### Hybrid Styling Architecture

- **Installed `sass`**: Added Dart Sass to enable SCSS compilation in Vite.
- **Ported DIM SCSS Files**: Copied and adapted core DIM stylesheets:
  - `src/styles/dim/_variables.scss` - All DIM color tokens, mixins, and utility functions.
  - `src/styles/dim/dim-ui/common.module.scss` - Shared layout utilities (flexbox, reset button styles).
  - `src/components/inventory/styles/ItemPopup.module.scss` - Main popup container, rarity backgrounds, desktop layout.
  - `src/components/inventory/styles/ItemPopupHeader.module.scss` - Header typography, rarity colors, element icon styling.
- **CSS Modules Integration**: Enabled importing `.module.scss` files directly in React components via TypeScript declarations (`src/declarations.d.ts`).

#### Visual Fidelity

- **Rarity-Based Theming**: Header and body backgrounds now match DIM's exact hex codes:
  - Exotic: Header `#ceae33`, Body `#161204`
  - Legendary: Header `#513065`, Body `#0e0811`
  - Rare: Header `#5076a3`, Body `#0a0f15`
  - Uncommon: Header `#366e42`, Body `#081109`
  - Common: Header `#dcdcdc`, Body `#121212`
- **320px Desktop Body Width**: Matches DIM's standard popup width.
- **Right-Side Action Sidebar**: Lock, Tag, Compare, and Close buttons in a vertical strip.

#### ItemDetailModal.tsx Refactor

- **Layout Structure**: `styles.desktopPopup` (flex-row) with `styles.desktopPopupBody` (left) and `styles.desktopActions` (right).
- **Header Component**: Uses `headerStyles.header`, `headerStyles.title`, `headerStyles.subtitle` for DIM-accurate typography.
- **Rarity Class Binding**: Dynamic `styles[rarity]` and `headerStyles[rarity]` classes applied based on `tierType`.
- **JIT Definition Fetching**: Preserved the Just-In-Time plug definition fetching for perks/mods.

### 🔧 Technical Improvements

#### Build System

- **TypeScript Declarations**: Created `src/declarations.d.ts` to allow importing `*.module.scss` and `*.m.scss` files without type errors.
- **SCSS Parsing Fix**: Renamed `common.m.scss` to `common.module.scss` and removed `@layer` wrapper to fix PostCSS parsing errors.
- **Build Verification**: Confirmed `npm run build` passes with zero errors. Sass deprecation warnings are tool-level and safe to ignore.

#### Code Cleanup

- **Removed Unused Imports**: Cleaned up `BungieImage` and other unused imports from `ItemDetailModal.tsx`.
- **Removed Unused Props**: Removed `characters` and `allItems` props from `ItemDetailModal` signature and `App.tsx` usage.
- **Fixed Corrupted File**: Recovered `ItemDetailModal.tsx` from a malformed edit using `write_to_file` with full file overwrite.

### Files Added

- `src/styles/dim/_variables.scss`
- `src/styles/dim/dim-ui/common.module.scss`
- `src/components/inventory/styles/ItemPopup.module.scss`
- `src/components/inventory/styles/ItemPopupHeader.module.scss`
- `src/declarations.d.ts`

### Files Modified

- `src/components/inventory/ItemDetailModal.tsx` - Complete rewrite to use CSS Modules
- `src/App.tsx` - Removed unused props from `ItemDetailModal` component call
- `package.json` - Added `sass` dev dependency

## [0.11.0] - 2026-02-01

### Added

- **Auto-Refresh "Heartbeat" System**: Implemented smart polling that automatically fetches the latest inventory data from Bungie every 30 seconds.
  - **Visibility Check**: Skips fetches when the browser tab is hidden to save API quota.
  - **In-Flight Guard**: Prevents duplicate requests when one is already in progress.
  - **Refresh Button**: Added a spinning refresh icon to the top navigation bar with a "Last updated: X ago" tooltip.
  - **Optimistic Updates**: Old data stays visible during refresh to prevent UI flashing.

### Files Added

- `src/hooks/useAutoRefresh.ts` - Smart polling hook with configurable interval
- `src/components/ui/RefreshButton.tsx` - Animated refresh button with relative time tooltip

## [0.10.0] - 2026-01-31

### Feature Parity (DIM Match)

- **Max Power Calculation**: Implemented a sophisticated power calculation engine (`powerUtils.ts`) that determines the user's "Base Power". It strictly respects Destiny 2's "One Exotic Weapon + One Exotic Armor" equip rule to show the true potential level. This appears in **Gold** next to the current light level.
- **Postmaster Integration**: Added a dedicated "Postmaster" row in the Character Column to display lost items (Bucket Hash `215593132`) directly within the inventory view.
- **Granular Vault Categorization**: The Vault now groups items by their specific sub-category (e.g., "Auto Rifle", "Helmet", "Fusion Rifle") instead of broad generic buckets. These sub-groups are sorted alphabetically for easier browsing.

### UI Polish (The "Bungie Standard")

- **Pixel-Perfect Alignment**:
  - Rebuilt the **Vault Header** to exactly match the Character Column headers (48px top bar + 103px stats block), ensuring the first row of items aligns perfectly across the screen.
  - Implemented **"Ghost Slots"** in character inventory rows to maintain a rigid grid structure even when slots are empty.
- **Armor 3.0 Stats**:
  - Updated stat labels to use functional names: **Health** (Resilience), **Melee** (Strength), **Grenade** (Discipline), **Super** (Intellect), **Class** (Recovery), **Weapons** (Mobility).
  - Visualization changed to prioritize the **Raw Value** (large, bold text) over progress bars, with gold highlighting for T10 (100+) stats.
- **Unified Scrolling**: The entire dashboard (Characters + Vault) now scrolls together in a single viewport, replacing independent column scrolling for a more cohesive desktop experience.

### Fixed

- **Image Rendering**: Solved broken image links by implementing a robust `BungieImage` component that correctly handles relative Bungie paths and provides fallbacks.
- **Type Safety**: Improved type definitions for Profile and Item interfaces.

## [0.9.0] - 2026-01-31

### Architecture Revert

- **Back to Vite**: Reverted the entire project from a Next.js Server-Side experimentation back to a stable **Vite + React (SPA)** architecture.
- **Client-Side Rendering**: Restored standard Client-Side Rendering (CSR) for better performance and compatibility with Bungie's heavy manifest data.
- **Cloudflare Pages**: Deployment target switched from Vercel Hybrid to **Cloudflare Pages** (Static Assets + Functions).

### The "Git Crisis"

- **History Restoration**: Recovered from an accidental force-push that wiped 200+ commits. Successfully grafted the new Vite architecture onto the original `0.8.0` history, preserving all prior work.
- **Cleanup**: Deleted the massive `reference/` (DIM source) folder and uninstalled all Next.js dependencies (`next`, `@cloudflare/next-on-pages`) to ensure a clean slate.

### Fixed

- **Deployment**: Resolved Cloudflare Pages "Root Directory" build failures by flattening the repository structure.
- **API Restoration**: Manually restored the `functions/` API directory (which was accidentally deleted during cleanup) and adapted it from Next.js API Routes to **Hono + Cloudflare Pages Functions**.
- **OAuth Hell**: Resolved persistent `401 Unauthorized` / `invalid_client` errors during Bungie Token Exchange:
  - **Configuration**: Added `BUNGIE_AUTH_URL` to environment variables (`wrangler.toml` and `.dev.vars`).
  - **Whitespace**: Implemented `.trim()` on all environment variables to prevent invisible copy-paste errors.
  - **Auth Method**: Switched from `Authorization: Basic` header to sending `client_id` and `client_secret` in the **POST Body** for better stability.
  - **Debugging**: Added robust logging (without exposing full secrets) to verify credential propagation in production.

### Infrastructure

- **Local Dev**: Created `.dev.vars` for secure local development of Cloudflare Functions.
- **Wrangler**: Updated `wrangler.toml` to publicly expose non-sensitive vars (`BUNGIE_CLIENT_ID`) while keeping secrets secure in the dashboard.

## [0.8.0] - 2026-01-10

### Critical Failures

- **Item Icons**: Item icons are NOT showing up in the TypeScript + React environment. Despite implementing backend proxies, cache clearing, and CSS fixes, the images fail to render.

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
