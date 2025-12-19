# Guardian Nexus

The ultimate companion for your Destiny 2 journey. Manage your inventory, track your stats, and optimize your builds.

## ⚡ The Vibe Coding Manifesto
This project is built using 100% Vibe Coding.

I’m leveraging AI-powered development tools (like Cursor and Trae) to bridge the gap between my ideas as a Guardian and the code required to make them a reality. This approach allows me to build features for the Destiny 2 community at the speed of thought, focusing on utility and "vibe" over traditional manual boilerplate.

### 🛠️ A Community Effort
Since this is vibe-coded, the logic can occasionally be as chaotic as a Mayhem match. That’s where you come in:

**Flag the Glitches**: If you find a bug or something feels "off," please open an Issue immediately. Don't worry about being too technical—just tell me what's broken.

**Refine the Vibe**: If you see code that can be optimized, a UI that can be polished, or a feature that needs a better implementation, Pull Requests are highly encouraged.

### 🌌 Why I'm doing this
I am a Data Science student building this for the love of the game. Every contribution, bug report, or bit of feedback doesn't just help me—it helps the entire community. If you think you can make this tool better for our fellow Guardians, I would be incredibly happy to have your help.

Let's build something the Tower would be proud of. 🚀

## Features
- **Arsenal**: View your weapons and armor with a premium, high-fidelity UI.
- **Real-time Data**: Fetches your live inventory from Bungie.net.
- **Secure Auth**: OAuth 2.0 authentication with Bungie.net.

## Changelog

### [0.2.1] - 2025-11-22

#### Changed
- **Manifest Strategy**: Switched from downloading the SQLite database to fetching definitions directly from the Bungie API (`/Platform/Destiny2/Manifest/...`). This resolves timeout issues on Vercel Serverless.
- **Inventory UI**: Revamped `Arsenal.jsx` to include Armor sections (Helmet, Gauntlets, Chest, Legs, Class).
- **Grid Layout**: Updated `WeaponGrid.jsx` to use a responsive auto-fill grid for better adaptability.
- **Item Cards**: Increased card size, added a premium hover glow, and improved the tooltip design.

#### Fixed
- **Vercel 500 Error**: Resolved the "Internal Server Error" caused by the manifest download timeout.
- **Dependencies**: Removed `sqlite3` from `api/package.json` as it is no longer needed.

### [0.2.0] - 2025-11-22

#### Added
- **Premium Design Integration**: Integrated a new high-fidelity UI ("Arsenal" theme) with a dark, sci-fi aesthetic.
- **Starfield Background**: Added an animated canvas-based starfield background (`StarfieldBackground.jsx`).
- **Arsenal View**: Implemented the main inventory interface (`Arsenal.jsx`) featuring a sidebar and categorized weapon grids.
- **Real Data Wiring**: Connected the new UI to the Bungie API, fetching real user inventory, equipment, and item definitions.
- **Item Cards**: Enhanced `ItemCard.jsx` with rarity-based borders (using the new color palette), power levels, and tooltips.

#### Changed
- **UI Overhaul**: Replaced the basic Dashboard with the new Arsenal layout.
- **Styling**: Overwrote `index.css` with a comprehensive Tailwind setup for the new theme (custom scrollbars, fonts, animations).
- **Routing**: Updated `App.jsx` to support the new Home and Dashboard views with smooth transitions.

#### Fixed
- **Data Merging**: Solved an issue where item instance data (Power Level, Perks) was not correctly merging with item definitions.
- **CSS Lints**: Fixed minor CSS validation errors in `index.css`.

### [0.1.0] - 2025-11-21

#### Added
- **Project Foundation**: Initialized React + Vite project with Tailwind CSS.
- **Manifest System**: Implemented automated downloading and parsing of the Destiny 2 Manifest (SQLite) in `api/services/manifestService.js`.
- **Authentication**: Implemented Bungie.net OAuth 2.0 flow in `api/routes/auth.js`.
- **Dashboard**: Created a basic Dashboard component to display User Characters and Light Level.
- **Vercel Support**: Configured `vercel.json` and refactored backend to `api/index.js` for Serverless deployment.

#### Changed
- **Backend Architecture**: Migrated from a stateful Express server (MongoDB) to a stateless Vercel Serverless architecture using `cookie-session`.
- **Manifest Storage**: Updated manifest service to use `/tmp` directory for compatibility with Vercel's ephemeral file system.
- **API Routing**: Updated frontend to use relative paths (`/api/...`) for seamless integration with the serverless backend.

#### Fixed
- **Vercel 404 Errors**: Fixed routing issues by adding explicit rewrites in `vercel.json` for `/auth/callback`.
- **Public Client Auth**: Modified `authService.js` to support Public Clients by making `client_secret` optional (ignoring placeholders).
- **Profile Fetch Error**: Fixed 500 error by correctly fetching `destinyMembershipId` and `membershipType` (Steam/Xbox/PSN) instead of using the generic Bungie account ID.

#### Security
- **Environment Variables**: Removed unused `MONGODB_URI`. Ensured sensitive keys are loaded from process.env.
