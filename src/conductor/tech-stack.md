# Tech Stack - Guardian Manager

## Frontend
- **Framework:** React 19 (Vite)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Routing:** React Router v7
- **State Management:** React Context API (Normalized State)
- **Drag & Drop:** @dnd-kit (Core, Sortable)
- **Icons:** Lucide React

## Backend
- **Runtime:** Node.js
- **Framework:** Express (Vercel Serverless)
- **Authentication:** Bungie OAuth 2.0 (Custom Proxy)
- **Data Merging:** "Zipper" Model (Bungie API + Postgres Metadata)

## Storage
- **Primary Database:** PostgreSQL (Metadata: Tags, Notes, Loadouts)
- **Client Cache:** IndexedDB (Manifest Definitions)
- **Session:** Cookie-based session management

## Infrastructure
- **Hosting (Frontend):** Cloudflare Pages
- **Hosting (Backend):** Cloudflare Workers (Serverless)
- **External API:** Bungie.net API
