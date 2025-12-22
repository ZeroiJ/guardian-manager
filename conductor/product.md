# Initial Concept
E (all of the above) but mostly E focus on the proprietary backend data "Zipper" model where we merge bungie data with our own. I want to build a better DIM that is faster and has more features.

## Vision
Guardian Manager is a high-performance, proprietary alternative to Destiny Item Manager (DIM), designed for power users who demand speed, reliability, and advanced features. It leverages a unique "Zipper" data model to merge live game state with rich, user-owned metadata.

## Target Audience
- **The Unified Guardian:** Players who want the features of DIM, light.gg, Braytech, and D2 Armor Picker in a single, cohesive desktop experience.
- **Power Users:** Hardcore players and build-crafters who need responsive tools and deep analytics without performance lag.

## Core Features
- **Proprietary "Zipper" Engine:** A custom Express/PostgreSQL backend that merges live Bungie API data with local user metadata (tags, notes, loadouts) in real-time.
- **Advanced Inventory Management:** Efficient item transfers, equipping, and vaulting logic that intelligently handles full inventory buckets.
- **Modern Loadout Optimizer:** A next-generation build crafter using Web Workers to perform complex permutations without freezing the UI.
- **Intelligent Manifest Caching:** Extracts and caches only the necessary Destiny 2 definitions to IndexedDB and Postgres, significantly reducing load times.
- **Desktop First:** Optimized specifically for a premium desktop experience, utilizing the available screen real estate and processing power.

## Architecture & Data Strategy
- **Dual-Stream Data Model:** Simultaneously fetches live state from Bungie and proprietary metadata from the Guardian Manager API.
- **Optimistic UI:** Instant feedback for user actions (tagging, noting) with background synchronization and robust rollback mechanisms.
- **Secure Proxy Auth:** The backend securely manages Bungie OAuth tokens and secrets, ensuring client-side security.
- **Server-Side Metadata Persistence:** User customizations are stored in a dedicated PostgreSQL database, providing a permanent and fast record independent of Bungie's platform.

## Design Principles
- **Performance First:** Maintaining a consistent 60fps is non-negotiable, especially during heavy data processing or build optimization.
- **Efficiency over Hand-Holding:** Designed for experienced Guardians who value speed and density over simplified onboarding.
