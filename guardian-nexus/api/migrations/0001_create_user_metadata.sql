-- Migration: create_user_metadata
-- Created at: 2025-12-22

CREATE TABLE UserMetadata (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bungieMembershipId TEXT UNIQUE NOT NULL,
    tags TEXT, -- JSON string
    notes TEXT, -- JSON string
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_metadata_membership_id ON UserMetadata(bungieMembershipId);