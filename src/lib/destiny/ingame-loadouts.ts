/**
 * In-Game Loadout Types & Processing
 *
 * Ported from DIM:
 *   - src/app/loadout/loadout-types.ts (InGameLoadout type)
 *   - src/app/loadout/loadout-type-converters.ts (processInGameLoadouts, resolveInGameLoadoutIdentifiers)
 *   - src/app/loadout/known-values.ts (UNSET_PLUG_HASH)
 *
 * Bungie API Component 205 returns per-character loadout data
 * (DestinyLoadoutsComponent → DestinyLoadoutComponent[]).
 */

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * The "unset" plug hash used by Bungie for sockets that are not part of a loadout.
 * This is the FNV-1a hash of an empty string — a well-known sentinel in the API.
 */
export const UNSET_PLUG_HASH = 2166136261;

// ============================================================================
// TYPES — Raw Bungie API shapes (Component 205)
// ============================================================================

/** A single item slot inside an in-game loadout. */
export interface DestinyLoadoutItemComponent {
    /** The instance ID of the item. '0' means no item in this slot. */
    itemInstanceId: string;
    /** Up to 16 plug hashes (one per socket index). UNSET_PLUG_HASH = not configured. */
    plugItemHashes: number[];
}

/** A single in-game loadout as returned by the API. */
export interface DestinyLoadoutComponent {
    /** Maps to DestinyLoadoutColorDefinition in the manifest. */
    colorHash: number;
    /** Maps to DestinyLoadoutIconDefinition in the manifest. */
    iconHash: number;
    /** Maps to DestinyLoadoutNameDefinition in the manifest. */
    nameHash: number;
    /** The items in this loadout (usually ~12: weapons + armor + subclass). */
    items: DestinyLoadoutItemComponent[];
}

/** Per-character wrapper returned by Component 205. */
export interface DestinyLoadoutsComponent {
    loadouts: DestinyLoadoutComponent[];
}

// ============================================================================
// TYPES — Our enriched in-game loadout (like DIM's InGameLoadout)
// ============================================================================

/**
 * An enriched in-game loadout with resolved name/icon/color from the manifest.
 * This is the type stored in our Zustand store and consumed by UI components.
 */
export interface InGameLoadout extends DestinyLoadoutComponent {
    /** 0-indexed slot position (0-9). Display as index + 1. */
    index: number;
    /** The character this loadout belongs to. */
    characterId: string;
    /** Resolved name from DestinyLoadoutNameDefinition. */
    name: string;
    /** Resolved foreground icon path from DestinyLoadoutIconDefinition. */
    icon: string;
    /** Resolved background/color image path from DestinyLoadoutColorDefinition. */
    colorIcon: string;
    /** Unique ID among all loadouts: `ingame-{characterId}-{index}`. */
    id: string;
}

/**
 * Type guard: Is this loadout an in-game loadout (vs. an app loadout)?
 */
export function isInGameLoadout(loadout: any): loadout is InGameLoadout {
    return 'colorHash' in loadout && 'index' in loadout;
}

// ============================================================================
// MANIFEST DEFINITION TYPES (Loadout cosmetics)
// ============================================================================

export interface LoadoutNameDefinition {
    name: string;
    hash: number;
    index: number;
    redacted: boolean;
}

export interface LoadoutColorDefinition {
    colorImagePath: string;
    hash: number;
    index: number;
    redacted: boolean;
}

export interface LoadoutIconDefinition {
    iconImagePath: string;
    hash: number;
    index: number;
    redacted: boolean;
}

// ============================================================================
// PROCESSING — Convert raw API data to enriched InGameLoadout[]
// ============================================================================

/**
 * Resolve the name, icon, and color for an in-game loadout from manifest definitions.
 */
export function resolveInGameLoadoutIdentifiers(
    loadoutNameDefs: Record<string | number, LoadoutNameDefinition>,
    loadoutColorDefs: Record<string | number, LoadoutColorDefinition>,
    loadoutIconDefs: Record<string | number, LoadoutIconDefinition>,
    loadout: { nameHash: number; colorHash: number; iconHash: number },
): { name: string; colorIcon: string; icon: string } {
    const name = loadoutNameDefs[loadout.nameHash]?.name ?? 'Unknown Loadout';
    const colorIcon = loadoutColorDefs[loadout.colorHash]?.colorImagePath ?? '';
    const icon = loadoutIconDefs[loadout.iconHash]?.iconImagePath ?? '';
    return { name, colorIcon, icon };
}

/**
 * Processes raw Bungie Component 205 data into our enriched InGameLoadout arrays.
 *
 * @param characterLoadouts - Raw `profileResponse.characterLoadouts.data` from Bungie API
 * @param loadoutNameDefs   - DestinyLoadoutNameDefinition table
 * @param loadoutColorDefs  - DestinyLoadoutColorDefinition table
 * @param loadoutIconDefs   - DestinyLoadoutIconDefinition table
 * @returns A map of characterId → InGameLoadout[] (empty loadouts are filtered out)
 */
export function processInGameLoadouts(
    characterLoadouts: Record<string, DestinyLoadoutsComponent> | undefined,
    loadoutNameDefs: Record<string | number, LoadoutNameDefinition>,
    loadoutColorDefs: Record<string | number, LoadoutColorDefinition>,
    loadoutIconDefs: Record<string | number, LoadoutIconDefinition>,
): Record<string, InGameLoadout[]> {
    if (!characterLoadouts) return {};

    const result: Record<string, InGameLoadout[]> = {};

    for (const [characterId, data] of Object.entries(characterLoadouts)) {
        const loadouts: InGameLoadout[] = [];

        for (let i = 0; i < data.loadouts.length; i++) {
            const raw = data.loadouts[i];

            // Skip empty loadout slots (all items have instanceId === '0')
            if (
                !raw.items ||
                raw.items.length === 0 ||
                raw.items.every((item) => item.itemInstanceId === '0')
            ) {
                continue;
            }

            const resolved = resolveInGameLoadoutIdentifiers(
                loadoutNameDefs,
                loadoutColorDefs,
                loadoutIconDefs,
                raw,
            );

            loadouts.push({
                ...raw,
                ...resolved,
                index: i,
                characterId,
                id: `ingame-${characterId}-${i}`,
            });
        }

        result[characterId] = loadouts;
    }

    return result;
}

/**
 * Converts in-game loadout plugItemHashes into a socketOverrides map.
 * Strips out UNSET_PLUG_HASH entries.
 *
 * Ported from DIM: convertInGameLoadoutPlugItemHashesToSocketOverrides
 */
export function convertPlugHashesToSocketOverrides(
    plugItemHashes: number[],
): Record<number, number> {
    const overrides: Record<number, number> = {};
    for (let i = 0; i < plugItemHashes.length; i++) {
        if (plugItemHashes[i] !== UNSET_PLUG_HASH && plugItemHashes[i] !== 0) {
            overrides[i] = plugItemHashes[i];
        }
    }
    return overrides;
}

/**
 * Resolves the items in an in-game loadout to actual inventory items.
 * Returns only items that are found in the live inventory.
 *
 * @param loadout   - The in-game loadout
 * @param allItems  - All items from the inventory store
 * @returns Array of { item, socketOverrides } for each resolved item
 */
export function resolveInGameLoadoutItems(
    loadout: InGameLoadout,
    allItems: Array<{ itemInstanceId?: string; itemHash: number; [key: string]: any }>,
): Array<{
    itemInstanceId: string;
    itemHash: number;
    item: any;
    socketOverrides: Record<number, number>;
}> {
    const itemMap = new Map<string, any>();
    for (const item of allItems) {
        if (item.itemInstanceId) {
            itemMap.set(item.itemInstanceId, item);
        }
    }

    const resolved: Array<{
        itemInstanceId: string;
        itemHash: number;
        item: any;
        socketOverrides: Record<number, number>;
    }> = [];

    for (const loadoutItem of loadout.items) {
        if (loadoutItem.itemInstanceId === '0') continue;

        const liveItem = itemMap.get(loadoutItem.itemInstanceId);
        if (!liveItem) continue;

        resolved.push({
            itemInstanceId: loadoutItem.itemInstanceId,
            itemHash: liveItem.itemHash,
            item: liveItem,
            socketOverrides: convertPlugHashesToSocketOverrides(
                loadoutItem.plugItemHashes || [],
            ),
        });
    }

    return resolved;
}
