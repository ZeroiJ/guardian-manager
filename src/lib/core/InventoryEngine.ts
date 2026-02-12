import { create } from 'zustand';
import { GuardianItem } from '../../services/profile/types';
import { TransferService } from '../../services/inventory/transferService';
import { APIClient } from '../../services/api/client';

interface InventoryState {
    characters: Record<string, any>;
    items: GuardianItem[];
    profile: any | null; // Raw Bungie Profile
    metadata: { tags: Record<string, string>, notes: Record<string, string> } | null;

    // Actions
    hydrate: (bungieProfile: any, metadata: any) => void;
    moveItem: (itemInstanceId: string, itemHash: number, targetOwnerId: string, isVault: boolean) => Promise<void>;
    updateMetadata: (itemInstanceId: string, type: 'tag' | 'note', value: string | null) => Promise<void>;
}

export const useInventoryEngine = create<InventoryState>((set, get) => ({
    characters: {},
    items: [],
    profile: null,
    metadata: null,

    hydrate: (bungieProfile, metadata) => {
        if (!bungieProfile || !metadata) return;

        console.log('[InventoryEngine] Hydrating...');

        // 1. Transform Characters
        const characters = bungieProfile.characters.data || {};

        // 2. Transform Items (The Zipper Logic)
        const rawItems: any[] = [];
        const instanceData = bungieProfile.itemComponents?.instances?.data || {};
        const statsData = bungieProfile.itemComponents?.stats?.data || {};
        const socketsData = bungieProfile.itemComponents?.sockets?.data || {};

        // Profile Inventory (Vault)
        if (bungieProfile.profileInventory?.data?.items) {
            const items = bungieProfile.profileInventory.data.items.map((i: any) => ({ ...i, isEquipped: false, owner: 'vault' }));
            rawItems.push(...items);
        }

        // Character Inventories
        Object.entries(bungieProfile.characterInventories?.data || {}).forEach(([charId, data]: [string, any]) => {
            const items = data.items.map((i: any) => ({ ...i, isEquipped: false, owner: charId }));
            rawItems.push(...items);
        });

        // Character Equipment
        Object.entries(bungieProfile.characterEquipment?.data || {}).forEach(([charId, data]: [string, any]) => {
            const items = data.items.map((i: any) => ({ ...i, isEquipped: true, owner: charId }));
            rawItems.push(...items);
        });

        // Zip It
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
                stats: stats?.stats || item.stats,
                sockets: sockets || undefined,
                owner: item.owner,
                userTag: tag || null,
                userNote: note || null
            };
        });

        set({ characters, items, profile: bungieProfile, metadata });
        console.log(`[InventoryEngine] Hydrated ${items.length} items`);
    },

    moveItem: async (itemInstanceId, itemHash, targetOwnerId, isVault) => {
        const targetId = isVault ? 'vault' : targetOwnerId;
        console.log(`[InventoryEngine] Moving ${itemInstanceId} to ${targetId}`);

        // 1. Optimistic Update (Instant)
        const currentItems = get().items;
        const itemIndex = currentItems.findIndex(i => i.itemInstanceId === itemInstanceId);

        if (itemIndex === -1) {
            console.warn(`[InventoryEngine] Item ${itemInstanceId} not found`);
            return;
        }

        const previousItems = [...currentItems]; // Snapshot for rollback
        const newItems = [...currentItems];

        // Update Owner
        newItems[itemIndex] = {
            ...newItems[itemIndex],
            owner: targetId,
            // If moving to vault, it's definitely unequipped.
            // If moving to char, we default to unequipped (in inventory).
            // Equip logic is separate.
            instanceData: {
                ...newItems[itemIndex].instanceData,
                isEquipped: false // Always unequip on move
            }
        };

        set({ items: newItems });

        // 2. API Call (Background)
        try {
            // Need membershipType for API
            const profile = get().profile;
            const membershipType = profile?.profile?.data?.userInfo?.membershipType || 3;
            const sourceId = previousItems[itemIndex].owner;

            await TransferService.moveItem({
                itemInstanceId,
                itemHash,
                sourceId: sourceId || 'unknown',
                targetId,
                membershipType
            });
            console.log(`[InventoryEngine] Move confirmed by API`);
        } catch (err) {
            console.error('[InventoryEngine] Move failed, reverting:', err);
            set({ items: previousItems }); // Rollback
        }
    },

    updateMetadata: async (itemInstanceId, type, value) => {
        const currentMeta = get().metadata;
        if (!currentMeta) return;

        // 1. Optimistic Update
        const newMeta = { ...currentMeta };
        const targetMap = type === 'tag' ? { ...currentMeta.tags } : { ...currentMeta.notes };

        if (value) targetMap[itemInstanceId] = value;
        else delete targetMap[itemInstanceId];

        if (type === 'tag') newMeta.tags = targetMap;
        else newMeta.notes = targetMap;

        // Also update the ITEM in the list so UI reflects immediately
        const currentItems = get().items;
        const itemIndex = currentItems.findIndex(i => i.itemInstanceId === itemInstanceId);

        if (itemIndex !== -1) {
            const newItems = [...currentItems];
            newItems[itemIndex] = {
                ...newItems[itemIndex],
                userTag: type === 'tag' ? value : newItems[itemIndex].userTag,
                userNote: type === 'note' ? value : newItems[itemIndex].userNote
            };
            set({ metadata: newMeta, items: newItems });
        } else {
            set({ metadata: newMeta });
        }

        // 2. API Call
        try {
            await APIClient.updateMetadata(itemInstanceId, type, value);
        } catch (err) {
            console.error('[InventoryEngine] Metadata sync failed:', err);
            // Revert logic could go here, but metadata is lower risk
        }
    }
}));
