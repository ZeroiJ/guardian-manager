/**
 * Wishlist Parser
 * Ported from DIM: src/app/wishlists/wishlist-file.ts
 *
 * Parses DIM wishlist text files (voltron.txt format) into WishListRoll[].
 * Supports:
 * - dimwishlist:item=HASH&perks=HASH1,HASH2#notes:text
 * - dimwishlist:item=-HASH&perks=... (trash list)
 * - dimwishlist:item=-69420&perks=... (wildcard)
 * - //notes: block notes
 * - title: / description: metadata
 * - Legacy Banshee-44.com and DestinyTracker URL formats
 */

import { WishListRoll, WishListInfo, WishListAndInfo, WILDCARD_ITEM_HASH } from './types';

// ============================================================================
// REGEXES (ported from DIM)
// ============================================================================

/** Primary DIM wishlist format */
const DIM_WISH_RE =
  /^dimwishlist:item=(?<itemHash>-?\d+)(?:&perks=)?(?<itemPerks>[\d|,]*)(?:#notes:)?(?<wishListNotes>[^|]*)/;

/** Legacy Banshee-44 format */
const BANSHEE_RE =
  /^https?:\/\/banshee-44\.com\/\?weapon=(?<itemHash>\d+)(?:&socketEntries=)?(?<perks>[\d,]*)(?:#notes:)?(?<notes>[^|]*)/;

/** Legacy DestinyTracker format */
const DTR_RE =
  /^https?:\/\/destinytracker\.com\/destiny-2\/db\/items\/(?<itemHash>\d+)(?:\?perks=)?(?<perks>[\d,]*)(?:#notes:)?(?<notes>[^|]*)/;

/** Metadata */
const TITLE_RE = /^@?title:(?<title>.+)/;
const DESC_RE = /^@?description:(?<desc>.+)/;

// ============================================================================
// PARSER
// ============================================================================

/**
 * Parse a single wishlist text file into rolls + metadata.
 */
function parseFile(text: string, url?: string): { rolls: WishListRoll[]; info: WishListInfo } {
  const rolls: WishListRoll[] = [];
  let title: string | undefined;
  let description: string | undefined;
  let blockNotes: string | undefined;

  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Empty line resets block notes
    if (!line) {
      blockNotes = undefined;
      continue;
    }

    // Block notes line
    if (line.startsWith('//notes:')) {
      blockNotes = line.slice(8).trim() || undefined;
      continue;
    }

    // Comment line (resets block notes)
    if (line.startsWith('//')) {
      blockNotes = undefined;
      continue;
    }

    // Title metadata
    const titleMatch = line.match(TITLE_RE);
    if (titleMatch?.groups?.title && !title) {
      title = titleMatch.groups.title.trim();
      continue;
    }

    // Description metadata
    const descMatch = line.match(DESC_RE);
    if (descMatch?.groups?.desc && !description) {
      description = descMatch.groups.desc.trim();
      continue;
    }

    // Try parsing as a roll
    const roll = parseDimWishLine(line, blockNotes)
      ?? parseBansheeLine(line, blockNotes)
      ?? parseDtrLine(line, blockNotes);

    if (roll) {
      rolls.push(roll);
    }
  }

  return {
    rolls,
    info: { title, description, url, numRolls: rolls.length },
  };
}

/** Parse a dimwishlist: line */
function parseDimWishLine(line: string, blockNotes?: string): WishListRoll | null {
  const match = line.match(DIM_WISH_RE);
  if (!match?.groups) return null;

  const rawHash = parseInt(match.groups.itemHash, 10);
  if (isNaN(rawHash)) return null;

  const isUndesirable = rawHash < 0 && rawHash !== WILDCARD_ITEM_HASH;
  const itemHash = isUndesirable ? Math.abs(rawHash) : rawHash;

  // Parse perks (comma or pipe separated)
  const perksStr = match.groups.itemPerks || '';
  const recommendedPerks = new Set<number>();
  if (perksStr) {
    for (const p of perksStr.split(/[,|]/)) {
      const h = parseInt(p.trim(), 10);
      if (!isNaN(h) && h > 0) recommendedPerks.add(h);
    }
  }

  // Notes: inline > block
  const inlineNotes = match.groups.wishListNotes?.trim().replace(/\\n/g, '\n');
  const notes = inlineNotes || blockNotes || undefined;

  return {
    itemHash,
    recommendedPerks,
    isExpertMode: true,
    isUndesirable: isUndesirable || undefined,
    notes,
  };
}

/** Parse a legacy Banshee-44.com URL line */
function parseBansheeLine(line: string, blockNotes?: string): WishListRoll | null {
  const match = line.match(BANSHEE_RE);
  if (!match?.groups) return null;

  const itemHash = parseInt(match.groups.itemHash, 10);
  if (isNaN(itemHash) || itemHash <= 0) return null;

  const recommendedPerks = new Set<number>();
  const perksStr = match.groups.perks || '';
  if (perksStr) {
    for (const p of perksStr.split(',')) {
      const h = parseInt(p.trim(), 10);
      if (!isNaN(h) && h > 0) recommendedPerks.add(h);
    }
  }

  const notes = match.groups.notes?.trim() || blockNotes || undefined;

  return { itemHash, recommendedPerks, isExpertMode: false, notes };
}

/** Parse a legacy DestinyTracker URL line */
function parseDtrLine(line: string, blockNotes?: string): WishListRoll | null {
  const match = line.match(DTR_RE);
  if (!match?.groups) return null;

  const itemHash = parseInt(match.groups.itemHash, 10);
  if (isNaN(itemHash) || itemHash <= 0) return null;

  const recommendedPerks = new Set<number>();
  const perksStr = match.groups.perks || '';
  if (perksStr) {
    for (const p of perksStr.split(',')) {
      const h = parseInt(p.trim(), 10);
      if (!isNaN(h) && h > 0) recommendedPerks.add(h);
    }
  }

  const notes = match.groups.notes?.trim() || blockNotes || undefined;

  return { itemHash, recommendedPerks, isExpertMode: false, notes };
}

// ============================================================================
// DEDUPLICATION
// ============================================================================

/** Build a dedup key for a roll. */
function rollKey(roll: WishListRoll): string {
  const perks = [...roll.recommendedPerks].sort().join(',');
  return `${roll.itemHash};${roll.isExpertMode};${roll.isUndesirable ?? false};${perks}`;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Parse one or more wishlist text files into a deduplicated WishListAndInfo.
 * @param files - Array of [url, fileContents] tuples.
 */
export function parseWishLists(
  files: Array<[url: string | undefined, contents: string]>
): WishListAndInfo {
  const allRolls: WishListRoll[] = [];
  const infos: WishListInfo[] = [];
  const seen = new Set<string>();

  for (const [url, contents] of files) {
    const { rolls, info } = parseFile(contents, url);
    infos.push(info);

    for (const roll of rolls) {
      const key = rollKey(roll);
      if (!seen.has(key)) {
        seen.add(key);
        allRolls.push(roll);
      }
    }
  }

  return {
    rolls: allRolls,
    infos,
    source: files.map(([url]) => url).filter(Boolean).join('|'),
  };
}

/**
 * Parse a single wishlist text blob.
 */
export function parseWishListText(text: string, url?: string): WishListAndInfo {
  return parseWishLists([[url, text]]);
}

/**
 * Build a lookup map: itemHash → WishListRoll[] for fast matching.
 */
export function buildRollsByHash(rolls: WishListRoll[]): Map<number, WishListRoll[]> {
  const map = new Map<number, WishListRoll[]>();
  for (const roll of rolls) {
    const existing = map.get(roll.itemHash);
    if (existing) {
      existing.push(roll);
    } else {
      map.set(roll.itemHash, [roll]);
    }
  }
  return map;
}
