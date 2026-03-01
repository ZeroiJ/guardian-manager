/**
 * Wishlist Types
 * Ported from DIM: src/app/wishlists/types.ts
 *
 * Data structures for parsed wishlists and matching results.
 */

/** A single parsed roll from a wishlist file. */
export interface WishListRoll {
  /** Manifest item hash (positive). For wildcard rolls, this is -69420. */
  itemHash: number;
  /** Perk hashes that must ALL be present on the item for a match. */
  recommendedPerks: Set<number>;
  /** true = dimwishlist: format; false = legacy Banshee/DTR URL format */
  isExpertMode: boolean;
  /** true if this roll is "undesirable" (trash list — from negative item hash) */
  isUndesirable?: boolean;
  /** Curator/community notes for this roll */
  notes?: string;
}

/** Metadata from a wishlist file header. */
export interface WishListInfo {
  title?: string;
  description?: string;
  url?: string;
  numRolls: number;
}

/** Top-level parsed wishlist container. */
export interface WishListAndInfo {
  /** All parsed rolls (flat array, deduplicated). */
  rolls: WishListRoll[];
  /** Per-file metadata. */
  infos: WishListInfo[];
  /** Original source URL(s). */
  source?: string;
}

/** Result of matching a live item against the wishlist. */
export interface WishListMatch {
  /** The specific perk hashes from the wishlist that this item matched. */
  wishListPerks: Set<number>;
  /** Notes from the matched roll. */
  notes?: string;
  /** true if this is a trash-list match (undesirable roll). */
  isUndesirable: boolean;
}

/** Wildcard item hash — matches every item. */
export const WILDCARD_ITEM_HASH = -69420;
