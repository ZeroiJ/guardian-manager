import { useState, useEffect, useCallback } from 'react';
import { APIClient } from '../services/api/client';
import { GuardianProfile, GuardianItem } from '../services/profile/types';

export function useProfile() {
    const [profile, setProfile] = useState<GuardianProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch in parallel
            const [bungieProfile, metadata] = await Promise.all([
                APIClient.getProfile(),
                APIClient.getMetadata()
            ]);

            // Transform Bungie Data
            const characters = bungieProfile.characters.data || {};
            const rawItems: any[] = [];

            // Extract all items from all sources
            if (bungieProfile.profileInventory?.data?.items) {
                // Profile Inventory (Vault, etc.) - Not Equipped
                const items = bungieProfile.profileInventory.data.items.map((i: any) => ({ ...i, isEquipped: false, owner: 'vault' }));
                rawItems.push(...items);
            }
            
            Object.entries(bungieProfile.characterInventories?.data || {}).forEach(([charId, data]: [string, any]) => {
                const items = data.items.map((i: any) => ({ ...i, isEquipped: false, owner: charId }));
                rawItems.push(...items);
            });

            Object.entries(bungieProfile.characterEquipment?.data || {}).forEach(([charId, data]: [string, any]) => {
                const items = data.items.map((i: any) => ({ ...i, isEquipped: true, owner: charId }));
                rawItems.push(...items);
            });

            const instanceData = bungieProfile.itemComponents?.instances?.data || {};

            // Extract Artifact Power
            const artifactPower = bungieProfile.profileProgression?.data?.seasonalArtifact?.powerBonus || 0;

            // The Zipper: Merge Bungie Item + Instance Data + User Metadata
            const items: GuardianItem[] = rawItems.map(item => {
                const inst = item.itemInstanceId ? instanceData[item.itemInstanceId] : undefined;
                // Stub metadata access until backend supports it
                const tag = item.itemInstanceId ? (metadata.tags?.[item.itemInstanceId]) : undefined;
                const note = item.itemInstanceId ? (metadata.notes?.[item.itemInstanceId]) : undefined;

                return {
                    ...item,
                    instanceData: {
                        ...inst,
                        isEquipped: item.isEquipped // Hoist this flag to instanceData for easy access
                    },
                    owner: item.owner, // Ensure owner is preserved
                    userTag: tag,
                    userNote: note
                };
            });

            setProfile({
                characters,
                items,
                currencies: [], // TODO
                artifactPower
            });

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err : new Error('Unknown profile error'));
        } finally {
            setLoading(false);
        }
    }, []);

    const updateItemMetadata = useCallback(async (itemId: string, type: 'tag' | 'note', value: string | null) => {
        // Optimistic Update
        setProfile(prev => {
            if (!prev) return null;
            const newItems = prev.items.map(item => {
                if (item.itemInstanceId === itemId) {
                    return {
                        ...item,
                        [type === 'tag' ? 'userTag' : 'userNote']: value
                    };
                }
                return item;
            });
            return { ...prev, items: newItems };
        });

        // Background Sync
        try {
            await APIClient.updateMetadata(itemId, type, value);
        } catch (err) {
            console.error('Failed to sync metadata:', err);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { profile, loading, error, refresh, updateItemMetadata };
}
