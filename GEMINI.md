# Guardian Manager Workspace Context

This `GEMINI.md` provides essential context for the "Guardian Manager" workspace, which contains two Destiny 2 companion application projects.

## 📂 Project Structure

### 1. `guardian-nexus` (Active Development)
**Path:** `./guardian-nexus`
**Status:** 🚀 Active / Phase 2 (Core Features)
**Type:** Modern Web App (Vibe Coding / AI-First)

*   **Goal:** Build a "Proprietary Alternative to DIM" using modern tech and AI-assisted development ("Vibe Coding").
*   **Tech Stack:**
    *   **Frontend:** React 18, Vite, Tailwind CSS (Destiny-Dark palette).
    *   **Backend:** Vercel Serverless Functions (`api/index.js`), Cookie-Session for state.
    *   **Auth:** Bungie OAuth 2.0 (Public Client + Serverless Proxy).
    *   **Hosting:** Cloudflare Pages (Frontend) / Vercel (Backend API).
*   **Key Files:**
    *   `DEVELOPMENT_ROADMAP.md`: The master plan. Currently in **Phase 2: Core Features** (Manifest, Inventory, Loadouts).
    *   `PLANS/implementation_plan_dim_migration.md`: Specific plan for migrating features from DIM.
    *   `src/api`: Serverless backend logic.

### 2. `dim-source` (Reference / Legacy)
**Path:** `./dim-source`
**Status:** 📚 Reference Only
**Type:** Established Open Source Project (Destiny Item Manager)

*   **Goal:** Serves as the **functional blueprint** and **logic reference**.
*   **Role:** We do *not* develop active features here. We read this code to understand Bungie API interactions (item moving, stat calculation, loadout logic) and reimplement them in `guardian-nexus` using modern patterns.
*   **Tech Stack:** React, Redux, TypeScript, SCSS Modules.

---

## 🛠️ Development & Architectural Rules

**Source:** `.agent/rules/guardian-manager-architect.md`

### The "Reference & Replication" Protocol
1.  **Consult First:** Before implementing complex logic (e.g., Loadout Optimizer, Item Transfer), check how `dim-source` handles it.
2.  **Modernize:** Do not copy-paste. Replace outdated patterns (Class Components, Redux-Saga) with modern React (Hooks, Context, React Query) and TypeScript.
3.  **"Zipper" Data Model:**
    *   **Stream 1 (Bungie):** Live inventory data.
    *   **Stream 2 (Local/DB):** User metadata (Tags, Notes).
    *   **Merge:** "Zip" these streams in the selector layer.

### Core Logic Mandates
*   **Inventory Relay:** Move items via Vault (`Source -> Vault -> Destination`). Handle full buckets by moving "junk" to Vault first.
*   **Manifest:** Do *not* load the full JSON. Extract only needed definitions (`DestinyInventoryItemDefinition`) to IndexedDB/Postgres.
*   **Strict Types:** Zero `any` policy. Use official Bungie types or derived interfaces.
*   **UI/UX:** Tailwind CSS with "Destiny-Dark" palette (`bg-slate-950`).

---

## 🚀 Operational Commands

### Guardian Nexus (`./guardian-nexus`)

| Action | Command | Description |
| :--- | :--- | :--- |
| **Install** | `npm install` | Install dependencies. |
| **Dev Server** | `npm run dev` | Starts Vite dev server (Frontend). |
| **Build** | `npm run build` | Builds for production. |
| **Deploy** | `npx wrangler pages deploy dist` | Deploys frontend to Cloudflare Pages. |
| **Backend** | Vercel | Backend is deployed via Vercel integration (auto). |

### DIM Source (`./dim-source`)

| Action | Command | Description |
| :--- | :--- | :--- |
| **Install** | `pnpm install` | Install dependencies. |
| **Start** | `pnpm start` | Starts dev server (for reference/debugging). |

---

## 📅 Current Focus (Phase 2)

According to `DEVELOPMENT_ROADMAP.md`, the current focus is **Core Features Development**:
1.  **Manifest Infrastructure:** Automated download/processing of Destiny 2 manifest.
2.  **Character Management:** Real-time data, multi-character inventory view.
3.  **Item Database:** Browsing and searching items (light.gg style).

**Immediate Next Step:** Implement automated manifest download and processing.
