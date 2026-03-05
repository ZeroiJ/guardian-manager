/**
 * useCloudSync — Orchestrates the Cloud Sync lifecycle.
 *
 * Responsibilities:
 *   1. On mount (after auth/profile), perform initial full sync
 *      - Migrates legacy localStorage loadouts to D1
 *      - Hydrates loadoutStore + settingsStore from server state
 *   2. Periodic incremental import every 5 minutes
 *   3. On tab re-focus, trigger an incremental import
 *   4. Flush pending changes before unload
 *
 * Usage: Call once in a top-level component (e.g. Inventory).
 * Requires the user to be authenticated (profile loaded).
 */
import { useEffect, useRef } from 'react';
import { useSyncStore, syncToLoadout } from '@/store/syncStore';
import { useLoadoutStore, drainLegacyLoadouts } from '@/store/loadoutStore';
import { useSettingsStore } from '@/store/settingsStore';

/** Incremental sync interval: 5 minutes. */
const SYNC_INTERVAL_MS = 5 * 60 * 1000;

interface UseCloudSyncOptions {
    /** Whether the user is authenticated and profile is loaded. */
    enabled: boolean;
}

export function useCloudSync({ enabled }: UseCloudSyncOptions) {
    const initRef = useRef(false);
    const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ---- Initial full sync ----
    useEffect(() => {
        if (!enabled || initRef.current) return;
        initRef.current = true;

        const doInit = async () => {
            // 1. Read legacy loadouts from localStorage (one-time migration)
            const legacyLoadouts = drainLegacyLoadouts();

            // 2. Full sync: upload legacy loadouts + download all server state
            const response = await useSyncStore.getState().initSync(
                legacyLoadouts.length > 0 ? legacyLoadouts : undefined,
            );

            if (!response) {
                console.warn('[useCloudSync] initSync returned null — sync may be offline');
                // If sync failed but we have legacy loadouts, keep them in the store
                if (legacyLoadouts.length > 0) {
                    for (const loadout of legacyLoadouts) {
                        useLoadoutStore.getState().hydrateFromSync([loadout]);
                    }
                }
                return;
            }

            // 3. Hydrate loadout store from server response
            const serverLoadouts = response.loadouts
                .filter((l) => !l.deleted)
                .map(syncToLoadout);
            useLoadoutStore.getState().hydrateFromSync(serverLoadouts);

            // 4. Hydrate settings store from server response
            if (response.settings?.data) {
                useSettingsStore.getState().hydrateFromSync(response.settings.data);
            }

            console.log(
                `[useCloudSync] Initialized: ${serverLoadouts.length} loadouts, ` +
                    `settings=${response.settings ? 'yes' : 'no'}`,
            );
        };

        doInit();
    }, [enabled]);

    // ---- Periodic incremental sync ----
    useEffect(() => {
        if (!enabled) return;

        const scheduleNext = () => {
            intervalRef.current = setTimeout(async () => {
                await doImport();
                scheduleNext();
            }, SYNC_INTERVAL_MS);
        };

        scheduleNext();

        return () => {
            if (intervalRef.current) clearTimeout(intervalRef.current);
        };
    }, [enabled]);

    // ---- Tab focus: incremental sync ----
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                doImport();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled]);

    // ---- Flush before unload ----
    useEffect(() => {
        const handleBeforeUnload = () => {
            // Synchronous flush attempt — the browser may kill us, but we try
            const { queue } = useSyncStore.getState();
            if (queue.length > 0) {
                useSyncStore.getState().flush();
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Perform an incremental import and hydrate stores.
 */
async function doImport(): Promise<void> {
    const { initialized } = useSyncStore.getState();
    if (!initialized) return;

    const response = await useSyncStore.getState().importChanges();
    if (!response) return;

    // Only hydrate if there are actual changes
    if (response.loadouts.length > 0) {
        const serverLoadouts = response.loadouts
            .filter((l) => !l.deleted)
            .map(syncToLoadout);
        useLoadoutStore.getState().hydrateFromSync(serverLoadouts);
    }

    if (response.settings?.data) {
        useSettingsStore.getState().hydrateFromSync(response.settings.data);
    }
}
