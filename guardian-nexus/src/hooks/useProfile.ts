import { useState, useEffect, useCallback, useMemo } from 'react';
import { APIClient } from '../services/api/client';
import { TransferService } from '../services/inventory/transferService';
import { GuardianProfile, GuardianItem } from '../services/profile/types';

export function useProfile() {
    // Raw Data State
    const [bungieProfile, setBungieProfile] = useState<any>(null);
    const [metadata, setMetadata] = useState<{ tags: Record<string, string>, notes: Record<string, string> } | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('[useProfile] Starting profile fetch...');
            
            // Fetch in parallel
            const [bp, md] = await Promise.all([
                APIClient.getProfile().catch(err => {
                    console.error('[useProfile] Profile fetch failed:', err);
                    throw err;
                }),
                APIClient.getMetadata().catch(err => {
                    console.error('[useProfile] Metadata fetch failed:', err);
                    throw err;
                })
            ]);
            
            console.log('[useProfile] Profile fetched successfully:', bp);
            console.log('[useProfile] Metadata fetched successfully:', md);
            
            setBungieProfile(bp);
            setMetadata(md);
        } catch (err) {
            console.error('[useProfile] Error in refresh:', err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown profile error';
            const detailedError = new Error(`Failed to load profile: ${errorMessage}`);
            setError(detailedError);
        } finally {
            setLoading(false);
        }
    }, []);

    // The Zipper: Merge Bungie Data + Local Metadata
    const profile = useMemo<GuardianProfile | null>(() => {
        if (!bungieProfile || !metadata) return null;

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

        // ZIP IT
        const items: GuardianItem[] = rawItems.map(item => {
            const inst = item.itemInstanceId ? instanceData[item.itemInstanceId] : undefined;
            const instanceId = item.itemInstanceId;
            
            const tag = instanceId ? (metadata.tags?.[instanceId]) : undefined;
            const note = instanceId ? (metadata.notes?.[instanceId]) : undefined;

            return {
                ...item,
                instanceData: {
                    ...inst,
                    isEquipped: item.isEquipped
                },
                owner: item.owner,
                userTag: tag || null,
                userNote: note || null
            };
        });

        return {
            characters,
            items,
            currencies: [],
            artifactPower
        };
    }, [bungieProfile, metadata]);

    const updateItemMetadata = useCallback(async (itemId: string, type: 'tag' | 'note', value: string | null) => {
        // Optimistic Update: Modify 'metadata' state directly
        setMetadata(prev => {
            if (!prev) return null;
            const newMeta = { ...prev };
            const targetMap = type === 'tag' ? { ...prev.tags } : { ...prev.notes };
            
            if (value) targetMap[itemId] = value;
            else delete targetMap[itemId];

            if (type === 'tag') newMeta.tags = targetMap;
            else newMeta.notes = targetMap;

            return newMeta;
        });

        // Background Sync
        try {
            await APIClient.updateMetadata(itemId, type, value);
        } catch (err) {
            console.error('Failed to sync metadata:', err);
            refresh(); // Revert on failure
        }
    }, [refresh]);

    const moveItem = useCallback(async (itemInstanceId: string, itemHash: number, targetOwnerId: string, isVault: boolean) => {
        // Optimistic Update: Modify 'bungieProfile' state directly (harder, but doable)
        // Actually, it's easier to modify the 'items' array in the zipper source if we normalize it first.
        // For now, let's just trigger a re-fetch after move or try to patch the raw object?
        // Patching the raw object is risky. 
        // Let's modify the ZIPPER output? No, useMemo will overwrite it.
        
        // We will modify the 'bungieProfile' state deeply.
        setBungieProfile((prev: any) => {
            if (!prev) return null;
            // Deep clone needed? Yes.
            const next = JSON.parse(JSON.stringify(prev));
            
            // Find item in Vault
            let found = false;
            if (next.profileInventory?.data?.items) {
                const idx = next.profileInventory.data.items.findIndex((i: any) => i.itemInstanceId === itemInstanceId);
                if (idx > -1) {
                    const [item] = next.profileInventory.data.items.splice(idx, 1);
                    // Move to Target
                    // ... This logic is complex because Bungie structure is split by character/vault.
                    // We need to find the target bucket (Vault vs Character Inventory vs Equipment).
                    // This is getting too complex for "Optimistic Raw Data Patching".
                    
                    // Fallback: Just refresh for now, or assume the UI handles visual drag (which it does via DndContext active state).
                    // But we want it to STAY there.
                    found = true;
                }
            }
            // ... Find in characters ...
            
            // SIMPLIFICATION:
            // Since we implemented 'VirtualVaultGrid' and 'CharacterColumn' based on 'profile.items',
            // we really just need to patch 'profile.items' IF we weren't generating it from 'bungieProfile' every render.
            
            // Solution: We will rely on the "Background Sync" completing fast enough, OR we accept a quick flash.
            // OR: We introduce a "Pending Moves" state that the Zipper applies on top.
            return prev;
        });

        // Background Sync
        try {
            // Find source (from current profile)
            const item = profile?.items.find(i => i.itemInstanceId === itemInstanceId);
            if (!item) return;

            const sourceId = item.owner;
            const targetId = isVault ? 'vault' : targetOwnerId;

            await TransferService.moveItem({
                itemInstanceId,
                itemHash,
                sourceId,
                targetId
            });
            
            // Success -> Refresh to get true state
            refresh();
        } catch (err) {
            console.error('Failed to move item:', err);
        }
    }, [profile, refresh]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { profile, loading, error, refresh, updateItemMetadata, moveItem };
}
