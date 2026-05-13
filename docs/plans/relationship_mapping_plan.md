# Relationship Mapping Plan

## Overview
This document outlines the mapping between the Postgres UserMetadata schema and various definitions in the Bungie Manifest.

## UserMetadata Table
- `id`: Integer - Unique identifier for the user.
- `bungieMembershipId`: Text - Unique Bungie Membership ID.
- `tags`: JSON string for flexibly categorizing user metadata.
- `notes`: JSON string for additional user notes.
- `updatedAt`: DateTime - Timestamp for record updates.

## Manifest Schema Relationships
To establish relationships between the Postgres schema and the Bungie Manifest, the following will be implemented:
1. Use the `getDefinitions` function to fetch manifest data based on relevant user actions.
2. Store the retrieved definitions in the appropriate format within the UserMetadata entries to facilitate future queries and ensure understanding of how user data interacts with the API.

## Status (2026-05-13)

Initial Postgres-focused sketch. **Current app** stores tags/notes/loadouts primarily via **Cloudflare D1 + sync client** (`useCloudSync`, `syncClient.ts`) keyed by Bungie membership; manifest lookups use cached definitions. Treat this file as **conceptual** unless extended with concrete table names matching production migrations.

## Next Steps (if revisiting)

1. Align any Postgres docs with actual Worker/D1 schema in `migrations/`.
2. Document membership ↔ sync token flow next to `sync_tokens` usage.