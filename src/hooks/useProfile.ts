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
        console.log(`[Optimistic Move] Moving ${itemInstanceId} to ${targetId}`);

        // 1. Optimistic Update
        setBungieProfile((prev: any) => {
            if (!prev) return prev;

            // Deep clone to ensure React detects the change
            const nextProfile = JSON.parse(JSON.stringify(prev));
            let foundItem: any = null;

            // 2. REMOVE from Source (Scan all characters and vault)
            // Check Character Inventories
            if (nextProfile.characterInventories?.data) {
                for (const charId in nextProfile.characterInventories.data) {
                    const inventory = nextProfile.characterInventories.data[charId].items;
                    const idx = inventory.findIndex((i: any) => i.itemInstanceId === itemInstanceId);
                    if (idx !== -1) {
                        foundItem = inventory[idx]; // Copy item ref
                        inventory.splice(idx, 1); // Remove
                        console.log(`[Optimistic Move] Removed from Character ${charId} inventory`);
                        break;
                    }
                }
            }

            // Check Character Equipment
            if (!foundItem && nextProfile.characterEquipment?.data) {
                for (const charId in nextProfile.characterEquipment.data) {
                    const equipment = nextProfile.characterEquipment.data[charId].items;
                    const idx = equipment.findIndex((i: any) => i.itemInstanceId === itemInstanceId);
                    if (idx !== -1) {
                        foundItem = equipment[idx];
                        equipment.splice(idx, 1);
                        console.log(`[Optimistic Move] Removed from Character ${charId} equipment`);
                        break;
                    }
                }
            }

            // Check Vault (profileInventory) if not found yet
            if (!foundItem && nextProfile.profileInventory?.data?.items) {
                const inventory = nextProfile.profileInventory.data.items;
                const idx = inventory.findIndex((i: any) => i.itemInstanceId === itemInstanceId);
                if (idx !== -1) {
                    foundItem = inventory[idx];
                    inventory.splice(idx, 1);
                    console.log(`[Optimistic Move] Removed from Vault`);
                }
            }

            // 3. ADD to Target
            if (foundItem) {
                // If target is Vault
                if (isVault) {
                    if (!nextProfile.profileInventory.data.items) nextProfile.profileInventory.data.items = [];
                    nextProfile.profileInventory.data.items.push(foundItem);
                    console.log(`[Optimistic Move] Success: Moved to Vault`);
                } else {
                    // Target is a Character
                    // Always Add to INVENTORY bucket (not equipment)
                    if (!nextProfile.characterInventories.data[targetOwnerId]) {
                        console.error(`[Optimistic Error] Character ${targetOwnerId} not found`);
                        return prev; // Abort
                    }
                    nextProfile.characterInventories.data[targetOwnerId].items.push(foundItem);
                    console.log(`[Optimistic Move] Success: Moved to Character ${targetOwnerId}`);
                }

                return nextProfile;
            }

            console.warn(`[Optimistic Move] Item ${itemInstanceId} not found in source.`);
            return prev;
        });

        // 4. TRIGGER API (Keep your existing API call logic here)
        try {
            // Find original owner for API call (we need it for the transfer request)
            const item = profile?.items.find(i => i.itemInstanceId === itemInstanceId);

            // Fallback for sourceId if not found in profile (optimistic update race condition)
            // We can assume strict move flow, but API needs valid source.

            const sourceId = item?.owner;
            if (!sourceId) {
                console.warn("[Optimistic Move] Could not determine source ID for API call");
            }

            await TransferService.moveItem({
                itemInstanceId,
                itemHash,
                sourceId: sourceId || 'unknown',
                targetId
            });

            // 3. Confirm with Server
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
