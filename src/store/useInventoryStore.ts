import { create } from 'zustand';
import { GuardianItem } from '../services/profile/types';
import { TransferService } from '../services/inventory/transferService';
import { APIClient } from '../services/api/client';

// Subset of manifest data (names, icons, tierType)
export interface ManifestDefinition {
    displayProperties: {
        name: string;
        icon: string;
        [key: string]: any;
    };
    inventory?: {
        tierType: number;
        [key: string]: any;
    };
    [key: string]: any;
}

interface InventoryState {
    characters: Record<string, any>;
    items: GuardianItem[];
    profile: any | null; // Raw Bungie Profile
    metadata: { tags: Record<string, string>, notes: Record<string, string> } | null;
    manifest: Record<number, ManifestDefinition>;
    dupeInstanceIds: Set<string>;

    // Actions
    hydrate: (bungieProfile: any, metadata: any) => void;
    setManifest: (manifest: Record<number, ManifestDefinition>) => void;
    moveItem: (itemInstanceId: string, itemHash: number, targetOwnerId: string, isVault: boolean) => Promise<void>;
    updateMetadata: (itemInstanceId: string, type: 'tag' | 'note', value: string | null) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
    characters: {},
    items: [],
    profile: null,
    metadata: null,
    manifest: {},
    dupeInstanceIds: new Set(),

    hydrate: (bungieProfile, metadata) => {
        if (!bungieProfile || !metadata) return;

        console.log('[InventoryStore] Hydrating...');

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

        // Calculate Duplicates (Optimized Set)
        const dupeInstanceIds = new Set<string>();
        const hashCounts: Record<number, string[]> = {};
        
        for (const item of items) {
            if (!item.itemHash || !item.itemInstanceId) continue;
            if (!hashCounts[item.itemHash]) hashCounts[item.itemHash] = [];
            hashCounts[item.itemHash].push(item.itemInstanceId);
        }

        for (const ids of Object.values(hashCounts)) {
            if (ids.length > 1) {
                ids.forEach(id => dupeInstanceIds.add(id));
            }
        }

        set({ characters, items, profile: bungieProfile, metadata, dupeInstanceIds });
        console.log(`[InventoryStore] Hydrated ${items.length} items`);
    },

    setManifest: (manifest) => {
        set({ manifest });
    },

    moveItem: async (itemInstanceId, itemHash, targetOwnerId, isVault) => {
        const targetId = isVault ? 'vault' : targetOwnerId;
        const itemName = get().manifest[itemHash]?.displayProperties?.name || 'Item';
        console.log(`[InventoryStore] Moving ${itemName} (${itemInstanceId}) to ${targetId}`);

        // 1. Optimistic Update (Instant)
        const currentItems = get().items;
        const itemIndex = currentItems.findIndex(i => i.itemInstanceId === itemInstanceId);

        if (itemIndex === -1) {
            console.warn(`[InventoryStore] Item ${itemInstanceId} not found`);
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
            console.log(`[InventoryStore] Move confirmed by API`);
        } catch (err) {
            console.error('[InventoryStore] Move failed, reverting:', err);

            // 3. Rollback
            set({ items: previousItems });

            // TODO: Toast Notification
            // toast.error(`Failed to move ${itemName}: ${err.message}`);
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
            console.error('[InventoryStore] Metadata sync failed:', err);
            // Revert logic could go here, but metadata is lower risk
        }
    }
}));
