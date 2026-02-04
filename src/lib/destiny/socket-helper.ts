/**
 * Socket Helper - Socket Categorization Utility
 * Ported from DIM: src/app/utils/socket-utils.ts
 * 
 * Categorizes sockets into Intrinsic, Perks, and Mods for UI display.
 */

import {
    SocketCategoryHashes,
    PlugCategoryHashes,
    EMPTY_PLUG_HASHES,
    COSMETIC_PLUG_CATEGORIES
} from '../destiny-constants';

// ============================================================================
// TYPES
// ============================================================================

export interface ResolvedSocket {
    socketIndex: number;
    plugHash: number;
    plugDef: any;
    categoryHash: number;
    isEnabled: boolean;
    isVisible: boolean;
}

/** Catalyst socket state */
export interface CatalystState {
    socket: ResolvedSocket | null;
    state: 'active' | 'empty' | 'missing';
}

export interface CategorizedSockets {
    intrinsic: ResolvedSocket | null;  // Frame/Exotic perk (usually one)
    perks: ResolvedSocket[];            // Barrels, Mags, Traits
    mods: ResolvedSocket[];             // Armor mods (legacy)
    // Footer Elements
    weaponMods: ResolvedSocket[];       // Weapon Mods (Backup Mag, etc.)
    cosmetics: ResolvedSocket[];        // Shaders
    ornament: ResolvedSocket | null;    // Active ornament
    catalyst: CatalystState | null;     // Catalyst with state
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Socket categories we care about
const CATEGORY_INTRINSIC = SocketCategoryHashes.IntrinsicTraits;      // 3956125808
const CATEGORY_PERKS = SocketCategoryHashes.WeaponPerks;              // 4241087561
const CATEGORY_MODS = SocketCategoryHashes.ArmorMods;                 // 590099826
const CATEGORY_ARMOR_PERK = SocketCategoryHashes.ArmorPerks_LargePerk; // 3154740035
// Footer categories
const CATEGORY_WEAPON_MODS = SocketCategoryHashes.WeaponMods;         // 2685412949
const CATEGORY_WEAPON_COSMETICS = SocketCategoryHashes.WeaponCosmetics; // 2048875504
const CATEGORY_WEAPON_MODS_INTRINSIC = SocketCategoryHashes.WeaponModsIntrinsic; // 2237038328

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Categorize sockets into Intrinsic, Perks, Mods, and Footer elements
 * 
 * @param item - Live item data from API
 * @param definition - Item manifest definition
 * @param definitions - All manifest definitions (for plugs)
 * @returns Categorized sockets ready for UI display
 */
export function categorizeSockets(
    item: any,
    definition: any,
    definitions: Record<string, any>
): CategorizedSockets {
    const result: CategorizedSockets = {
        intrinsic: null,
        perks: [],
        mods: [],
        // Footer
        weaponMods: [],
        cosmetics: [],
        ornament: null,
        catalyst: null,
    };

    // Get live sockets (support both processed and raw paths)
    const liveSockets = item?.sockets?.sockets || item?.itemComponents?.sockets?.data?.sockets;
    const socketCategories = definition?.sockets?.socketCategories;

    // Check if item is Exotic
    const tierType = definition?.inventory?.tierType || 0;
    const isExotic = tierType === 6;

    if (!liveSockets || !socketCategories) return result;

    // Build socket index → category hash map
    const socketIndexToCategory: Record<number, number> = {};
    for (const cat of socketCategories) {
        for (const index of cat.socketIndexes) {
            socketIndexToCategory[index] = cat.socketCategoryHash;
        }
    }

    // Track catalyst socket separately (may be empty)
    let foundCatalystSocket: ResolvedSocket | null = null;
    let catalystIsEmpty = false;

    // Process each socket
    liveSockets.forEach((socket: any, index: number) => {
        const categoryHash = socketIndexToCategory[index];

        // Skip if no category
        if (!categoryHash) return;

        // Skip invisible sockets
        if (socket.isVisible === false) return;

        // Must have a plug hash
        const plugHash = socket.plugHash;
        if (!plugHash) return;

        // Get plug definition
        const plugDef = definitions[plugHash];
        const plugCategoryHash = plugDef?.plug?.plugCategoryHash;
        const plugCategoryIdentifier = plugDef?.plug?.plugCategoryIdentifier || '';

        // Check for catalyst socket (may be empty for exotics)
        if (isExotic && plugCategoryHash === PlugCategoryHashes.V400EmptyExoticMasterwork) {
            catalystIsEmpty = true;
            return; // Skip adding to other categories
        }

        // Check if this is an empty plug
        const isEmpty = EMPTY_PLUG_HASHES.has(plugHash);
        if (isEmpty) return;

        // Must have an icon for display
        if (!plugDef?.displayProperties?.icon) return;

        // Create resolved socket
        const resolvedSocket: ResolvedSocket = {
            socketIndex: index,
            plugHash,
            plugDef,
            categoryHash,
            isEnabled: socket.isEnabled !== false,
            isVisible: socket.isVisible !== false,
        };

        // Check for ornament (skin)
        if (plugCategoryIdentifier.includes('skin')) {
            result.ornament = resolvedSocket;
            return;
        }

        // Check for shader
        if (plugCategoryHash === PlugCategoryHashes.Shader) {
            result.cosmetics.push(resolvedSocket);
            return;
        }

        // Check for catalyst (active, with icon)
        if (isExotic && (categoryHash === CATEGORY_WEAPON_MODS || categoryHash === CATEGORY_WEAPON_MODS_INTRINSIC)) {
            // Check if this is a masterwork/catalyst plug
            if (plugCategoryIdentifier.includes('masterwork') ||
                plugCategoryIdentifier.includes('catalyst') ||
                plugCategoryIdentifier.includes('exotic.masterwork')) {
                foundCatalystSocket = resolvedSocket;
                return;
            }
        }

        // Skip cosmetic plugs for perk display
        if (COSMETIC_PLUG_CATEGORIES.has(plugCategoryHash)) return;

        // Categorize by socket category hash
        if (categoryHash === CATEGORY_INTRINSIC || categoryHash === CATEGORY_ARMOR_PERK) {
            // Intrinsic: Usually only one per item
            if (!result.intrinsic) {
                result.intrinsic = resolvedSocket;
            }
        } else if (categoryHash === CATEGORY_PERKS) {
            // Weapon perks: Barrels, Mags, Traits
            result.perks.push(resolvedSocket);
        } else if (categoryHash === CATEGORY_MODS) {
            // Armor mods
            result.mods.push(resolvedSocket);
        } else if (categoryHash === CATEGORY_WEAPON_MODS) {
            // Weapon mods (Backup Mag, etc.)
            result.weaponMods.push(resolvedSocket);
        } else if (categoryHash === CATEGORY_WEAPON_COSMETICS) {
            // Other cosmetics
            result.cosmetics.push(resolvedSocket);
        }
    });

    // Determine catalyst state for exotics
    if (isExotic) {
        if (foundCatalystSocket) {
            result.catalyst = { socket: foundCatalystSocket, state: 'active' };
        } else if (catalystIsEmpty) {
            result.catalyst = { socket: null, state: 'empty' };
        } else {
            // Exotic with no catalyst socket found - might not have a catalyst
            result.catalyst = { socket: null, state: 'missing' };
        }
    }

    return result;
}

/**
 * Get the intrinsic socket (Frame/Exotic perk) for an item
 * Convenience function for displaying the main perk
 */
export function getIntrinsicSocket(
    item: any,
    definition: any,
    definitions: Record<string, any>
): ResolvedSocket | null {
    const categorized = categorizeSockets(item, definition, definitions);
    return categorized.intrinsic;
}

/**
 * Check if an item has visible perks
 */
export function hasVisiblePerks(
    item: any,
    definition: any,
    definitions: Record<string, any>
): boolean {
    const categorized = categorizeSockets(item, definition, definitions);
    return (
        categorized.intrinsic !== null ||
        categorized.perks.length > 0 ||
        categorized.mods.length > 0
    );
}
