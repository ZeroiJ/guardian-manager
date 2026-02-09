/**
 * Wishlist Matcher
 * Matches items against loaded wishlist rolls
 */

import { WishListRoll, InventoryWishListRoll, WILDCARD_ITEM_ID } from './types';

/**
 * Groups wishlist rolls by item hash for fast lookup
 */
export function groupRollsByItemHash(rolls: WishListRoll[]): Map<number, WishListRoll[]> {
    const map = new Map<number, WishListRoll[]>();

    for (const roll of rolls) {
        const existing = map.get(roll.itemHash) || [];
        existing.push(roll);
        map.set(roll.itemHash, existing);
    }

    return map;
}

/**
 * Check if all recommended perks exist on the item
 */
function allPerksMatch(
    itemPerkHashes: Set<number>,
    roll: WishListRoll
): boolean {
    for (const perk of roll.recommendedPerks) {
        if (!itemPerkHashes.has(perk)) {
            return false;
        }
    }
    return true;
}

/**
 * Get perks from item sockets
 * @param item - The item with sockets
 * @param definitions - Manifest definitions
 * @returns Set of perk hashes on the item
 */
export function getItemPerkHashes(item: any): Set<number> {
    const perks = new Set<number>();

    if (!item?.sockets?.data?.sockets) return perks;

    for (const socket of item.sockets.data.sockets) {
        if (socket.plugHash) {
            perks.add(socket.plugHash);
        }
        // Also add reusable plugs (available perks)
        if (socket.reusablePlugs) {
            for (const plug of socket.reusablePlugs) {
                if (plug.plugItemHash) {
                    perks.add(plug.plugItemHash);
                }
            }
        }
    }

    return perks;
}

/**
 * Match an item against wishlist rolls
 * @param item - The inventory item
 * @param itemHash - The item's definition hash
 * @param itemCategoryHashes - Array of category hashes the item belongs to
 * @param rollsByHash - Wishlist rolls grouped by item hash
 * @param definitions - Manifest definitions
 * @returns Match result or undefined if no match
 */
export function getInventoryWishListRoll(
    item: any,
    itemHash: number,
    itemCategoryHashes: number[],
    rollsByHash: Map<number, WishListRoll[]>
): InventoryWishListRoll | undefined {
    const itemPerks = getItemPerkHashes(item);

    if (itemPerks.size === 0) return undefined;

    // Check rolls for: exact item hash, wildcard, or any matching category
    const hashesToCheck = [itemHash, WILDCARD_ITEM_ID, ...itemCategoryHashes];

    for (const hash of hashesToCheck) {
        const rolls = rollsByHash.get(hash);
        if (!rolls) continue;

        for (const roll of rolls) {
            if (roll.recommendedPerks.size === 0) continue;

            if (allPerksMatch(itemPerks, roll)) {
                // Find which specific perks matched
                const matchedPerks = new Set<number>();
                for (const perk of roll.recommendedPerks) {
                    if (itemPerks.has(perk)) {
                        matchedPerks.add(perk);
                    }
                }

                return {
                    wishListPerks: matchedPerks,
                    notes: roll.notes,
                    isUndesirable: roll.isUndesirable,
                };
            }
        }
    }

    return undefined;
}

/**
 * Quick check if an item hash has any wishlist rolls
 */
export function hasWishlistRolls(
    itemHash: number,
    itemCategoryHashes: number[],
    rollsByHash: Map<number, WishListRoll[]>
): boolean {
    const hashesToCheck = [itemHash, WILDCARD_ITEM_ID, ...itemCategoryHashes];
    return hashesToCheck.some(hash => rollsByHash.has(hash));
}
