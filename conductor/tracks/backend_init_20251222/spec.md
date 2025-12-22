# Specification: Cloudflare Worker Backend & Manifest Service

## 1. Overview
Initialize the backend infrastructure using **Cloudflare Workers** (Free Tier). This track focuses on setting up the serverless environment, configuring Bungie OAuth proxying, and implementing the core "Manifest Service" which caches Destiny 2 definitions using Cloudflare KV/D1 and IndexedDB.

## 2. Goals
- **Infrastructure:** Set up a Cloudflare Worker project (`api`) using Wrangler.
- **Authentication:** Implement a secure OAuth 2.0 proxy for Bungie.net.
- **Manifest Service:**
    - Fetch the Destiny 2 Manifest from Bungie.
    - Extract `DestinyInventoryItemDefinition` and `DestinyStatDefinition`.
    - Cache lightweight definitions in Cloudflare KV (for fast backend access) or serve processed chunks to the client.
- **Database:** Configure a basic Cloudflare D1 (SQLite) database for user metadata (Tags, Notes).

## 3. Technical Requirements
- **Runtime:** Cloudflare Workers (Edge Runtime).
- **Language:** TypeScript.
- **Framework:** Hono (Recommended for Workers) or raw Fetch API.
- **Storage:**
    - **Cloudflare D1:** For structured relational data (User Metadata).
    - **Cloudflare KV:** For caching Manifest chunks.
- **Bungie API:** Use `bungie-api-ts` for type definitions.

## 4. Constraints
- **Free Tier Limits:**
    - Workers: 100,000 requests/day.
    - KV: 1GB storage.
    - D1: 500MB storage.
- **Performance:** Manifest processing should happen asynchronously or be pre-processed to avoid hitting CPU time limits (10ms on free tier) per request.

## 5. Security
- **Secrets:** Bungie `CLIENT_ID` and `CLIENT_SECRET` must be stored in Cloudflare Secrets, never in code.
- **CORS:** Restrict API access to the Cloudflare Pages frontend domain.
