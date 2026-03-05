/**
 * Sync Client — HTTP interface to the Cloud Sync endpoints.
 *
 * Talks to:
 *   POST /api/sync/import  — Pull changes since syncToken
 *   POST /api/sync/export  — Push local changes
 *   POST /api/sync/full    — Full bidirectional sync
 *
 * All methods include credentials (httpOnly cookie auth).
 */

// ============================================================================
// TYPES — Wire format for sync API
// ============================================================================

/** A loadout as returned from the sync API. */
export interface SyncLoadout {
  id: string;
  name: string;
  classType: number;
  /** The full loadout data blob (items, modsByBucket, notes, etc.) */
  data: {
    items?: Array<{
      itemInstanceId: string;
      itemHash: number;
      bucketHash: number;
      label?: string;
      power?: number;
      socketOverrides?: Record<number, number>;
    }>;
    modsByBucket?: Record<number, number[]>;
    notes?: string;
    characterId?: string;
    characterClass?: number;
    createdAt?: number;
    updatedAt?: number;
  };
  createdAt: number;
  updatedAt: number;
  deleted: boolean;
}

/** Settings blob from sync API. */
export interface SyncSettings {
  data: Record<string, unknown>;
  updatedAt: number;
}

/** Response from /api/sync/import and /api/sync/full. */
export interface SyncImportResponse {
  loadouts: SyncLoadout[];
  settings: SyncSettings | null;
  tags: Record<string, string>;
  notes: Record<string, string>;
  newSyncToken: number;
}

/** Response from /api/sync/export. */
export interface SyncExportResponse {
  success: boolean;
  syncedLoadouts: number;
  syncedSettings: boolean;
}

/** Payload for /api/sync/export and /api/sync/full. */
export interface SyncExportPayload {
  loadouts?: SyncLoadout[];
  settings?: { data: Record<string, unknown> };
  tags?: Record<string, string>;
  notes?: Record<string, string>;
}

// ============================================================================
// CLIENT
// ============================================================================

class SyncClientImpl {
  private async request<T>(path: string, body: unknown): Promise<T> {
    const response = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new SyncError(
        `Sync request failed: ${response.status} ${errorText}`,
        response.status,
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Pull remote changes since the given sync token.
   * If syncToken is 0, returns all server data (initial sync).
   */
  async import(syncToken: number = 0): Promise<SyncImportResponse> {
    return this.request<SyncImportResponse>('/api/sync/import', { syncToken });
  }

  /**
   * Push local changes to the server.
   * The server merges with existing data using last-write-wins.
   */
  async export(payload: SyncExportPayload): Promise<SyncExportResponse> {
    return this.request<SyncExportResponse>('/api/sync/export', payload);
  }

  /**
   * Full bidirectional sync: pushes local changes, then returns all server data.
   * Used on first load or when sync state is uncertain.
   */
  async fullSync(payload: SyncExportPayload = {}): Promise<SyncImportResponse> {
    return this.request<SyncImportResponse>('/api/sync/full', payload);
  }
}

/** Error class for sync-specific failures. */
export class SyncError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'SyncError';
  }
}

/** Singleton sync client. */
export const syncClient = new SyncClientImpl();
