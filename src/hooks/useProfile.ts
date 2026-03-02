import { useState, useEffect, useCallback } from 'react';
import { APIClient } from '../services/api/client';
import { useInventoryStore } from '../store/useInventoryStore';

import { useShallow } from 'zustand/react/shallow';

const EMPTY_CURRENCIES: any[] = [];

export function useProfile() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Subscribe to Store with Shallow Comparison
    const profile = useInventoryStore(useShallow(state => ({
        characters: state.characters,
        items: state.items,
        currencies: EMPTY_CURRENCIES, // TODO: Add to store if needed
        artifactPower: state.profile?.profileProgression?.data?.seasonalArtifact?.powerBonus || 0
    })));

    const updateItemMetadata = useInventoryStore(state => state.updateMetadata);
    const moveItem = useInventoryStore(state => state.moveItem);
    const hydrate = useInventoryStore(state => state.hydrate);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('[useProfile] Fetching data...');
            const [bp, md] = await Promise.all([
                APIClient.getProfile(),
                APIClient.getMetadata()
            ]);

            // DEBUG: Log which itemComponents arrived (diagnosing missing 302/304/305)
            const ic = (bp as any)?.itemComponents;
            console.log('[useProfile] itemComponents keys:', ic ? Object.keys(ic) : 'NONE');
            if (ic) {
                for (const [k, v] of Object.entries(ic)) {
                    const val = v as any;
                    const count = val?.data ? Object.keys(val.data).length : 0;
                    console.log(`[useProfile]   ${k}: ${count} entries`);
                }
            }

            // HYDRATE THE ENGINE
            hydrate(bp, md);

        } catch (err) {
            console.error('[useProfile] Error:', err);
            setError(err instanceof Error ? err : new Error('Unknown profile error'));
        } finally {
            setLoading(false);
        }
    }, [hydrate]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { profile, loading, error, refresh, updateItemMetadata, moveItem };
}
