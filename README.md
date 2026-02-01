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

I am building this for the love of the game. Every contribution, bug report, or bit of feedback doesn't just help me—it helps the entire community. If you think you can make this tool better for our fellow Guardians, I would be incredibly happy to have your help.

Let's build something the Tower would be proud of. 🚀

## Features

- **Arsenal**: View your weapons and armor with a premium, high-fidelity UI (DIM-like density).
- **Max Power Engine**: Automatically calculates your "Base Power" level, respecting the complex "One Exotic" rule to show your true potential.
- **Armor 3.0 Stats**: View your stats with functional names (Health, Melee, etc.) and raw values for instant build assessment.
- **Smart Transfers**: Move items between any character or vault instantly. The system automatically handles multi-step transfers (Source -> Vault -> Destination).
- **Postmaster & Lost Items**: View and manage lost items directly from your inventory screen.
- **Granular Vault**: Browsable vault organized by item type (Auto Rifle, Helmet, etc.) and sorted alphabetically.
- **Tag & Organize**: Right-click any item to Tag it (Favorite, Junk, Infuse) or add Notes. Data is synced to the cloud.
- **Real-time Data**: Fetches your live inventory from Bungie.net.
- **Secure Auth**: OAuth 2.0 authentication with Bungie.net.

## Changelog

See [CHANGELOG.md](/CHANGELOG.md).

## 🛠️ Development Setup

So you want to contribute? Excellent. Here is how you get the ghost running locally.

### Prerequisites

- Node.js 20+
- npm

### 1. Clone & Install

```bash
git clone https://github.com/GuardianManager/guardian-nexus.git
cd guardian-nexus
npm install
```

### 2. Configure Bungie API Keys

This app needs a connection to the [Bungie API](https://bungie.net/en/Application).

1. Go to [Bungie.net Developer Portal](https://www.bungie.net/en/Application).
2. **Create a new App** (select "Confidential" client type).
3. Set **Redirect URL** to: `http://localhost:5173/api/auth/callback` (or your local port).
4. Select strict scope for **Read/Write Destiny Inventory** (Move/Transfer items).

### 3. Set Secrets

Create a `.dev.vars` file in the root `guardian-nexus/` directory (used by Cloudflare Wrangler):

```ini
# .dev.vars
BUNGIE_API_KEY=your_api_key_here
BUNGIE_CLIENT_ID=your_client_id_here
BUNGIE_CLIENT_SECRET=your_client_secret_here
BUNGIE_AUTH_URL=https://www.bungie.net/en/OAuth/Authorize
```

### 4. Run Locally

We use **Vite** for the frontend and **Cloudflare Functions** for the backend proxy.

```bash
# Terminal 1: Run the frontend
npm run dev
```

> **Note:** For full API functionality locally, you may need to run via Wrangler proxy:
> `npx wrangler pages dev --proxy=5173`
