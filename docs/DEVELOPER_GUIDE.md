# Guardian Nexus - Developer Guide

Welcome to the **Guardian Nexus** codebase! This guide is designed to help new developers understand the project structure, key components, and data flow.

## 🏗 Project Structure

The project follows a standard Vite + React (TypeScript) structure, but with a focus on distinct logical layers:

```bash
src/
├── components/         # React Components (UI)
│   ├── inventory/      # Core Inventory Logic (CharacterColumn, Vault, Tiles)
│   └── ui/             # Generic UI Elements (Buttons, Modals)
├── data/               # Static Data & Constants (Hashes, Manifest definitions)
├── hooks/              # Custom React Hooks (Data Fetching, State)
├── lib/                # Pure Logic / Utilities (No React dependencies)
│   ├── destiny/        # Destiny-specific logic (Power calc, filtering)
│   └── search/         # Search filtering engine
├── services/           # External API Layers (Bungie API, Manifest DB)
└── App.tsx             # Main entry point and Layout Orchestrator
```

## 🧩 Key Components

### 1. `App.tsx` (The Orchestrator)

- **Role:** The main dashboard view.
- **Responsibilities:**
  - Fetches the user profile (`useProfile`) and definitions (`useDefinitions`).
  - Filters items based on the search query.
  - Distributes data to `CharacterColumn` and `VirtualVaultGrid`.
  - Calculates specific character data (Max Power, Postmaster items).

### 2. `CharacterColumn.tsx`

- **Role:** Renders a single character's inventory.
- **Key Features:**
  - **BucketRow:** Handles the logic for a specific slot (e.g., Kinetic). Shows Equipped + 9 Inventory slots.
  - **Ghost Slots:** Fills empty inventory spaces with placeholders to maintain grid alignment.
  - **Stats Engine:** Renders Armor 3.0 stats (Health, Melee, etc.).

### 3. `VirtualVaultGrid.tsx`

- **Role:** Renders the massive Vault inventory.
- **Key Features:**
  - **Sub-Categorization:** Groups items by Type (Auto Rifle, Helmet) > Alphabetical.
  - **Performance:** Optimized for rendering hundreds of items.

### 4. `InventoryItem.tsx`

- **Role:** The fundamental "Tile" for an item.
- **Features:** Renders the icon, power overlay, masterwork border, and element icon.

## 🔄 Data Flow

1. **Bungie API**: We fetch the `DestinyProfile` (Components 102, 200, 201, 205, 300) to get all raw item data.
2. **Manifest Definitions**: We fetch static definitions (names, icons, hashes) from a local IndexedDB cache or the Bungie API.
3. **App Level**: `App.tsx` merges these two sources. Every item rendered is a combination of its **Instance Data** (stats, perks) and its **Definition Data** (name, icon).

## 🛠 Core Utilities

- **`lib/destiny/powerUtils.ts`**: Contains the `calculateMaxPower` algorithm. It solves the "Best Loadout" problem while respecting the 1-Exotic limit.
- **`components/BungieImage.tsx`**: A critical wrapper for `<img>` tags. It handles the domain prepending (`https://www.bungie.net...`) and error fallbacks. Never use a raw `<img>` tag for game assets.
- **`data/constants.ts`**: The source of truth for **Bucket Hashes**, **Stat Hashes**, and **Damage Types**. If you need to map a Hash to a readable name, check here first.

## 🚀 Getting Started

1. **Install**: `npm install`
2. **Run**: `npm run dev`
3. **Environment**: You need a `BUNGIE_API_KEY` in your `.env` (or `.dev.vars` for Cloudflare functions) to fetch real data.

## ⚠️ "The Bungie Standard"

Start new UI components with **pixel-perfect alignment** in mind. We aim to match the density and alignment of DIM/Bungie.net.

- **Character Headers**: Fixed at 48px height.
- **Item Tiles**: 48x48px (standard).
- **Grid Spacing**: 2px gaps.
