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
        const statsData = bungieProfile.itemComponents?.stats?.data || {};
        const socketsData = bungieProfile.itemComponents?.sockets?.data || {};
        console.log('[DEBUG] useProfile Sockets Data Keys:', Object.keys(socketsData).length);

        // Extract Artifact Power
        const artifactPower = bungieProfile.profileProgression?.data?.seasonalArtifact?.powerBonus || 0;

        // ZIP IT
        const items: GuardianItem[] = rawItems.map(item => {
            const inst = item.itemInstanceId ? instanceData[item.itemInstanceId] : undefined;
            const stats = item.itemInstanceId ? statsData[item.itemInstanceId] : undefined;
            const sockets = item.itemInstanceId ? socketsData[item.itemInstanceId] : undefined;
            const instanceId = item.itemInstanceId;

            const tag = instanceId ? (metadata.tags?.[instanceId]) : undefined;
            const note = instanceId ? (metadata.notes?.[instanceId]) : undefined;

            return {
                ...item,
                instanceData: {
                    ...inst,
                    isEquipped: item.isEquipped
                },
                stats: stats?.stats || item.stats, // Merge live stats, fallback to static if missing
                sockets: sockets || undefined, // Attach live sockets
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
        const targetId = isVault ? 'vault' : targetOwnerId;

        // 1. Optimistic Update
        setBungieProfile((prev: any) => {
            if (!prev) return null;

            // Deep clone to avoid mutation reference issues
            const next = JSON.parse(JSON.stringify(prev));
            let foundItem: any = null;

            // Helper to remove item from list
            const removeItem = (list: any[]) => {
                const idx = list.findIndex((i: any) => i.itemInstanceId === itemInstanceId);
                if (idx > -1) {
                    foundItem = list[idx];
                    list.splice(idx, 1);
                    return true;
                }
                return false;
            };

            // A. Remove from Source
            // Check Profile Inventory (Vault)
            if (next.profileInventory?.data?.items) {
                removeItem(next.profileInventory.data.items);
            }

            // Check Character Inventories
            if (!foundItem && next.characterInventories?.data) {
                Object.values(next.characterInventories.data).forEach((data: any) => {
                    if (!foundItem) removeItem(data.items);
                });
            }

            // Check Character Equipment
            if (!foundItem && next.characterEquipment?.data) {
                Object.values(next.characterEquipment.data).forEach((data: any) => {
                    if (!foundItem) removeItem(data.items);
                });
            }

            // B. Add to Target
            if (foundItem) {
                // If moving to Vault
                if (isVault) {
                    if (!next.profileInventory.data.items) next.profileInventory.data.items = [];
                    // Ensure transferStatus is updated if needed (optional)
                    next.profileInventory.data.items.push(foundItem);
                }
                // If moving to Character
                else {
                    const charInv = next.characterInventories.data[targetOwnerId];
                    if (charInv) {
                        // When moving to character, we always move to INVENTORY (bucket), not equipment
                        // We rely on the definition bucket hash for display, so just pushing it here is enough 
                        // for the 'owner' derivation in useMemo to work.
                        charInv.items.push(foundItem);
                    }
                }
            }

            return next;
        });

        // 2. Background Sync
        try {
            // Find original owner for API call (we need it for the transfer request)
            // We can't rely on 'profile' here because we just mutated it or it might be stale in the closure?
            // Actually 'profile' in dependency array might be stale if we set state.
            // But we need the sourceId. 
            // We can find it from the item in the *current* profile before the optimistic update runs?
            // Actually, moveItem is called with sourceId usually. But here we don't pass it.
            // Wait, the previous implementation used `profile.items.find`.
            // We should probably capture sourceId BEFORE setting state.

            // ... Refetching item from profile *before* the setter runs
            const item = profile?.items.find(i => i.itemInstanceId === itemInstanceId);
            if (!item) {
                console.warn("Item not found for move, skipping API call");
                return;
            }

            const sourceId = item.owner;

            await TransferService.moveItem({
                itemInstanceId,
                itemHash,
                sourceId,
                targetId
            });

            // 3. Confirm with Server
            // We delay this slightly or just run it. 
            // If we run it immediately, it might race with the optimistic update rendering.
            // But React batches updates.
            refresh();
        } catch (err) {
            console.error('Failed to move item:', err);
            // Revert by forcefully refreshing (fetching true state)
            refresh();
        }
    }, [profile, refresh]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { profile, loading, error, refresh, updateItemMetadata, moveItem };
}
