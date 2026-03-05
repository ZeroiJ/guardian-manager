-- Migration: Cloud Sync Tables for Phase 1.5
-- Run with: wrangler d1 execute guardian-db --file=./migrations/0001_cloud_sync.sql
--
-- Tables:
--   loadouts      - User-created loadout snapshots (replaces localStorage)
--   settings      - User display/behavior preferences
--   sync_tokens   - Tracks last sync position per user for incremental sync
--
-- The existing UserMetadata table (tags/notes) is untouched but verified to
-- have updatedAt for incremental sync support.

-- Loadouts table
-- Stores the full loadout data as JSON for flexibility.
-- `deleted` flag enables soft-delete for sync (client marks deleted, server propagates).
CREATE TABLE IF NOT EXISTS loadouts (
    id TEXT PRIMARY KEY,
    membership_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Unnamed Loadout',
    class_type INTEGER NOT NULL DEFAULT -1,
    data TEXT NOT NULL DEFAULT '{}',  -- JSON blob: { items: ILoadoutItem[], modsByBucket?: Record, notes?: string }
    created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
    deleted INTEGER NOT NULL DEFAULT 0
);

-- Index for efficient per-user queries
CREATE INDEX IF NOT EXISTS idx_loadouts_membership ON loadouts(membership_id);

-- Index for incremental sync (fetch rows changed since last sync)
CREATE INDEX IF NOT EXISTS idx_loadouts_updated ON loadouts(membership_id, updated_at);


-- Settings table
-- One row per user. `data` is a JSON blob of all settings.
CREATE TABLE IF NOT EXISTS settings (
    membership_id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}',  -- JSON blob: { theme, sortOrder, displayOptions, ... }
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);


-- Sync tokens table
-- Tracks the last sync position per user so the server can return only
-- rows changed since the client's last sync.
CREATE TABLE IF NOT EXISTS sync_tokens (
    membership_id TEXT PRIMARY KEY,
    -- Last updated_at timestamp the client has seen (epoch ms)
    last_sync_token INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
