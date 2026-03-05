import { create } from 'zustand';
import { GuardianItem } from '../services/profile/types';
import { TransferService } from '../services/inventory/transferService';
import { APIClient } from '../services/api/client';
import type { InGameLoadout } from '../lib/destiny/ingame-loadouts';
import { extractMintedTimestamp, isNewerTimestamp } from '../services/profile/profileCache';

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

/** Compare session state — mirrors DIM's session-based model. */
export interface CompareSession {
    /** Instance ID of the item user clicked "Compare" on. */
    initialItemId: string;
    /** Bucket hash — only items in the same bucket are shown. */
    bucketHash: number;
    /** Lowercase name filter (Adept/Timelost stripped). */
    nameFilter: string;
}

interface InventoryState {
    characters: Record<string, any>;
    items: GuardianItem[];
    profile: any | null; // Raw Bungie Profile
    metadata: { tags: Record<string, string>, notes: Record<string, string> } | null;
    manifest: Record<number, ManifestDefinition>;
    dupeInstanceIds: Set<string>;
    compareSession: CompareSession | null;
    /** In-game loadouts per character (Component 205), keyed by characterId. */
    inGameLoadouts: Record<string, InGameLoadout[]>;
    /**
     * Bungie's responseMintedTimestamp from the last successfully hydrated profile.
     * Used to skip reprocessing when poll returns identical data.
     */
    lastMintedTimestamp: string | null;
    /** Farming mode: auto-move engrams + consumables to vault. */
    farmingMode: { active: boolean; characterId: string | null };

    // Actions
    hydrate: (bungieProfile: any, metadata: any) => void;
    setManifest: (manifest: Record<number, ManifestDefinition>) => void;
    setInGameLoadouts: (loadouts: Record<string, InGameLoadout[]>) => void;
    moveItem: (itemInstanceId: string, itemHash: number, targetOwnerId: string, isVault: boolean) => Promise<void>;
    setLockState: (itemInstanceId: string, locked: boolean) => Promise<void>;
    pullFromPostmaster: (itemInstanceId: string, itemHash: number, characterId: string) => Promise<void>;
    pullAllFromPostmaster: (characterId: string) => Promise<{ success: number; failed: number }>;
    updateMetadata: (itemInstanceId: string, type: 'tag' | 'note', value: string | null) => Promise<void>;
    startCompare: (item: GuardianItem) => void;
    endCompare: () => void;
    toggleFarmingMode: (characterId?: string) => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
    characters: {},
    items: [],
    profile: null,
    metadata: null,
    manifest: {},
    dupeInstanceIds: new Set(),
    compareSession: null,
    inGameLoadouts: {},
    lastMintedTimestamp: null,
    farmingMode: { active: false, characterId: null },

    hydrate: (bungieProfile, metadata) => {
        if (!bungieProfile || !metadata) return;

        // Timestamp guard: skip reprocessing if this profile isn't newer
        const incomingTimestamp = extractMintedTimestamp(bungieProfile);
        const currentTimestamp = get().lastMintedTimestamp;
        if (currentTimestamp && incomingTimestamp && !isNewerTimestamp(incomingTimestamp, currentTimestamp)) {
            console.log(
                `[InventoryStore] Skipping hydration — profile not newer ` +
                `(${incomingTimestamp} <= ${currentTimestamp})`
            );
            return;
        }

        console.log('[InventoryStore] Hydrating...');

        // 1. Transform Characters
        const characters = bungieProfile.characters.data || {};

        // 2. Transform Items (The Zipper Logic)
        const rawItems: any[] = [];
        const instanceData = bungieProfile.itemComponents?.instances?.data || {};
        const statsData = bungieProfile.itemComponents?.stats?.data || {};
        const socketsData = bungieProfile.itemComponents?.sockets?.data || {};
        const objectivesData = bungieProfile.itemComponents?.objectives?.data || {};
        const reusablePlugsData = bungieProfile.itemComponents?.reusablePlugs?.data || {};
        // Component 302: per-plug objectives (kill trackers, crafted level, catalyst progress)
        const plugObjectivesData = bungieProfile.itemComponents?.plugObjectives?.data || {};

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
            const socketData = item.itemInstanceId ? socketsData[item.itemInstanceId] : undefined;
            const objectives = item.itemInstanceId ? objectivesData[item.itemInstanceId] : undefined;
            const reusablePlugs = item.itemInstanceId ? reusablePlugsData[item.itemInstanceId] : undefined;
            // Component 302: per-plug objectives keyed by plug hash
            const plugObjForItem = item.itemInstanceId ? plugObjectivesData[item.itemInstanceId] : undefined;
            const instanceId = item.itemInstanceId;

            const tag = instanceId ? (metadata.tags?.[instanceId]) : undefined;
            const note = instanceId ? (metadata.notes?.[instanceId]) : undefined;

            // Merge plugObjectives onto each socket so socket.plugObjectives is available
            // Component 302 shape: { objectivesPerPlug: { [plugHash]: Objective[] } }
            let hydratedSockets: any[] | undefined;
            if (socketData?.sockets) {
                const objPerPlug = plugObjForItem?.objectivesPerPlug;
                if (objPerPlug) {
                    hydratedSockets = socketData.sockets.map((s: any) => ({
                        ...s,
                        plugObjectives: s.plugHash ? (objPerPlug[s.plugHash] || undefined) : undefined,
                    }));
                } else {
                    hydratedSockets = socketData.sockets;
                }
            }

            return {
                ...item,
                instanceData: {
                    ...inst,
                    isEquipped: item.isEquipped
                },
                stats: stats?.stats || item.stats,
                sockets: hydratedSockets ? { sockets: hydratedSockets } : undefined,
                reusablePlugs: reusablePlugs?.plugs || undefined,
                objectives: objectives || undefined,
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

        set({ characters, items, profile: bungieProfile, metadata, dupeInstanceIds, lastMintedTimestamp: incomingTimestamp || null });
        console.log(`[InventoryStore] Hydrated ${items.length} items (minted: ${incomingTimestamp || 'unknown'})`);
    },

    setManifest: (manifest) => {
        set({ manifest });
    },

    setInGameLoadouts: (loadouts) => {
        set({ inGameLoadouts: loadouts });
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

    setLockState: async (itemInstanceId, locked) => {
        const currentItems = get().items;
        const itemIndex = currentItems.findIndex(i => i.itemInstanceId === itemInstanceId);
        if (itemIndex === -1) return;

        const item = currentItems[itemIndex];
        const previousItems = [...currentItems];

        // Optimistic update: toggle bit 0 of item.state
        const newItems = [...currentItems];
        newItems[itemIndex] = {
            ...item,
            state: locked ? (item.state | 1) : (item.state & ~1),
        };
        set({ items: newItems });

        try {
            const profile = get().profile;
            const membershipType = profile?.profile?.data?.userInfo?.membershipType || 3;
            // Lock API requires a real characterId (not 'vault')
            const characterId = item.owner === 'vault'
                ? Object.keys(get().characters)[0]
                : item.owner;

            await APIClient.setLockState(itemInstanceId, characterId, membershipType, locked);
            console.log(`[InventoryStore] Lock state set: ${itemInstanceId} → ${locked}`);
        } catch (err) {
            console.error('[InventoryStore] SetLockState failed, reverting:', err);
            set({ items: previousItems });
        }
    },

    pullFromPostmaster: async (itemInstanceId, itemHash, characterId) => {
        const currentItems = get().items;
        const itemIndex = currentItems.findIndex(i => i.itemInstanceId === itemInstanceId);
        if (itemIndex === -1) return;

        const previousItems = [...currentItems];
        const newItems = [...currentItems];

        // Optimistic: move from postmaster (bucket 215593132) to character inventory
        const def = get().manifest[itemHash];
        const trueBucket = def?.inventory?.bucketTypeHash || 215593132;
        newItems[itemIndex] = {
            ...newItems[itemIndex],
            bucketHash: trueBucket,
            instanceData: { ...newItems[itemIndex].instanceData, isEquipped: false },
        };
        set({ items: newItems });

        try {
            const profile = get().profile;
            const membershipType = profile?.profile?.data?.userInfo?.membershipType || 3;
            await APIClient.pullFromPostmaster(itemHash, itemInstanceId, characterId, membershipType);
            console.log(`[InventoryStore] Pulled from postmaster: ${itemInstanceId}`);
        } catch (err) {
            console.error('[InventoryStore] PullFromPostmaster failed, reverting:', err);
            set({ items: previousItems });
        }
    },

    pullAllFromPostmaster: async (characterId) => {
        const items = get().items;
        const postmasterItems = items.filter(
            i => i.bucketHash === 215593132 && i.owner === characterId && i.itemInstanceId
        );

        let success = 0;
        let failed = 0;

        for (const item of postmasterItems) {
            try {
                await get().pullFromPostmaster(item.itemInstanceId!, item.itemHash, characterId);
                success++;
            } catch {
                failed++;
            }
        }

        return { success, failed };
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
    },

    /**
     * Start a compare session. Auto-derives bucket + name filter from the item.
     * Ported from DIM: src/app/compare/reducer.ts (addCompareItem)
     */
    startCompare: (item) => {
        if (!item.itemInstanceId) return;
        const manifest = get().manifest;
        const def = manifest[item.itemHash];
        const name = def?.displayProperties?.name || '';
        // Strip (Adept) / (Timelost) / (Harrowed) suffixes for broader matching
        const nameFilter = name
            .replace(/\s*\((Adept|Timelost|Harrowed)\)/gi, '')
            .trim()
            .toLowerCase();
        const bucketHash = item.bucketHash || def?.inventory?.bucketTypeHash || 0;

        set({
            compareSession: {
                initialItemId: item.itemInstanceId,
                bucketHash,
                nameFilter,
            },
        });
    },

    /** End the compare session (close the sheet). */
    endCompare: () => {
        set({ compareSession: null });
    },

    /**
     * Toggle farming mode on/off for a character.
     * When toggled ON, characterId is required.
     * When toggled OFF (or toggled with no arg while active), it deactivates.
     */
    toggleFarmingMode: (characterId?: string) => {
        const current = get().farmingMode;
        if (current.active) {
            // Turn off
            set({ farmingMode: { active: false, characterId: null } });
            console.log('[InventoryStore] Farming mode OFF');
        } else if (characterId) {
            // Turn on
            set({ farmingMode: { active: true, characterId } });
            console.log(`[InventoryStore] Farming mode ON for character ${characterId}`);
        }
    },
}));
