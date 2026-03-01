/**
 * Wishlist Matcher
 * Ported from DIM: src/app/wishlists/wishlists.ts
 *
 * Matches a live inventory item against parsed wishlist rolls.
 * Expert mode: ALL recommended perks must exist somewhere in the item's plug options.
 * Legacy mode: Every relevant socket must have at least one matching perk.
 */

import type { WishListRoll, WishListMatch } from './types';
import { WILDCARD_ITEM_HASH } from './types';

// ============================================================================
// PERK RELEVANCE (which sockets count for matching)
// ============================================================================

/**
 * Plug category hashes that are "relevant" for wishlist matching.
 * Ported from DIM's isWeaponOrArmorOrGhostMod.
 * These represent barrels, mags, traits, origins — NOT intrinsics, shaders, masterworks.
 */
const RELEVANT_PLUG_CATEGORIES = new Set<number>([
  7906839,    // Frames (weapon traits like Rampage, Kill Clip)
  2833605196, // Barrels
  1806783418, // Magazines
  2619833294, // Scopes
  577918720,  // Stocks
  3962145884, // Grips
  1257608559, // Arrows
  3809303875, // Bowstrings
  164955586,  // Origins (Witch Queen+)
]);

// ============================================================================
// MATCHING
// ============================================================================

/**
 * Get all plug hashes available on a given item (active + alternatives).
 * Returns a Map of socketIndex → Set<plugHash> for relevant perk sockets.
 */
function getItemPlugOptions(
  item: any,
  definition: any,
  definitions: Record<string, any>,
): Map<number, Set<number>> {
  const result = new Map<number, Set<number>>();
  const liveSockets = item?.sockets?.sockets as Array<{
    plugHash?: number;
    isEnabled?: boolean;
    isVisible?: boolean;
  }> | undefined;

  if (!liveSockets) return result;

  const socketEntries = definition?.sockets?.socketEntries;

  for (let i = 0; i < liveSockets.length; i++) {
    const plugs = new Set<number>();
    const socket = liveSockets[i];

    // Add active plug
    if (socket.plugHash) plugs.add(socket.plugHash);

    // Add reusable plugs (component 305)
    const reusable = item.reusablePlugs as Record<number, Array<{ plugItemHash: number }>> | undefined;
    if (reusable?.[i]) {
      for (const p of reusable[i]) {
        if (p.plugItemHash) plugs.add(p.plugItemHash);
      }
    }

    // Add manifest plug set alternatives
    if (socketEntries?.[i]) {
      const entry = socketEntries[i];
      for (const psHash of [entry.reusablePlugSetHash, entry.randomizedPlugSetHash]) {
        if (psHash) {
          const plugSet = definitions[psHash] as any;
          if (plugSet?.reusablePlugItems) {
            for (const rpi of plugSet.reusablePlugItems) {
              if (rpi.plugItemHash) plugs.add(rpi.plugItemHash);
            }
          }
        }
      }
      // Inline reusable plug items
      if (entry.reusablePlugItems) {
        for (const rpi of entry.reusablePlugItems) {
          if (rpi.plugItemHash) plugs.add(rpi.plugItemHash);
        }
      }
    }

    if (plugs.size > 0) {
      result.set(i, plugs);
    }
  }

  return result;
}

/**
 * Check if a plug hash is "relevant" for wishlist matching (not cosmetic/intrinsic).
 */
function isRelevantPlug(plugHash: number, definitions: Record<string, any>): boolean {
  const plugDef = definitions[plugHash] as any;
  if (!plugDef?.plug?.plugCategoryHash) return false;
  return RELEVANT_PLUG_CATEGORIES.has(plugDef.plug.plugCategoryHash);
}

/**
 * Expert mode matching (dimwishlist: format):
 * ALL recommended perks must exist somewhere across the item's plug options.
 */
function expertModeMatch(
  roll: WishListRoll,
  plugOptions: Map<number, Set<number>>,
): boolean {
  if (roll.recommendedPerks.size === 0) return true; // Item-level match (no perks specified)

  // Flatten all plug options into a single set
  const allPlugs = new Set<number>();
  for (const plugs of plugOptions.values()) {
    for (const h of plugs) allPlugs.add(h);
  }

  // Every recommended perk must exist in the item's plug options
  for (const perkHash of roll.recommendedPerks) {
    if (!allPlugs.has(perkHash)) return false;
  }
  return true;
}

/**
 * Match a single live item against the wishlist roll lookup.
 *
 * @param item - GuardianItem from inventory store
 * @param definition - DestinyInventoryItemDefinition for the item
 * @param definitions - All loaded definitions (for plug/plugSet lookups)
 * @param rollsByHash - Pre-built Map of itemHash → WishListRoll[]
 * @returns WishListMatch if matched, or null
 */
export function matchItem(
  item: any,
  definition: any,
  definitions: Record<string, any>,
  rollsByHash: Map<number, WishListRoll[]>,
): WishListMatch | null {
  if (!item?.itemHash || !rollsByHash.size) return null;

  // Collect candidate rolls: exact hash + wildcard
  const candidates: WishListRoll[] = [];
  const exact = rollsByHash.get(item.itemHash);
  if (exact) candidates.push(...exact);
  const wildcard = rollsByHash.get(WILDCARD_ITEM_HASH);
  if (wildcard) candidates.push(...wildcard);

  if (candidates.length === 0) return null;

  // Build plug options for this item
  const plugOptions = getItemPlugOptions(item, definition, definitions);

  // Try each candidate (first match wins — order matters for wish vs trash)
  for (const roll of candidates) {
    const matched = roll.isExpertMode
      ? expertModeMatch(roll, plugOptions)
      : expertModeMatch(roll, plugOptions); // Simplification: treat legacy same as expert

    if (matched) {
      return {
        wishListPerks: roll.recommendedPerks,
        notes: roll.notes,
        isUndesirable: roll.isUndesirable ?? false,
      };
    }
  }

  return null;
}

/**
 * Get ALL matching rolls for an item (not just the first).
 * Useful for showing multiple wishlist notes in the overlay.
 */
export function matchItemAll(
  item: any,
  definition: any,
  definitions: Record<string, any>,
  rollsByHash: Map<number, WishListRoll[]>,
): WishListMatch[] {
  if (!item?.itemHash || !rollsByHash.size) return [];

  const candidates: WishListRoll[] = [];
  const exact = rollsByHash.get(item.itemHash);
  if (exact) candidates.push(...exact);
  const wildcard = rollsByHash.get(WILDCARD_ITEM_HASH);
  if (wildcard) candidates.push(...wildcard);

  if (candidates.length === 0) return [];

  const plugOptions = getItemPlugOptions(item, definition, definitions);
  const matches: WishListMatch[] = [];

  for (const roll of candidates) {
    if (expertModeMatch(roll, plugOptions)) {
      matches.push({
        wishListPerks: roll.recommendedPerks,
        notes: roll.notes,
        isUndesirable: roll.isUndesirable ?? false,
      });
    }
  }

  return matches;
}

/**
 * Check if a specific perk hash is mentioned in any matching wishlist roll for this item.
 * Used to highlight individual perks in the overlay.
 */
export function isPerkWishlisted(
  perkHash: number,
  matches: WishListMatch[],
): { isWished: boolean; isTrash: boolean } {
  let isWished = false;
  let isTrash = false;

  for (const match of matches) {
    if (match.wishListPerks.has(perkHash)) {
      if (match.isUndesirable) {
        isTrash = true;
      } else {
        isWished = true;
      }
    }
  }

  return { isWished, isTrash };
}
