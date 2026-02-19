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
    /** Optional user notes. */
    notes?: string;
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
                const loadoutItems: ILoadoutItem[] = equippedItems.map((item) => {
                    const def = manifest[item.itemHash];
                    return {
                        itemInstanceId: item.itemInstanceId!, // asserted non-null by filter above
                        itemHash: item.itemHash,
                        bucketHash:
                            item.bucketHash ||
                            (def?.inventory as any)?.bucketTypeHash ||
                            0,
                        label: def?.displayProperties?.name,
                        power: item.instanceData?.primaryStat?.value,
                    };
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
                };

                set((state) => ({
                    // Prepend — newest loadouts appear at the top of the list.
                    loadouts: [newLoadout, ...state.loadouts],
                }));

                console.log(
                    `[LoadoutStore] Snapshot saved: "${newLoadout.name}" ` +
                    `(${loadoutItems.length} items, char ${characterId})`
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
            version: 1,
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
