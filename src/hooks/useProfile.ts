/**
 * useProfile — Two-Phase Profile Loading (Stale-While-Revalidate)
 *
 * Phase 1 (Cache): On mount, reads cached Bungie profile from IndexedDB.
 *   If hit, immediately hydrates the inventory store for instant UI.
 * Phase 2 (Network): Fires network request in background. On success,
 *   compares responseMintedTimestamp — only rehydrates if data is newer.
 *
 * Error fallback: If network fails but cache exists, keeps showing cached data.
 *
 * Architecture inspired by DIM: src/app/inventory/d2-stores.ts
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { APIClient } from '../services/api/client';
import { useInventoryStore } from '../store/useInventoryStore';
import {
    getProfileCache,
    setProfileCache,
    extractMintedTimestamp,
    isNewerTimestamp,
} from '../services/profile/profileCache';
import { useShallow } from 'zustand/react/shallow';

const EMPTY_CURRENCIES: any[] = [];

/**
 * Key used to persist the last-known membershipId in localStorage.
 * Needed to read the profile cache before the network call returns.
 */
const MEMBERSHIP_ID_KEY = 'guardian-nexus-membershipId';

/**
 * Extract membershipId from a raw Bungie profile response.
 */
function extractMembershipId(bungieProfile: any): string | null {
    return bungieProfile?.profile?.data?.userInfo?.membershipId || null;
}

export function useProfile() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    /** True when showing cached data and network request is still in-flight. */
    const [isStale, setIsStale] = useState(false);

    // Subscribe to Store with Shallow Comparison
    const profile = useInventoryStore(useShallow(state => ({
        characters: state.characters,
        items: state.items,
        currencies: EMPTY_CURRENCIES,
        artifactPower: state.profile?.profileProgression?.data?.seasonalArtifact?.powerBonus || 0
    })));

    const updateItemMetadata = useInventoryStore(state => state.updateMetadata);
    const moveItem = useInventoryStore(state => state.moveItem);
    const hydrate = useInventoryStore(state => state.hydrate);

    // Track whether initial two-phase load has completed
    const initialLoadDone = useRef(false);

    /**
     * Network-only refresh. Used by both initial load (Phase 2) and auto-refresh polling.
     * Compares timestamps and skips rehydration if data hasn't changed.
     */
    const refresh = useCallback(async () => {
        setError(null);
        try {
            console.log('[useProfile] Fetching from network...');
            const [bp, md] = await Promise.all([
                APIClient.getProfile(),
                APIClient.getMetadata()
            ]);

            // Extract and persist membershipId for future cache reads
            const membershipId = extractMembershipId(bp);
            if (membershipId) {
                localStorage.setItem(MEMBERSHIP_ID_KEY, membershipId);
            }

            // Check if this response is actually newer than what we already have
            const networkTimestamp = extractMintedTimestamp(bp);
            const storeTimestamp = useInventoryStore.getState().lastMintedTimestamp;

            if (storeTimestamp && !isNewerTimestamp(networkTimestamp, storeTimestamp)) {
                console.log(
                    `[useProfile] Network response not newer (${networkTimestamp} <= ${storeTimestamp}), skipping hydration`
                );
                return;
            }

            // HYDRATE THE ENGINE
            hydrate(bp, md);
            setIsStale(false);

            // Update IDB cache in background (fire-and-forget)
            if (membershipId) {
                setProfileCache(membershipId, bp).catch(() => {});
            }

            console.log(`[useProfile] Network hydration complete. Minted: ${networkTimestamp}`);
        } catch (err) {
            console.error('[useProfile] Network error:', err);
            // Only set error if we don't have cached data showing
            const hasItems = useInventoryStore.getState().items.length > 0;
            if (!hasItems) {
                setError(err instanceof Error ? err : new Error('Unknown profile error'));
            } else {
                // We have cached data — show a stale warning but don't break UI
                console.warn('[useProfile] Network failed but cached data available, keeping stale UI');
                setIsStale(true);
            }
        } finally {
            setLoading(false);
        }
    }, [hydrate]);

    /**
     * Two-phase initial load:
     * Phase 1: Read from IDB cache → instant UI
     * Phase 2: Fetch from network → update if newer
     */
    useEffect(() => {
        if (initialLoadDone.current) return;
        initialLoadDone.current = true;

        (async () => {
            const membershipId = localStorage.getItem(MEMBERSHIP_ID_KEY);

            // Phase 1: Try IDB cache for instant UI
            if (membershipId) {
                try {
                    const cached = await getProfileCache(membershipId);
                    if (cached) {
                        console.log('[useProfile] Phase 1: Hydrating from cache...');
                        // Fetch metadata in parallel with cache read
                        // We still need fresh metadata since tags/notes may have changed
                        let metadata: any;
                        try {
                            metadata = await APIClient.getMetadata();
                        } catch {
                            // If metadata fetch fails, use empty defaults
                            metadata = { tags: {}, notes: {} };
                        }

                        hydrate(cached.profile, metadata);
                        setLoading(false);
                        setIsStale(true); // Mark as stale until network confirms
                        console.log('[useProfile] Phase 1 complete — cached UI displayed');
                    }
                } catch (err) {
                    console.warn('[useProfile] Phase 1 cache read failed:', err);
                }
            }

            // Phase 2: Always fetch from network (even if cache hit)
            console.log('[useProfile] Phase 2: Fetching from network...');
            await refresh();
        })();
    }, [hydrate, refresh]);

    return { profile, loading, error, refresh, updateItemMetadata, moveItem, isStale };
}
