/**
 * Loadout Store — Phase 5: The "Snapshot" Engine
 *
 * Saves a snapshot of a character's currently equipped items.
 * Persisted to localStorage via Zustand `persist` middleware.
 *
 * Architecture inspired by DIM: src/app/loadout/loadout-types.ts
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useInventoryStore } from './useInventoryStore';
import { BucketHashes, EMPTY_PLUG_HASHES, SocketCategoryHashes } from '@/lib/destiny-constants';

// ============================================================================
// TYPES
// ============================================================================

/**
 * A single item captured in a loadout snapshot.
 * Stores only the minimum data needed to identify and re-equip the item.
 */
export interface ILoadoutItem {
    /** The unique instance ID of this specific item copy. Required for equip API. */
    itemInstanceId: string;
    /** The item definition hash. Used to look up name/icon from manifest. */
    itemHash: number;
    /** The inventory bucket this item occupies (Kinetic, Helmet, etc.). */
    bucketHash: number;
    /** Human-readable label cached from manifest at snapshot time. Cosmetic only. */
    label?: string;
    /** Power level at time of snapshot. Cosmetic only. */
    power?: number;
    /**
     * Socket overrides: socketIndex -> plugItemHash.
     * Used for subclass configuration (Aspects, Fragments, Super, Abilities)
     * and cosmetic overrides (Ornaments, Shaders).
     * Ported from DIM: dim-api-types/loadouts.ts -> LoadoutItem.socketOverrides
     */
    socketOverrides?: Record<number, number>;
}

/**
 * A full loadout snapshot for one character.
 */
export interface ILoadout {
    /** Unique identifier for this loadout (UUID). */
    id: string;
    /** User-facing name of the loadout. */
    name: string;
    /** The Bungie characterId this loadout was snapshotted from. */
    characterId: string;
    /** 0=Titan, 1=Hunter, 2=Warlock. -1 if unknown. */
    characterClass: number;
    /** All equipped items at snapshot time. */
    items: ILoadoutItem[];
    /** Unix timestamp (ms) when this loadout was first created. */
    createdAt: number;
    /** Unix timestamp (ms) of the last modification. */
    updatedAt: number;
    /** Optional user notes describing the loadout purpose. */
    notes?: string;
    /**
     * Mod hashes grouped by armor bucket hash.
     * e.g. { 3448274439: [modHash1, modHash2], ... }
     * Ported from DIM: app/loadout/loadout-types.ts -> Loadout.parameters.modsByBucket
     */
    modsByBucket?: Record<number, number[]>;
}

// ============================================================================
// SOCKET CAPTURE HELPERS
// ============================================================================

/** Bucket hashes for armor pieces that can have mods. */
const ARMOR_MOD_BUCKETS = new Set([
    BucketHashes.Helmet,
    BucketHashes.Gauntlets,
    BucketHashes.ChestArmor,
    BucketHashes.LegArmor,
    BucketHashes.ClassArmor,
]);

/**
 * Capture socket overrides from a subclass item's live socket data.
 * Saves every non-empty plug (Super, Abilities, Aspects, Fragments).
 *
 * Ported from DIM: app/loadout-drawer/loadout-utils.ts -> createSocketOverridesFromEquipped
 */
function captureSubclassSocketOverrides(
    item: { sockets?: { sockets: Array<{ plugHash?: number; isEnabled?: boolean; isVisible?: boolean }> } }
): Record<number, number> | undefined {
    if (!item.sockets?.sockets) return undefined;

    const overrides: Record<number, number> = {};
    for (let i = 0; i < item.sockets.sockets.length; i++) {
        const socket = item.sockets.sockets[i];
        const plugHash = socket.plugHash;
        // Save every non-empty, enabled plug
        if (plugHash && !EMPTY_PLUG_HASHES.has(plugHash)) {
            overrides[i] = plugHash;
        }
    }

    return Object.keys(overrides).length > 0 ? overrides : undefined;
}

/**
 * Extract mod plug hashes from an armor item's sockets.
 * Filters to only "Modification" type sockets (ArmorMods category).
 *
 * Ported from DIM: app/loadout/loadout-types.ts -> modsByBucket concept
 */
function captureArmorMods(
    item: { sockets?: { sockets: Array<{ plugHash?: number; isEnabled?: boolean; isVisible?: boolean }> } },
    definition: any
): number[] {
    if (!item.sockets?.sockets || !definition?.sockets?.socketCategories) return [];

    // Find socket indices that belong to armor mod categories
    const modSocketIndices = new Set<number>();
    for (const cat of definition.sockets.socketCategories) {
        if (
            cat.socketCategoryHash === SocketCategoryHashes.ArmorMods ||
            cat.socketCategoryHash === SocketCategoryHashes.ArmorPerks_Reusable
        ) {
            for (const idx of cat.socketIndexes) {
                modSocketIndices.add(idx);
            }
        }
    }

    const mods: number[] = [];
    for (const idx of modSocketIndices) {
        const socket = item.sockets.sockets[idx];
        if (socket?.plugHash && !EMPTY_PLUG_HASHES.has(socket.plugHash)) {
            mods.push(socket.plugHash);
        }
    }

    return mods;
}

/**
 * Capture cosmetic socket overrides (Ornaments + Shaders) from a weapon or armor item.
 * Uses the same socketOverrides format as subclass to avoid duplicate fields.
 *
 * Ported from DIM: app/loadout-drawer/loadout-item-conversion.ts
 */
function captureFashionOverrides(
    item: { sockets?: { sockets: Array<{ plugHash?: number; isEnabled?: boolean; isVisible?: boolean }> } },
    definition: any
): Record<number, number> | undefined {
    if (!item.sockets?.sockets || !definition?.sockets?.socketCategories) return undefined;

    // Find socket indices belonging to cosmetic categories
    const cosmeticIndices = new Set<number>();
    for (const cat of definition.sockets.socketCategories) {
        if (
            cat.socketCategoryHash === SocketCategoryHashes.ArmorCosmetics ||
            cat.socketCategoryHash === SocketCategoryHashes.WeaponCosmetics
        ) {
            for (const idx of cat.socketIndexes) {
                cosmeticIndices.add(idx);
            }
        }
    }

    const overrides: Record<number, number> = {};
    for (const idx of cosmeticIndices) {
        const socket = item.sockets.sockets[idx];
        if (socket?.plugHash && !EMPTY_PLUG_HASHES.has(socket.plugHash)) {
            overrides[idx] = socket.plugHash;
        }
    }

    return Object.keys(overrides).length > 0 ? overrides : undefined;
}

// ============================================================================
// STORE STATE & ACTIONS
// ============================================================================

/**
 * Predicted stat tiers for a loadout.
 * Each entry maps a stat name → its predicted tier (value / 10, floored).
 */
export interface LoadoutStatTiers {
    /** Individual stat values (raw totals from armor pieces) */
    stats: Record<string, number>;
    /** Individual stat tiers (stat / 10, floored, capped at 10) */
    tiers: Record<string, number>;
    /** Sum of all tiers (e.g. "T32") */
    totalTier: number;
}

interface LoadoutState {
    /** All saved loadouts, newest first. */
    loadouts: ILoadout[];

    /** Currently selected/expanded loadout on the Loadouts page. Null = none. */
    selectedLoadoutId: string | null;

    /**
     * Set the selected loadout ID (for the full Loadouts page).
     */
    setSelectedLoadout: (id: string | null) => void;

    /**
     * Snapshot the currently equipped items for a character and save as a new loadout.
     * Reads equipped items headlessly from useInventoryStore (no hook, just getState).
     *
     * @param characterId - Bungie characterId to snapshot
     * @param name        - User-provided name for this loadout
     * @returns The newly created loadout, or null if nothing was equipped.
     */
    saveCurrentLoadout: (characterId: string, name: string) => ILoadout | null;

    /**
     * Permanently remove a loadout by ID.
     */
    deleteLoadout: (id: string) => void;

    /**
     * Rename an existing loadout.
     */
    renameLoadout: (id: string, name: string) => void;

    /**
     * Update the notes field of a loadout.
     */
    updateNotes: (id: string, notes: string) => void;

    /**
     * Replace all items in a loadout (for a future "re-snapshot" / edit flow).
     */
    updateItems: (id: string, items: ILoadoutItem[]) => void;
}

// ============================================================================
// STORE
// ============================================================================

export const useLoadoutStore = create<LoadoutState>()(
    persist(
        (set, get) => ({
            loadouts: [],
            selectedLoadoutId: null,

            // ----------------------------------------------------------------
            // setSelectedLoadout
            // ----------------------------------------------------------------
            setSelectedLoadout: (id) => {
                set({ selectedLoadoutId: id });
            },

            // ----------------------------------------------------------------
            // saveCurrentLoadout
            // ----------------------------------------------------------------
            saveCurrentLoadout: (characterId, name) => {
                // Read from the inventory store HEADLESSLY (no React hook context needed).
                // This is the canonical Zustand pattern for cross-store reads.
                const { items, manifest, characters } = useInventoryStore.getState();

                // 1. Collect all items that are currently equipped on this character.
                const equippedItems = items.filter(
                    (item) =>
                        item.owner === characterId &&
                        item.instanceData?.isEquipped === true &&
                        item.itemInstanceId != null // Must be instanced to be equippable
                );

                if (equippedItems.length === 0) {
                    console.warn(
                        `[LoadoutStore] No equipped items found for character ${characterId}. ` +
                        `Is the profile loaded?`
                    );
                    return null;
                }

                // 2. Map raw GuardianItems → strict ILoadoutItem shape.
                //    Capture socket overrides for subclass + cosmetics, and mods for armor.
                const modsByBucket: Record<number, number[]> = {};
                const loadoutItems: ILoadoutItem[] = equippedItems.map((item) => {
                    const def = manifest[item.itemHash];
                    const bucketHash =
                        item.bucketHash ||
                        (def?.inventory as any)?.bucketTypeHash ||
                        0;

                    const loadoutItem: ILoadoutItem = {
                        itemInstanceId: item.itemInstanceId!, // asserted non-null by filter above
                        itemHash: item.itemHash,
                        bucketHash,
                        label: def?.displayProperties?.name,
                        power: item.instanceData?.primaryStat?.value,
                    };

                    // Capture subclass socket overrides (Aspects, Fragments, Super, Abilities)
                    if (bucketHash === BucketHashes.Subclass) {
                        const overrides = captureSubclassSocketOverrides(item);
                        if (overrides) {
                            loadoutItem.socketOverrides = overrides;
                        }
                    }

                    // Capture armor mods
                    if (ARMOR_MOD_BUCKETS.has(bucketHash) && def) {
                        const mods = captureArmorMods(item, def);
                        if (mods.length > 0) {
                            modsByBucket[bucketHash] = mods;
                        }
                    }

                    // Capture fashion overrides (Ornaments + Shaders) for weapons and armor
                    if (bucketHash !== BucketHashes.Subclass && def) {
                        const fashionOverrides = captureFashionOverrides(item, def);
                        if (fashionOverrides) {
                            loadoutItem.socketOverrides = {
                                ...loadoutItem.socketOverrides,
                                ...fashionOverrides,
                            };
                        }
                    }

                    return loadoutItem;
                });

                // 3. Resolve the character class type from the characters map.
                const character = characters[characterId];
                const characterClass: number =
                    character?.classType !== undefined ? (character.classType as number) : -1;

                // 4. Sanitize and default the name.
                const safeName = name.trim() || `Loadout ${get().loadouts.length + 1}`;

                // 5. Assemble the loadout snapshot.
                const newLoadout: ILoadout = {
                    id: crypto.randomUUID(),
                    name: safeName,
                    characterId,
                    characterClass,
                    items: loadoutItems,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    modsByBucket: Object.keys(modsByBucket).length > 0 ? modsByBucket : undefined,
                };

                set((state) => ({
                    // Prepend — newest loadouts appear at the top of the list.
                    loadouts: [newLoadout, ...state.loadouts],
                }));

                const fashionCount = loadoutItems.filter(i => i.socketOverrides && i.bucketHash !== BucketHashes.Subclass).length;
                console.log(
                    `[LoadoutStore] Snapshot saved: "${newLoadout.name}" ` +
                    `(${loadoutItems.length} items, char ${characterId})` +
                    (newLoadout.modsByBucket ? `, mods: ${Object.values(newLoadout.modsByBucket).flat().length}` : '') +
                    (fashionCount > 0 ? `, fashion: ${fashionCount} items` : '')
                );

                return newLoadout;
            },

            // ----------------------------------------------------------------
            // deleteLoadout
            // ----------------------------------------------------------------
            deleteLoadout: (id) => {
                set((state) => ({
                    loadouts: state.loadouts.filter((l) => l.id !== id),
                }));
                console.log(`[LoadoutStore] Deleted loadout ${id}`);
            },

            // ----------------------------------------------------------------
            // renameLoadout
            // ----------------------------------------------------------------
            renameLoadout: (id, name) => {
                const trimmed = name.trim();
                if (!trimmed) return;
                set((state) => ({
                    loadouts: state.loadouts.map((l) =>
                        l.id === id ? { ...l, name: trimmed, updatedAt: Date.now() } : l
                    ),
                }));
            },

            // ----------------------------------------------------------------
            // updateNotes
            // ----------------------------------------------------------------
            updateNotes: (id, notes) => {
                set((state) => ({
                    loadouts: state.loadouts.map((l) =>
                        l.id === id ? { ...l, notes, updatedAt: Date.now() } : l
                    ),
                }));
            },

            // ----------------------------------------------------------------
            // updateItems
            // ----------------------------------------------------------------
            updateItems: (id, items) => {
                set((state) => ({
                    loadouts: state.loadouts.map((l) =>
                        l.id === id ? { ...l, items, updatedAt: Date.now() } : l
                    ),
                }));
            },
        }),
        {
            name: 'guardian-nexus-loadouts', // localStorage key
            version: 2,
            // Migrate from v1 (no socketOverrides/modsByBucket) to v2
            migrate: (persisted: any, version: number) => {
                if (version < 2) {
                    // Old loadouts: items have no socketOverrides, loadout has no modsByBucket.
                    // No data to add — just ensure the shape is valid.
                    const state = persisted as Partial<LoadoutState>;
                    return {
                        ...state,
                        loadouts: (state.loadouts || []).map((l: any) => ({
                            ...l,
                            modsByBucket: l.modsByBucket || undefined,
                            items: (l.items || []).map((i: any) => ({
                                ...i,
                                socketOverrides: i.socketOverrides || undefined,
                            })),
                        })),
                    };
                }
                return persisted as LoadoutState;
            },
            // Merge strategy: on version mismatch, keep any valid loadouts
            // and discard unknown fields gracefully.
            merge: (persisted, current) => {
                const p = persisted as Partial<LoadoutState>;
                return {
                    ...current,
                    loadouts: Array.isArray(p.loadouts) ? p.loadouts : [],
                };
            },
        }
    )
);

// ============================================================================
// SELECTORS (Pure functions — no re-render coupling)
// ============================================================================

/** Returns all loadouts for a specific character. */
export const selectLoadoutsForCharacter = (
    loadouts: ILoadout[],
    characterId: string
): ILoadout[] => loadouts.filter((l) => l.characterId === characterId);

/** Returns loadouts grouped by character class. */
export const selectLoadoutsGroupedByClass = (
    loadouts: ILoadout[]
): Record<number, ILoadout[]> => {
    const grouped: Record<number, ILoadout[]> = {};
    for (const loadout of loadouts) {
        const cls = loadout.characterClass;
        if (!grouped[cls]) grouped[cls] = [];
        grouped[cls].push(loadout);
    }
    return grouped;
};

/** Class name lookup — mirrors DIM convention. */
export const CLASS_NAMES: Record<number, string> = {
    0: 'Titan',
    1: 'Hunter',
    2: 'Warlock',
};

// ============================================================================
// VALIDATION — Pre-equip checks
// ============================================================================

import type { ItemValidation, LoadoutValidation } from '@/components/loadouts/LoadoutCard';
import type { GuardianItem } from '@/services/profile/types';

/**
 * Validates a loadout against the current inventory state.
 * Checks whether each item exists, is on the target character, or needs transfer.
 *
 * Ported from DIM: app/loadout-drawer/loadout-utils.ts -> getUnequippableItems
 *
 * @param loadout        The loadout to validate
 * @param allItems       All items from the inventory store
 * @param targetCharId   The character to validate against (defaults to loadout's character)
 */
export function validateLoadout(
    loadout: ILoadout,
    allItems: GuardianItem[],
    targetCharId?: string
): LoadoutValidation {
    const charId = targetCharId || loadout.characterId;
    const items: Record<string, ItemValidation> = {};

    for (const loadoutItem of loadout.items) {
        const liveItem = allItems.find(
            (i) => i.itemInstanceId === loadoutItem.itemInstanceId
        );

        if (!liveItem) {
            // Item not found — may have been deleted or dismantled
            items[loadoutItem.itemInstanceId] = { status: 'missing' };
        } else if (liveItem.owner !== charId) {
            // Item exists but on another character or in the vault
            items[loadoutItem.itemInstanceId] = {
                status: 'remote',
                owner: liveItem.owner,
            };
        } else {
            items[loadoutItem.itemInstanceId] = { status: 'ok' };
        }
    }

    // Check class mismatch
    const classMismatch =
        loadout.characterClass >= 0 &&
        (() => {
            // Find the target character's class from inventory store
            const { characters } = useInventoryStore.getState();
            const targetChar = characters[charId];
            return targetChar != null && targetChar.classType !== loadout.characterClass;
        })();

    return { items, classMismatch };
}

/** Returns a formatted date string for a loadout timestamp. */
export const formatLoadoutDate = (timestamp: number): string => {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(timestamp));
};

// ============================================================================
// STAT CALCULATOR — Predicted tiers from loadout armor
// ============================================================================

import { STAT_HASHES } from '@/data/constants';

/** Armor bucket hashes — only these contribute to character stats. */
const ARMOR_BUCKET_HASHES = new Set([
    3448274439, // Helmet
    3551918588, // Gauntlets
    14239492,   // Chest
    20886954,   // Legs
    1585787867, // Class Item
]);

/** The six armor stat hashes in display order. */
const ARMOR_STAT_HASHES: Array<{ hash: number; name: string }> = [
    { hash: STAT_HASHES.Mobility, name: 'Mobility' },
    { hash: STAT_HASHES.Resilience, name: 'Resilience' },
    { hash: STAT_HASHES.Recovery, name: 'Recovery' },
    { hash: STAT_HASHES.Discipline, name: 'Discipline' },
    { hash: STAT_HASHES.Intellect, name: 'Intellect' },
    { hash: STAT_HASHES.Strength, name: 'Strength' },
];

/**
 * Calculates predicted stat tiers for a loadout based on its armor items.
 * Reads stat data from the current inventory store's items (by instanceId match).
 *
 * This is a "predicted" calculation — it sums the base stats from each armor piece
 * and computes tier values. Subclass fragments, mods, and seasonal bonuses are
 * not yet factored in (deferred to a future mod-aware loadout system).
 *
 * @param loadout - The loadout to calculate stats for.
 * @returns LoadoutStatTiers with per-stat values, tiers, and totalTier.
 */
export function calculateStats(loadout: ILoadout): LoadoutStatTiers {
    const { items: allItems } = useInventoryStore.getState();

    // Initialize stat accumulators
    const stats: Record<string, number> = {};
    const tiers: Record<string, number> = {};
    for (const { name } of ARMOR_STAT_HASHES) {
        stats[name] = 0;
        tiers[name] = 0;
    }

    // Filter to armor items only
    const armorItems = loadout.items.filter((li) =>
        ARMOR_BUCKET_HASHES.has(li.bucketHash)
    );

    for (const loadoutItem of armorItems) {
        // Find the live inventory item by instanceId to get its stats
        const liveItem = allItems.find(
            (item) => item.itemInstanceId === loadoutItem.itemInstanceId
        );
        if (!liveItem?.stats) continue;

        // Sum each armor stat
        for (const { hash, name } of ARMOR_STAT_HASHES) {
            const statEntry = liveItem.stats[hash] || liveItem.stats[String(hash)];
            if (statEntry) {
                stats[name] += statEntry.value;
            }
        }
    }

    // Compute tiers (floor(value / 10), capped at 10)
    let totalTier = 0;
    for (const { name } of ARMOR_STAT_HASHES) {
        const tier = Math.min(10, Math.floor(stats[name] / 10));
        tiers[name] = tier;
        totalTier += tier;
    }

    return { stats, tiers, totalTier };
}
