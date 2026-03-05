/**
 * Settings Store — User Preferences (Cloud-Synced)
 *
 * Stores display preferences, sort options, and behavior toggles.
 * Persisted to D1 via Cloud Sync (syncStore).
 *
 * Currently tracked settings:
 *   - itemSortOrder: How items are sorted within each bucket
 *   - wishlistUrl: Custom wishlist source URL
 *   - characterOrder: User-defined character sort order
 *
 * Settings are intentionally minimal to start. More preferences can
 * be added as the UI exposes them, without changing the sync protocol
 * (the `data` column in D1 is a free-form JSON blob).
 */
import { create } from 'zustand';
import { useSyncStore } from './syncStore';

// ============================================================================
// TYPES
// ============================================================================

export type ItemSortOrder = 'power' | 'rarity' | 'name' | 'type';

export interface SettingsData {
    /** How items are sorted within each bucket group. */
    itemSortOrder: ItemSortOrder;
    /** Custom wishlist URL (empty string = use default). */
    wishlistUrl: string;
    /** User-defined character display order (array of characterIds). Empty = default. */
    characterOrder: string[];
}

interface SettingsState extends SettingsData {
    /**
     * Update one or more settings. Merges partial updates.
     * Automatically enqueues a sync change.
     */
    update: (partial: Partial<SettingsData>) => void;

    /**
     * Hydrate settings from sync import response.
     * Server values override local values.
     */
    hydrateFromSync: (serverData: Record<string, unknown>) => void;

    /**
     * Get the current settings as a plain data object (for sync export).
     */
    getData: () => SettingsData;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULTS: SettingsData = {
    itemSortOrder: 'power',
    wishlistUrl: '',
    characterOrder: [],
};

// ============================================================================
// SYNC HELPER
// ============================================================================

function enqueueSyncSettings(data: SettingsData): void {
    useSyncStore.getState().enqueue({
        key: 'settings',
        type: 'settings',
        action: 'upsert',
        payload: { data },
    });
}

// ============================================================================
// STORE
// ============================================================================

export const useSettingsStore = create<SettingsState>()((set, get) => ({
    ...DEFAULTS,

    update: (partial) => {
        set(partial);
        enqueueSyncSettings(get().getData());
    },

    hydrateFromSync: (serverData) => {
        if (!serverData || typeof serverData !== 'object') return;

        const updates: Partial<SettingsData> = {};

        if (typeof serverData.itemSortOrder === 'string') {
            updates.itemSortOrder = serverData.itemSortOrder as ItemSortOrder;
        }
        if (typeof serverData.wishlistUrl === 'string') {
            updates.wishlistUrl = serverData.wishlistUrl;
        }
        if (Array.isArray(serverData.characterOrder)) {
            updates.characterOrder = serverData.characterOrder as string[];
        }

        if (Object.keys(updates).length > 0) {
            set(updates);
            console.log('[SettingsStore] Hydrated from sync:', updates);
        }
    },

    getData: () => {
        const { itemSortOrder, wishlistUrl, characterOrder } = get();
        return { itemSortOrder, wishlistUrl, characterOrder };
    },
}));
