# Plan: Cloudflare Worker Backend & Manifest Service

## Phase 1: Project Initialization & Cloudflare Setup [checkpoint: 875fc57]
- [x] Task: Install Wrangler CLI & Initialize Worker Project c01cb1a
    - Install `wrangler` globally or as a dev dependency.
    - Initialize a new Worker project (e.g., `guardian-nexus-api`) in a subfolder.
    - Configure `wrangler.toml` (name, compatibility dates).
- [x] Task: Configure Development Environment 288bd12
    - Set up TypeScript configuration (`tsconfig.json`) for the Worker.
    - Add `hono` or `itty-router` for lightweight routing.
    - Add `.gitignore` for worker-specific files.

## Phase 2: Bungie OAuth Proxy [checkpoint: 80576d9]
- [x] Task: Define Environment Secrets 151ccb9
    - Use `wrangler secret put` to store `BUNGIE_CLIENT_ID` and `BUNGIE_CLIENT_SECRET`.
    - Create a utility to load these securely in the worker.
- [x] Task: Implement OAuth Redirect Endpoint d79497b
    - Create `GET /auth/login` that redirects to Bungie's authorization URL.
- [x] Task: Implement OAuth Callback Endpoint 1c5ac51
    - Create `GET /auth/callback` to handle the auth code.
    - Exchange code for tokens (Access + Refresh) via Bungie API.
    - Return a secure HTTP-only cookie or session token to the client.

## Phase 3: Manifest Infrastructure (The "Zipper" Foundation)
- [x] Task: Setup Cloudflare D1 Database 91272c3
    - Create a D1 database: `wrangler d1 create guardian-db`.
    - Bind D1 to the worker in `wrangler.toml`.
    - Create an initial schema migration for `UserMetadata` (bungieMembershipId, tags, notes).
- [x] Task: Implement Manifest Fetcher Service 0d26440
    - Create a service function that calls `GET /Platform/Destiny2/Manifest/`.
    - *Optimization:* For the free tier, we might need a scheduled trigger (Cron) to fetch this daily, rather than on user request, to save CPU.
- [ ] Task: Create Manifest Proxy Endpoint
    - Create `GET /api/manifest/definitions` that serves processed/cached definitions to the frontend.
    - Ensure robust caching headers (Cache-Control) are set.

## Phase 4: Integration Verification
- [ ] Task: Verify Deployment
    - Deploy the worker: `wrangler deploy`.
    - Verify endpoints using `curl` or Postman.
- [ ] Task: Conductor - User Manual Verification 'Integration Verification' (Protocol in workflow.md)
