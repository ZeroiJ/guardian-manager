/**
 * Sync Store — Cloud Sync Engine
 *
 * Central orchestrator for cross-device sync of loadouts, settings, tags/notes.
 * Inspired by DIM's sync architecture:
 *   - Optimistic updates with rollback on failure
 *   - Queued changes with 1s debounced flush
 *   - Queue compaction before flushing (merges redundant updates)
 *   - Incremental sync via sync tokens (server returns only deltas)
 *   - Last-write-wins conflict resolution
 *
 * Flow:
 *   1. App init → fullSync() pulls all server data, hydrates loadoutStore + settingsStore
 *   2. User actions → enqueue() adds changes to the queue, UI updates immediately (optimistic)
 *   3. After 1s debounce → flush() compacts queue and exports to server
 *   4. On failure → rollback optimistic changes, mark error
 *   5. Periodic import (5min / tab focus) pulls remote changes
 */
import { create } from 'zustand';
import {
  syncClient,
  SyncError,
  type SyncExportPayload,
  type SyncImportResponse,
  type SyncLoadout,
} from '@/services/sync/syncClient';
import type { ILoadout } from './loadoutStore';

// ============================================================================
// TYPES
// ============================================================================

/** Types of changes that can be queued for sync. */
export type SyncChangeType = 'loadout' | 'settings' | 'tag' | 'note';

/** Actions that can be performed on a sync entity. */
export type SyncAction = 'upsert' | 'delete';

/** A single queued change waiting to be flushed to the server. */
export interface SyncChange {
  /** Unique ID for dedup/compaction (e.g. `loadout:${id}` or `tag:${itemId}`) */
  key: string;
  type: SyncChangeType;
  action: SyncAction;
  /** The payload to sync. Shape depends on type. */
  payload: unknown;
  /** Timestamp when this change was enqueued. */
  timestamp: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'error';

interface SyncState {
  /** Current sync status. */
  status: SyncStatus;
  /** Last error message, if any. */
  lastError: string | null;
  /** Server-issued sync token for incremental sync. */
  syncToken: number;
  /** Whether initial sync has completed. */
  initialized: boolean;
  /** Pending changes waiting to be flushed. */
  queue: SyncChange[];
  /** Whether a flush is currently in progress. */
  flushing: boolean;

  // ---- Actions ----

  /**
   * Initialize sync: perform a full bidirectional sync.
   * Call this once on app load (after auth is confirmed).
   * Returns the server's full state for hydration.
   */
  initSync: (localLoadouts?: ILoadout[]) => Promise<SyncImportResponse | null>;

  /**
   * Enqueue a change for sync. The UI should already be updated (optimistic).
   * The queue will auto-flush after a 1s debounce.
   */
  enqueue: (change: Omit<SyncChange, 'timestamp'>) => void;

  /**
   * Force flush all queued changes immediately.
   * Returns true if flush succeeded.
   */
  flush: () => Promise<boolean>;

  /**
   * Pull remote changes since last sync token (incremental sync).
   * Returns the import response for the caller to merge.
   */
  importChanges: () => Promise<SyncImportResponse | null>;

  /** Clear error state. */
  clearError: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Debounce timer handle. */
let flushTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounce interval in ms. */
const FLUSH_DEBOUNCE_MS = 1_000;

/**
 * Compact the queue: for each unique key, keep only the latest change.
 * This prevents sending redundant updates (e.g. multiple rapid renames).
 */
function compactQueue(queue: SyncChange[]): SyncChange[] {
  const map = new Map<string, SyncChange>();
  for (const change of queue) {
    // Later entries overwrite earlier ones
    map.set(change.key, change);
  }
  return Array.from(map.values());
}

/**
 * Convert an ILoadout (client format) to SyncLoadout (wire format).
 * The full loadout data is serialized into the `data` JSON blob.
 */
export function loadoutToSync(loadout: ILoadout, deleted = false): SyncLoadout {
  return {
    id: loadout.id,
    name: loadout.name,
    classType: loadout.characterClass,
    data: {
      items: loadout.items,
      modsByBucket: loadout.modsByBucket,
      notes: loadout.notes,
      characterId: loadout.characterId,
      characterClass: loadout.characterClass,
      createdAt: loadout.createdAt,
      updatedAt: loadout.updatedAt,
    },
    createdAt: loadout.createdAt,
    updatedAt: loadout.updatedAt,
    deleted,
  };
}

/**
 * Convert a SyncLoadout (wire format) back to ILoadout (client format).
 */
export function syncToLoadout(sync: SyncLoadout): ILoadout {
  return {
    id: sync.id,
    name: sync.name,
    characterId: sync.data.characterId || '',
    characterClass: sync.classType ?? sync.data.characterClass ?? -1,
    items: sync.data.items || [],
    createdAt: sync.data.createdAt || sync.createdAt,
    updatedAt: sync.data.updatedAt || sync.updatedAt,
    notes: sync.data.notes,
    modsByBucket: sync.data.modsByBucket,
  };
}

/**
 * Build a SyncExportPayload from compacted queue changes.
 */
function buildExportPayload(changes: SyncChange[]): SyncExportPayload {
  const payload: SyncExportPayload = {};

  const loadoutChanges = changes.filter((c) => c.type === 'loadout');
  if (loadoutChanges.length > 0) {
    payload.loadouts = loadoutChanges.map((c) => c.payload as SyncLoadout);
  }

  const settingsChange = changes.find((c) => c.type === 'settings');
  if (settingsChange) {
    payload.settings = settingsChange.payload as { data: Record<string, unknown> };
  }

  const tagChanges = changes.filter((c) => c.type === 'tag');
  if (tagChanges.length > 0) {
    const tags: Record<string, string> = {};
    for (const change of tagChanges) {
      const p = change.payload as { itemId: string; value: string | null };
      tags[p.itemId] = p.value ?? '';
    }
    payload.tags = tags;
  }

  const noteChanges = changes.filter((c) => c.type === 'note');
  if (noteChanges.length > 0) {
    const notes: Record<string, string> = {};
    for (const change of noteChanges) {
      const p = change.payload as { itemId: string; value: string | null };
      notes[p.itemId] = p.value ?? '';
    }
    payload.notes = notes;
  }

  return payload;
}

// ============================================================================
// STORE
// ============================================================================

export const useSyncStore = create<SyncState>()((set, get) => ({
  status: 'idle',
  lastError: null,
  syncToken: 0,
  initialized: false,
  queue: [],
  flushing: false,

  // ------------------------------------------------------------------
  // initSync — Full bidirectional sync on app start
  // ------------------------------------------------------------------
  initSync: async (localLoadouts) => {
    set({ status: 'syncing' });

    try {
      // Build export payload from existing localStorage loadouts (migration)
      const exportPayload: SyncExportPayload = {};
      if (localLoadouts && localLoadouts.length > 0) {
        exportPayload.loadouts = localLoadouts.map((l) => loadoutToSync(l));
        console.log(
          `[SyncStore] initSync: uploading ${localLoadouts.length} local loadouts`,
        );
      }

      const response = await syncClient.fullSync(exportPayload);

      set({
        status: 'idle',
        syncToken: response.newSyncToken,
        initialized: true,
        lastError: null,
      });

      console.log(
        `[SyncStore] initSync complete: ${response.loadouts.length} loadouts, ` +
          `settings=${response.settings ? 'yes' : 'no'}, ` +
          `token=${response.newSyncToken}`,
      );

      return response;
    } catch (err) {
      const message =
        err instanceof SyncError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Unknown sync error';

      console.error('[SyncStore] initSync failed:', message);
      set({
        status: 'error',
        lastError: message,
        initialized: true, // Mark initialized even on error so app isn't blocked
      });
      return null;
    }
  },

  // ------------------------------------------------------------------
  // enqueue — Add a change to the queue, schedule debounced flush
  // ------------------------------------------------------------------
  enqueue: (change) => {
    const entry: SyncChange = {
      ...change,
      timestamp: Date.now(),
    };

    set((state) => ({ queue: [...state.queue, entry] }));

    // Clear existing timer and set a new one
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      get().flush();
    }, FLUSH_DEBOUNCE_MS);
  },

  // ------------------------------------------------------------------
  // flush — Compact + export queued changes
  // ------------------------------------------------------------------
  flush: async () => {
    const { queue, flushing } = get();

    // Guard: no-op if already flushing or nothing to flush
    if (flushing || queue.length === 0) return true;

    set({ flushing: true, status: 'syncing' });

    // Snapshot and clear the queue atomically
    const toFlush = compactQueue(queue);
    set({ queue: [] });

    try {
      const payload = buildExportPayload(toFlush);
      const result = await syncClient.export(payload);

      console.log(
        `[SyncStore] flush: ${toFlush.length} changes → ` +
          `${result.syncedLoadouts} loadouts, settings=${result.syncedSettings}`,
      );

      set({ flushing: false, status: 'idle', lastError: null });
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Flush failed';

      console.error('[SyncStore] flush failed:', message);

      // Put failed changes back at the front of the queue for retry
      set((state) => ({
        queue: [...toFlush, ...state.queue],
        flushing: false,
        status: 'error',
        lastError: message,
      }));

      return false;
    }
  },

  // ------------------------------------------------------------------
  // importChanges — Incremental pull from server
  // ------------------------------------------------------------------
  importChanges: async () => {
    const { syncToken } = get();

    set({ status: 'syncing' });

    try {
      const response = await syncClient.import(syncToken);

      set({
        status: 'idle',
        syncToken: response.newSyncToken,
        lastError: null,
      });

      console.log(
        `[SyncStore] importChanges: ${response.loadouts.length} loadouts, ` +
          `token=${syncToken} → ${response.newSyncToken}`,
      );

      return response;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Import failed';

      console.error('[SyncStore] importChanges failed:', message);
      set({ status: 'error', lastError: message });
      return null;
    }
  },

  // ------------------------------------------------------------------
  // clearError
  // ------------------------------------------------------------------
  clearError: () => {
    set({ lastError: null, status: get().queue.length > 0 ? 'idle' : 'idle' });
  },
}));
