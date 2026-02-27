# Guardian Manager

A full-featured Destiny 2 inventory management web application. Built to help players manage their weapons, armor, and loadouts with a modern, responsive interface.

## About This Project

Guardian Manager is a personal project I built to deepen my understanding of full-stack web development while creating something genuinely useful for the Destiny 2 community. The application interfaces with Bungie's official API to provide real-time inventory management, loadout optimization, and cloud-synced organization features.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Backend**: Cloudflare Workers (API proxy)
- **Deployment**: Cloudflare Pages
- **API**: Bungie.net REST API (OAuth 2.0)

## Features

### Inventory Management
- **Complete Arsenal View**: Browse all weapons and armor across characters and vault
- **Detailed Item Stats**: View damage types, rarity, power level, and item perks
- **Granular Vault Organization**: Filter and sort by item type, rarity, and damage

### Loadout System
- **Create & Manage Loadouts**: Save up to 10 loadouts per character
- **One-Click Equip**: Instantly equip full loadouts with automatic handling of multi-step transfers
- **Armor Mod Support**: Configure armor mods within loadouts
- **Subclass Customization**: Configure subclass abilities and fragments

### Optimization Tools
- **Max Power Calculator**: Automatically calculates base power level with proper exotic handling
- **Smart Transfers**: Intelligent multi-step item transfers (vault routing when direct transfer isn't possible)
- **Postmaster Recovery**: View and retrieve items from the Postmaster

### Organization
- **Item Tagging**: Mark items as Favorite, Junk, or Infuse
- **Custom Notes**: Add personal notes to any item
- **Cloud Sync**: Tags and notes synced via Cloudflare KV storage

## Getting Started

### Prerequisites

- Node.js 20+
- npm or bun
- A Bungie.net developer account (free)

### Installation

```bash
git clone https://github.com/GuardianManager/guardian-nexus.git
cd guardian-nexus
npm install
```

### Configuration

1. Create an application at [Bungie Developer Portal](https://www.bungie.net/en/Application)
2. Set redirect URL to `http://localhost:5173/api/auth/callback`
3. Create `.dev.vars` file:

```ini
BUNGIE_API_KEY=your_api_key
BUNGIE_CLIENT_ID=your_client_id
BUNGIE_CLIENT_SECRET=your_client_secret
```

### Running Locally

```bash
npm run dev
```

For full API functionality with OAuth flows:

```bash
npx wrangler pages dev --proxy=5173
```

## Project Structure

```
src/
├── components/     # React components
├── hooks/          # Custom React hooks
├── lib/            # Utilities and helpers
├── pages/          # Route pages
├── services/       # API client and services
├── store/          # Zustand state management
└── styles/         # Global styles
```

## Contributing

This is an open project and contributions are welcome. Whether you want to fix a bug, add a feature, or improve the documentation:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

MIT

## Acknowledgments

- [DIM (Destiny Item Manager)](https://destinyitemmanager.com/) - Inspiration for UI patterns
- [Bungie.net](https://www.bungie.net/) - API access
