# DIM (Destiny Item Manager) Design Replication Plan

## 1. Design Analysis (Based on Screenshots)

### A. Layout Structure (Horizontal Dashboard)
- **Top Bar**: Search bar (centered), Navigation Links (Inventory, Progress, Vendors, etc.), Refresh button, Settings.
- **Main Content**: A Horizontal Flex/Grid layout.
    - **Columns 1-3**: Active Characters (Warlock, Hunter, Titan).
    - **Column 4**: The Vault (Expandable/Wide).
- **Responsive**: On smaller screens, columns likely stack or become swipeable, but desktop is "All-at-once".

### B. Character Column Breakdown
Each character column is identical in structure:
1.  **Header Card**:
    -   **Background**: Character Emblem (Banner).
    -   **Text**: Class Name (e.g., "Warlock"), Race ("Awoken"), Light Level (Big yellow number, e.g., "300 6/8").
    -   **Currency/Stats**: A row of stats (Mobility, Resilience, etc.) with icons and tiers (Tier 1-10).
    -   **Level**: Current Season Pass level or XP bar.
2.  **Inventory Sections**:
    -   **Weapons**: Kinetic, Energy, Power (Vertical stack).
    -   **Armor**: Helmet, Gauntlets, Chest, Legs, Class Item (Vertical stack).
    -   **General/Cosmetics**: Ghost, Sparrow, Ship, Emote, Finisher.

### C. The "Vault" Column
-   Located on the right.
-   Shows distinct definition: "Vault [Count]/[Total]".
-   Grid is dense and responsive (auto-fill).
-   Separated by categories (Weapons, Armor, General) or just one big pool sorted by user preference.

### D. Item Component (The "Tile")
-   **Size**: Square, dense (approx 48px - 52px).
-   **Visuals**:
    -   Full image icon.
    -   **Border**: Colored by Rarity (Exotic=Yellow, Legendary=Purple, Rare=Blue).
    -   **Overlay (Top Left)**: Season Icon / Watermark.
    -   **Overlay (Bottom)**: Power Level (e.g., "300").
    -   **Overlay (Element)**: Solar/Void/Arc icon involved.
    -   **Masterwork**: Gold border if masterworked.
    -   **Deepsight**: Red border/pattern if craftable?
-   **Interactions**:
    -   **Hover**: Detailed Tooltip (See Image 3) showing stats bar comparison, perks, and description.
    -   **Drag & Drop**: (Core feature of DIM, verify if immediate requirement).

### E. Color Palette (Dark Theme)
-   **Background**: Deep Navy/Black (`#11111b` or variable).
-   **Card Backgrounds**: Slightly lighter, semi-transparent.
-   **Text**: White/Grey. High contrast numbers.

---

## 3. Implementation Plan (Updated)

### Phase 0: Critical Fixes & Cleanup [x] DONE
1.  **Vault Visibility Debug**: Investigate why Vault items (`Component 102`) are fetched but not rendering in the current UI. (Fix this before major styling changes). [x]
    -   *Fixed via Client-Side Chunking implementation to bypass API rate limits.*
2.  **Landing Page Reset**: Replace the "Conversational" intro with a simple, clean "Welcome Guardian" + "Connect to Bungie" button. [ ] (Deferred)

### Phase 1: Structural Pivot (The "Grid") [x] DONE
-   Switch main `App.jsx` layout from "Landing Page" to "Full Dashboard". [x]
-   Create a `CharacterColumn` component that accepts a `characterId`. [x]
-   Implement the Horizontal Scroll Container. [x]

### Phase 2: Complete Data Mapping (Hardcore Stats) [x] DONE
-   **Detailed Stats**: Fetch and display exact values (Tier + Raw Value) for Mobility, Resilience, Recovery, Discipline, Intellect, Strength. [x]
-   **Emblems**: Ensure we get the `emblemBackgroundPath` for the header. [x]
-   **Currency**: Glimmer, Legendary Shards (Component `100` - ProfileCurrencies). [ ] (Nice to have)

### Phase 3: The "DIM Tile" Component [x] DONE
-   [x] Rebuild `ItemCard.jsx` completely.
-   [x] Remove "Tavus" styling (no window borders, no pink shadows).
-   [x] Implement the "Border-only" rarity style.
-   [x] Add distinct overlays for Power, Element, and Season.

### Phase 4: Drag & Drop Implementation
-   Install `@dnd-kit/core` (or similar library).
-   make `ItemCard` draggable.
-   Make `CharacterColumn` and `Vault` droppable zones.
-   Implement the API logic to moving items (TransferItem endpoint).

### Phase 5: The Header & Navigation
-   Re-implement the top search bar (Logic exists, just UI move).
-   Add Character Class Icons to the header if needed.
