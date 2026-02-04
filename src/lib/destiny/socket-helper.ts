/**
 * Socket Helper - Socket Categorization Utility
 * Ported from DIM: src/app/utils/socket-utils.ts
 * 
 * Categorizes sockets into Intrinsic, Perks, and Mods for UI display.
 */

import {
    SocketCategoryHashes,
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

export interface CategorizedSockets {
    intrinsic: ResolvedSocket | null;  // Frame/Exotic perk (usually one)
    perks: ResolvedSocket[];            // Barrels, Mags, Traits
    mods: ResolvedSocket[];             // Weapon/Armor mods
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Socket categories we care about
const CATEGORY_INTRINSIC = SocketCategoryHashes.IntrinsicTraits;      // 3956125808
const CATEGORY_PERKS = SocketCategoryHashes.WeaponPerks;              // 4241087561
const CATEGORY_MODS = SocketCategoryHashes.ArmorMods;                 // 590099826
const CATEGORY_ARMOR_PERK = SocketCategoryHashes.ArmorPerks_LargePerk; // 3154740035

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Categorize sockets into Intrinsic, Perks, and Mods
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
    };

    // Get live sockets (support both processed and raw paths)
    const liveSockets = item?.sockets?.sockets || item?.itemComponents?.sockets?.data?.sockets;
    const socketCategories = definition?.sockets?.socketCategories;

    console.log('[DEBUG] categorizeSockets:', {
        hasItem: !!item,
        itemId: item?.itemInstanceId,
        hasLiveSockets: !!liveSockets,
        liveSocketsCount: liveSockets?.length,
        hasSocketCategories: !!socketCategories,
        socketCategoriesCount: socketCategories?.length
    });

    if (!liveSockets || !socketCategories) return result;

    // Build socket index → category hash map
    const socketIndexToCategory: Record<number, number> = {};
    for (const cat of socketCategories) {
        for (const index of cat.socketIndexes) {
            socketIndexToCategory[index] = cat.socketCategoryHash;
        }
    }

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

        // Skip empty plug hashes
        if (EMPTY_PLUG_HASHES.has(plugHash)) return;

        // Get plug definition
        const plugDef = definitions[plugHash];

        // Must have an icon
        if (!plugDef?.displayProperties?.icon) return;

        // Skip cosmetic plugs (shaders, mementos)
        const plugCategoryHash = plugDef?.plug?.plugCategoryHash;
        if (COSMETIC_PLUG_CATEGORIES.has(plugCategoryHash)) return;

        // Skip ornaments
        const plugCategoryIdentifier = plugDef?.plug?.plugCategoryIdentifier || '';
        if (plugCategoryIdentifier.includes('skin')) return;

        // Create resolved socket
        const resolvedSocket: ResolvedSocket = {
            socketIndex: index,
            plugHash,
            plugDef,
            categoryHash,
            isEnabled: socket.isEnabled !== false,
            isVisible: socket.isVisible !== false,
        };

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
            // Mods: Weapon/Armor mods
            result.mods.push(resolvedSocket);
        }
    });

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
