/**
 * Socket Utilities
 * Ported from DIM: src/app/utils/socket-utils.ts
 * 
 * Filters sockets to show only relevant perks/mods.
 * Implements the "Cleaner" logic to filter out garbage sockets.
 */

import {
    SocketCategoryHashes,
    EMPTY_PLUG_HASHES,
    COSMETIC_PLUG_CATEGORIES
} from '../lib/destiny-constants';

/**
 * Represents a visible socket with its resolved data
 */
export interface VisibleSocket {
    socketIndex: number;
    plugHash: number;
    categoryHash: number;
    isEnabled: boolean;
    isVisible: boolean;
}

/**
 * Socket categories that contain displayable perks.
 * These are the ~5 sockets that matter out of ~20 total.
 */
const PERK_SOCKET_CATEGORIES = new Set<number>([
    SocketCategoryHashes.IntrinsicTraits,  // 3956125808 - Intrinsic/Exotic Trait
    SocketCategoryHashes.WeaponPerks,       // 4241087561 - Barrels, Mags, Traits
    SocketCategoryHashes.ArmorMods,         // 590099826  - Armor Mods
    SocketCategoryHashes.ArmorPerks_LargePerk, // 3154740035 - Exotic Armor Perks
]);

/**
 * Get all visible sockets from an item.
 * This is the "Cleaner" - filters out garbage sockets.
 * 
 * @param item - The raw item data from the API
 * @param definition - The item's manifest definition
 * @param definitions - The full definitions dictionary
 * @returns Array of visible sockets with their metadata
 */
export function getVisibleSockets(
    item: any,
    definition: any,
    definitions: Record<string, any>
): VisibleSocket[] {
    // Get live socket data from the item
    const liveSockets = item?.sockets?.sockets;
    const socketCategories = definition?.sockets?.socketCategories;

    if (!liveSockets || !socketCategories) {
        return [];
    }

    // Build socket index -> category hash map
    const socketIndexToCategory: Record<number, number> = {};
    for (const cat of socketCategories) {
        for (const index of cat.socketIndexes) {
            socketIndexToCategory[index] = cat.socketCategoryHash;
        }
    }

    const results: VisibleSocket[] = [];

    liveSockets.forEach((socket: any, index: number) => {
        const categoryHash = socketIndexToCategory[index];

        // Filter 1: Socket category must be in our whitelist
        if (!PERK_SOCKET_CATEGORIES.has(categoryHash)) {
            return;
        }

        // Filter 2: Must have a plug hash
        const plugHash = socket.plugHash;
        if (!plugHash) {
            return;
        }

        // Filter 3: Skip known empty plug hashes
        if (EMPTY_PLUG_HASHES.has(plugHash)) {
            return;
        }

        // Filter 4: Resolve plug definition and check it has an icon
        const plugDef = definitions[plugHash];
        if (!plugDef?.displayProperties?.icon) {
            return;
        }

        // Filter 5: Skip cosmetic plugs (shaders, mementos, ornaments)
        const plugCategoryHash = plugDef?.plug?.plugCategoryHash;
        if (COSMETIC_PLUG_CATEGORIES.has(plugCategoryHash)) {
            return;
        }

        // Filter 6: Skip plugs with "skin" in the identifier (ornaments)
        const plugCategoryIdentifier = plugDef?.plug?.plugCategoryIdentifier || '';
        if (plugCategoryIdentifier.includes('skin')) {
            return;
        }

        results.push({
            socketIndex: index,
            plugHash,
            categoryHash,
            isEnabled: socket.isEnabled !== false,
            isVisible: socket.isVisible !== false,
        });
    });

    return results;
}

/**
 * Check if a socket is an intrinsic/exotic perk
 */
export function isIntrinsicSocket(categoryHash: number): boolean {
    return categoryHash === SocketCategoryHashes.IntrinsicTraits ||
        categoryHash === SocketCategoryHashes.ArmorPerks_LargePerk;
}

/**
 * Check if a socket is a weapon perk (barrel, mag, trait)
 */
export function isWeaponPerkSocket(categoryHash: number): boolean {
    return categoryHash === SocketCategoryHashes.WeaponPerks;
}

/**
 * Check if a socket is an armor mod
 */
export function isArmorModSocket(categoryHash: number): boolean {
    return categoryHash === SocketCategoryHashes.ArmorMods;
}

/**
 * Group visible sockets by their category type
 */
export function groupSocketsByType(sockets: VisibleSocket[]): {
    intrinsic: VisibleSocket[];
    perks: VisibleSocket[];
    mods: VisibleSocket[];
} {
    const groups = {
        intrinsic: [] as VisibleSocket[],
        perks: [] as VisibleSocket[],
        mods: [] as VisibleSocket[],
    };

    for (const socket of sockets) {
        if (isIntrinsicSocket(socket.categoryHash)) {
            groups.intrinsic.push(socket);
        } else if (isWeaponPerkSocket(socket.categoryHash)) {
            groups.perks.push(socket);
        } else if (isArmorModSocket(socket.categoryHash)) {
            groups.mods.push(socket);
        }
    }

    return groups;
}
