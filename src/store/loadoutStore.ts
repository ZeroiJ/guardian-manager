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

interface LoadoutState {
    /** All saved loadouts, newest first. */
    loadouts: ILoadout[];

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
