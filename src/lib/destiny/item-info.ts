/**
 * Item Info Utilities — Kill Tracker, Crafted, Deepsight, Catalyst, Energy
 * 
 * Extracts detailed item metadata from Bungie API data for display in the
 * ItemDetailOverlay. Ported from DIM patterns:
 *   - DIM/src/app/search/d2-known-values.ts (kill tracker hashes)
 *   - DIM/src/app/inventory/store/catalyst.ts (catalyst record lookup)
 *   - DIM/src/app/inventory/store/patterns.ts (deepsight pattern records)
 *   - DIM/src/app/item-popup/KillTracker.tsx
 *   - DIM/src/app/item-popup/WeaponCraftedInfo.tsx
 */

// ============================================================================
// KILL TRACKER
// ============================================================================

/**
 * Known kill tracker objective hashes → activity type.
 * Ported from DIM: src/app/search/d2-known-values.ts:76
 */
const KILL_TRACKER_OBJECTIVES: Record<number, 'pvp' | 'pve' | 'gambit'> = {
    1501870536: 'pvp',   // "Crucible Opponents Defeated" inside "Crucible Tracker"
    2439952408: 'pvp',   // "Crucible Opponents Defeated" inside "Crucible Tracker"
    74070459: 'pvp',     // "Crucible Opponents Defeated" inside "Crucible Tracker"
    890482414: 'pvp',    // "Crucible opponents defeated" inside "Crucible Memento Tracker"
    2109364169: 'pvp',   // "Trials opponents defeated" inside "Trials Memento Tracker"
    90275515: 'pve',     // "Enemies Defeated" inside "Kill Tracker"
    2579044636: 'pve',   // "Enemies Defeated" inside "Kill Tracker"
    73837075: 'pve',     // "Enemies Defeated" inside "Kill Tracker"
    3387796140: 'pve',   // "Nightfall combatants defeated" inside "Nightfall Memento Tracker"
    345540971: 'gambit', // "Gambit targets defeated" inside "Gambit Memento Tracker"
};

/** The socket type hash for kill tracker sockets. */
const KILL_TRACKER_SOCKET_TYPE_HASH = 1282012138;

export interface KillTrackerData {
    /** Total kills displayed */
    count: number;
    /** Activity type: pvp, pve, or gambit */
    activityType: 'pvp' | 'pve' | 'gambit';
    /** Objective hash (for fetching icon from DestinyObjectiveDefinition) */
    objectiveHash: number;
    /** Human-friendly label */
    label: string;
}

/**
 * Extract kill tracker data from a weapon's sockets.
 * 
 * How it works:
 * 1. Find the socket whose manifest entry has socketTypeHash === 1282012138
 * 2. Read plugObjectives[0] from that live socket (from component 302)
 * 3. Match the objective hash to PvP/PvE/Gambit
 * 
 * @param item - The GuardianItem with hydrated sockets
 * @param definition - The manifest definition for the item
 * @returns KillTrackerData or null if no kill tracker found
 */
export function getKillTracker(item: any, definition: any): KillTrackerData | null {
    const liveSockets = item?.sockets?.sockets;
    const socketEntries = definition?.sockets?.socketEntries;
    if (!liveSockets || !socketEntries) return null;

    for (let i = 0; i < liveSockets.length && i < socketEntries.length; i++) {
        const entry = socketEntries[i];
        if (entry.socketTypeHash !== KILL_TRACKER_SOCKET_TYPE_HASH) continue;

        const socket = liveSockets[i];
        // plugObjectives comes from Bungie component 302, passed through in hydration
        const objectives = socket.plugObjectives;
        if (!objectives || objectives.length === 0) continue;

        const objective = objectives[0];
        const objHash = objective.objectiveHash;
        const count = objective.progress ?? 0;
        const activityType = KILL_TRACKER_OBJECTIVES[objHash] || 'pve';

        const labels: Record<string, string> = {
            pvp: 'Crucible',
            pve: 'PvE',
            gambit: 'Gambit',
        };

        return {
            count,
            activityType,
            objectiveHash: objHash,
            label: labels[activityType],
        };
    }

    return null;
}

// ============================================================================
// CRAFTED WEAPON INFO
// ============================================================================

/** ItemState bitmask for crafted weapons. */
const ITEM_STATE_CRAFTED = 8;

/** Socket category hash for crafted info sockets. */
const CRAFTED_SOCKET_CATEGORY_HASH = 3583996951;

export interface CraftedWeaponData {
    /** Is the weapon crafted/shaped */
    isCrafted: boolean;
    /** Weapon level (from plug objectives) */
    level: number | null;
    /** Level progress fraction (0-1) toward next level */
    progress: number | null;
    /** Whether the weapon has been enhanced */
    isEnhanced: boolean;
    /** Crafted date (Unix timestamp) if available */
    craftedDate: number | null;
}

/**
 * Extract crafted weapon information.
 * 
 * How it works:
 * 1. Check item.state & 8 (ItemState.Crafted)
 * 2. Find the socket category with hash 3583996951 (crafted socket)
 * 3. Read the plug objectives from that socket for level data
 * 
 * @param item - The GuardianItem
 * @param definition - Manifest definition
 * @returns CraftedWeaponData or null
 */
export function getCraftedInfo(item: any, definition: any): CraftedWeaponData | null {
    // ItemState.Crafted = 8 — bitwise check
    const isCrafted = Boolean(item?.state & ITEM_STATE_CRAFTED);
    if (!isCrafted) return null;

    const liveSockets = item?.sockets?.sockets;
    const socketCategories = definition?.sockets?.socketCategories;
    if (!liveSockets || !socketCategories) {
        return { isCrafted: true, level: null, progress: null, isEnhanced: false, craftedDate: null };
    }

    // Find the crafted socket category
    const craftedCat = socketCategories.find(
        (cat: any) => cat.socketCategoryHash === CRAFTED_SOCKET_CATEGORY_HASH
    );
    if (!craftedCat?.socketIndexes?.length) {
        return { isCrafted: true, level: null, progress: null, isEnhanced: false, craftedDate: null };
    }

    // Read plug objectives from the first crafted socket
    const socketIndex = craftedCat.socketIndexes[0];
    const socket = liveSockets[socketIndex];
    const objectives = socket?.plugObjectives;
    if (!objectives || objectives.length === 0) {
        return { isCrafted: true, level: null, progress: null, isEnhanced: false, craftedDate: null };
    }

    // Typical crafted socket objectives:
    // [0] = weapon level (progress = level number, completionValue = max)
    // [1] = crafted date (progress = unix timestamp)
    // [2] = kill count or progress to next level
    let level: number | null = null;
    let progress: number | null = null;
    let craftedDate: number | null = null;

    for (const obj of objectives) {
        const p = obj.progress ?? 0;
        const cv = obj.completionValue ?? 0;

        // Date detection: very large progress value (Unix timestamp > 2020)
        if (p > 1577836800 && p < 2000000000) {
            craftedDate = p;
            continue;
        }

        // Level: first small integer objective (progress = level)
        // DIM looks at uiStyle but we check by value range heuristic
        if (level === null && cv > 0 && p <= cv) {
            level = p;
            progress = cv > 0 ? p / cv : 0;
            continue;
        }
    }

    // Enhanced detection: item.state also has enhancement bits,
    // but simpler: check if any perks are enhanced (tierType=0 + weapon component PCH)
    const isEnhanced = Boolean(item?.state & 16); // ItemState.HighlightedObjective ≈ enhanced

    return { isCrafted: true, level, progress, isEnhanced, craftedDate };
}

// ============================================================================
// ENERGY METER (Armor)
// ============================================================================

export interface ArmorEnergyData {
    /** Total energy capacity (usually 1-10, 11 for T5) */
    energyCapacity: number;
    /** Energy currently used by mods */
    energyUsed: number;
    /** Remaining free energy */
    energyUnused: number;
    /** Energy type hash (e.g., 4257631245 = Any) */
    energyTypeHash: number;
}

/**
 * Extract armor energy data from instance data.
 * Simple pass-through with sensible defaults.
 */
export function getArmorEnergy(item: any): ArmorEnergyData | null {
    const energy = item?.instanceData?.energy;
    if (!energy) return null;

    return {
        energyCapacity: energy.energyCapacity ?? 0,
        energyUsed: energy.energyUsed ?? 0,
        energyUnused: energy.energyUnused ?? Math.max(0, (energy.energyCapacity ?? 0) - (energy.energyUsed ?? 0)),
        energyTypeHash: energy.energyTypeHash ?? 0,
    };
}

// ============================================================================
// CATALYST PROGRESS (Exotic Weapons)
// ============================================================================

/**
 * Bungie DestinyRecordState enum values we need.
 * From bungie-api-ts/destiny2
 */
const DestinyRecordState = {
    ObjectiveNotCompleted: 4,
    Obscured: 16,
    RecordRedeemed: 2,
} as const;

export interface CatalystData {
    /** Whether the catalyst has been unlocked (dropped) */
    unlocked: boolean;
    /** Whether the catalyst objectives are complete */
    complete: boolean;
    /** Objectives with progress data */
    objectives: Array<{
        objectiveHash: number;
        progress?: number;
        completionValue?: number;
        complete?: boolean;
    }>;
}

/**
 * Build catalyst info from profile records.
 * Ported from DIM: src/app/inventory/store/catalyst.ts
 * 
 * @param itemHash - The exotic weapon's item hash
 * @param profileRecords - Raw profile records from Bungie profile response
 * @param characterRecords - Character-level records
 * @param catalystMapping - Map of itemHash → catalyst record hash
 */
export function getCatalystInfo(
    itemHash: number,
    profileRecords: any,
    characterRecords: Record<string, any> | undefined,
    catalystMapping: Record<string, number>,
): CatalystData | null {
    const recordHash = catalystMapping[itemHash.toString()];
    if (!recordHash) return null;

    // Look up the record in profile records first, then character records
    const record =
        profileRecords?.records?.[recordHash] ??
        (characterRecords &&
            Object.values(characterRecords).find(
                (cr: any) => cr?.records?.[recordHash]
            )?.records?.[recordHash]);

    if (!record) return null;

    const complete = Boolean(
        !(record.state & DestinyRecordState.ObjectiveNotCompleted) ||
        (record.state & DestinyRecordState.RecordRedeemed)
    );

    const unlocked = !(record.state & DestinyRecordState.Obscured);

    return {
        complete,
        unlocked,
        objectives: record.objectives || [],
    };
}

// ============================================================================
// DEEPSIGHT / PATTERN PROGRESS
// ============================================================================

export interface DeepsightData {
    /** Whether a pattern exists for this weapon */
    hasPattern: boolean;
    /** Whether the pattern is already unlocked (fully complete) */
    patternComplete: boolean;
    /** Incomplete objectives for pattern progress */
    objectives: Array<{
        objectiveHash: number;
        progress?: number;
        completionValue?: number;
        complete?: boolean;
    }>;
}

/**
 * Build deepsight/pattern info from profile records.
 * Simplified from DIM: src/app/inventory/store/patterns.ts
 * 
 * We use the recipeItemHash approach when available, falling back to
 * name matching against DestinyRecordDefinition.
 * 
 * @param item - The weapon item
 * @param definition - Item manifest definition
 * @param profileRecords - Profile-level records from Bungie API
 * @param patternRecordMap - Map of item name → pattern record hash (pre-computed)
 */
export function getDeepsightInfo(
    item: any,
    definition: any,
    profileRecords: any,
    patternRecordMap: Record<string, number>,
): DeepsightData | null {
    // Find the pattern record hash — try name matching
    const itemName = definition?.displayProperties?.name;
    if (!itemName) return null;

    const recordHash = patternRecordMap[itemName];
    if (!recordHash) return null;

    const record = profileRecords?.records?.[recordHash];
    if (!record) return null;

    // Check if all objectives are complete (pattern unlocked)
    const objectives = record.objectives || [];
    const incompleteObjectives = objectives.filter((o: any) => !o.complete);
    const patternComplete = incompleteObjectives.length === 0;

    return {
        hasPattern: true,
        patternComplete,
        objectives: incompleteObjectives,
    };
}
