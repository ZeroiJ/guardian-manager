import { useState, useEffect, useCallback } from 'react';
import { APIClient } from '../services/api/client';
import { useInventoryEngine } from '../lib/core/InventoryEngine';

import { useShallow } from 'zustand/react/shallow';

export function useProfile() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Subscribe to Store with Shallow Comparison
    const profile = useInventoryEngine(useShallow(state => ({
        characters: state.characters,
        items: state.items,
        currencies: [], // TODO: Add to store if needed
        artifactPower: state.profile?.profileProgression?.data?.seasonalArtifact?.powerBonus || 0
    })));

    const updateItemMetadata = useInventoryEngine(state => state.updateMetadata);
    const moveItem = useInventoryEngine(state => state.moveItem);
    const hydrate = useInventoryEngine(state => state.hydrate);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('[useProfile] Fetching data...');
            const [bp, md] = await Promise.all([
                APIClient.getProfile(),
                APIClient.getMetadata()
            ]);

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
