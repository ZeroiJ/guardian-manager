/**
 * Wishlist Types
 * Based on DIM's wishlist format
 */

/**
 * A single wishlist roll definition
 * Matches items with specific perk combinations
 */
export interface WishListRoll {
    /** Item hash for the weapon (or -69420 for wildcard) */
    itemHash: number;
    /** Set of perk hashes that must all be present */
    recommendedPerks: Set<number>;
    /** Expert mode = ALL perks must match; non-expert = be flexible */
    isExpertMode: boolean;
    /** Trash roll (negative itemHash in source) */
    isUndesirable?: boolean;
    /** Curator notes */
    notes?: string;
    /** Source wishlist index */
    sourceIndex?: number;
}

/**
 * Info about a loaded wishlist source
 */
export interface WishListInfo {
    /** URL or "local" for file uploads */
    url: string | undefined;
    /** Wishlist title from source */
    title?: string;
    /** Wishlist description */
    description?: string;
    /** Number of valid rolls loaded */
    numRolls: number;
}

/**
 * Combined wishlist state
 */
export interface WishListState {
    /** All loaded rolls from all sources */
    rolls: WishListRoll[];
    /** Info about each source */
    infos: WishListInfo[];
    /** Pipe-separated source URLs */
    source?: string;
    /** Last fetch timestamp */
    lastFetched?: Date;
}

/**
 * Result of matching an item against wishlists
 */
export interface InventoryWishListRoll {
    /** Perks on the item that matched */
    wishListPerks: Set<number>;
    /** Notes from curator */
    notes?: string;
    /** Is this a trash roll? */
    isUndesirable?: boolean;
}

/** Wildcard item ID (matches any weapon category) */
export const WILDCARD_ITEM_ID = -69420;

/** Default wishlist source (Voltron - most popular community list) */
export const DEFAULT_WISHLIST_URL = 'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt';
