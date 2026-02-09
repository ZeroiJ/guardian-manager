/**
 * Wishlist Parser
 * Parses DIM wishlist format: dimwishlist:item=HASH&perks=H1,H2#notes:text
 * Also supports DTR and Banshee-44 URL formats
 */

import { WishListRoll, WishListInfo, WishListState, WILDCARD_ITEM_ID } from './types';

/**
 * Parse a DIM wishlist line
 * Format: dimwishlist:item=HASH&perks=H1,H2,H3#notes:Some note text
 */
const DIM_LINE_REGEX = /^dimwishlist:item=(?<itemHash>-?\d+)(?:&perks=)?(?<perks>[\d|,]*)(?:#notes:)?(?<notes>[^|]*)/;

/**
 * Parse a DestinyTracker URL line
 */
const DTR_LINE_REGEX = /^https:\/\/destinytracker\.com\/destiny-2\/db\/items\/(?<itemHash>\d+)\D*perks=(?<perks>[\d,]*)(?:#notes:)?(?<notes>[^|]*)/;

/**
 * Parse a Banshee-44 URL line
 */
const BANSHEE_LINE_REGEX = /^https:\/\/banshee-44\.com\/\?weapon=(?<itemHash>\d.+)&socketEntries=(?<perks>[\d,]*)(?:#notes:)?(?<notes>[^|]*)/;

/**
 * Title and description labels
 */
const TITLE_REGEX = /^@?title:(.+)$/;
const DESC_REGEX = /^@?description:(.+)$/;
const NOTES_PREFIX = '//notes:';

/**
 * Parse a single line into a WishListRoll
 */
function parseLine(line: string, blockNotes?: string): WishListRoll | null {
    // Try each format
    const match = DIM_LINE_REGEX.exec(line) ||
        DTR_LINE_REGEX.exec(line) ||
        BANSHEE_LINE_REGEX.exec(line);

    if (!match?.groups) return null;

    let itemHash = parseInt(match.groups.itemHash, 10);
    if (isNaN(itemHash)) return null;

    // Negative hash = trash roll (except wildcard)
    const isUndesirable = itemHash < 0 && itemHash !== WILDCARD_ITEM_ID;
    if (isUndesirable) {
        itemHash = Math.abs(itemHash);
    }

    // Parse perks
    const perks = new Set<number>();
    if (match.groups.perks) {
        const perkStrings = match.groups.perks.split(/[,|]/);
        for (const p of perkStrings) {
            const perkHash = parseInt(p.trim(), 10);
            if (perkHash > 0) perks.add(perkHash);
        }
    }

    // Notes
    const notes = (match.groups.notes?.trim() || blockNotes || '').replace(/\\n/g, '\n') || undefined;

    return {
        itemHash,
        recommendedPerks: perks,
        isExpertMode: DIM_LINE_REGEX.test(line), // DIM format = expert mode
        isUndesirable,
        notes,
    };
}

/**
 * Parse wishlist text content into rolls
 */
export function parseWishlistText(text: string, url?: string): { rolls: WishListRoll[]; info: WishListInfo } {
    const rolls: WishListRoll[] = [];
    const seen = new Set<string>();
    let blockNotes: string | undefined;
    let title: string | undefined;
    let description: string | undefined;

    const lines = text.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();

        // Block notes
        if (trimmed.startsWith(NOTES_PREFIX)) {
            blockNotes = trimmed.slice(NOTES_PREFIX.length).trim();
            continue;
        }

        // Empty lines or comments reset block notes
        if (!trimmed || trimmed.startsWith('//')) {
            blockNotes = undefined;
            continue;
        }

        // Title
        const titleMatch = TITLE_REGEX.exec(trimmed);
        if (titleMatch) {
            title = titleMatch[1].trim();
            continue;
        }

        // Description
        const descMatch = DESC_REGEX.exec(trimmed);
        if (descMatch) {
            description = descMatch[1].trim();
            continue;
        }

        // Parse roll
        const roll = parseLine(trimmed, blockNotes);
        if (roll) {
            // Dedupe by hash + perks
            const key = `${roll.itemHash};${[...roll.recommendedPerks].sort().join(',')}`;
            if (!seen.has(key)) {
                seen.add(key);
                rolls.push(roll);
            }
        }
    }

    return {
        rolls,
        info: {
            url,
            title,
            description,
            numRolls: rolls.length,
        },
    };
}

/**
 * Parse multiple wishlist sources
 */
export function parseWishlists(sources: Array<{ url: string; text: string }>): WishListState {
    const allRolls: WishListRoll[] = [];
    const infos: WishListInfo[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < sources.length; i++) {
        const { url, text } = sources[i];
        const { rolls, info } = parseWishlistText(text, url);

        // Add rolls with source index, deduping globally
        for (const roll of rolls) {
            const key = `${roll.itemHash};${[...roll.recommendedPerks].sort().join(',')}`;
            if (!seen.has(key)) {
                seen.add(key);
                roll.sourceIndex = i;
                allRolls.push(roll);
            }
        }

        infos.push(info);
    }

    return {
        rolls: allRolls,
        infos,
        source: sources.map(s => s.url).join('|'),
        lastFetched: new Date(),
    };
}
