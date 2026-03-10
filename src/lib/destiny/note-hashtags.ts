/**
 * Hashtag Notes — Extract and manage #tags from item notes
 * 
 * Ported from DIM: src/app/inventory/note-hashtags.ts
 * Supports #pvp, #godroll, #keep, #trash, etc. in item notes.
 */

// Match hashtags: must start after whitespace/comma/start-of-string, begins with #
const HASHTAG_REGEX = /(^|[\s,])(#[\p{L}\p{N}_:-]+)/gu;

/**
 * Extract all hashtags from one or more note strings.
 * @example getHashtagsFromString("My god roll #pvp #keep") => ["#pvp", "#keep"]
 */
export function getHashtagsFromString(...notes: (string | null | undefined)[]): string[] {
    return notes.flatMap(note => 
        Array.from(note?.matchAll(HASHTAG_REGEX) ?? [], m => m[2])
    );
}

/**
 * Collect all unique hashtags from all item notes, ordered by popularity.
 * Case-insensitive deduplication, picks the most popular capitalization.
 */
export function collectAllHashtags(
    notes: Record<string, string>
): string[] {
    const counts = new Map<string, { variants: Map<string, number>; total: number }>();

    for (const note of Object.values(notes)) {
        const tags = getHashtagsFromString(note);
        for (const tag of tags) {
            const lower = tag.toLowerCase();
            if (!counts.has(lower)) {
                counts.set(lower, { variants: new Map(), total: 0 });
            }
            const entry = counts.get(lower)!;
            entry.total++;
            entry.variants.set(tag, (entry.variants.get(tag) ?? 0) + 1);
        }
    }

    // Sort by total usage count, pick most popular variant
    return [...counts.entries()]
        .sort(([, a], [, b]) => b.total - a.total)
        .map(([, entry]) => {
            let best = '';
            let bestCount = 0;
            for (const [variant, count] of entry.variants) {
                if (count > bestCount) {
                    best = variant;
                    bestCount = count;
                }
            }
            return best;
        });
}

/**
 * Append hashtags to a note without duplicating existing ones.
 */
export function appendHashtag(note: string | undefined, hashtag: string): string {
    const existing = new Set(
        getHashtagsFromString(note).map(h => h.toLowerCase())
    );
    if (existing.has(hashtag.toLowerCase())) {
        return note ?? '';
    }
    return ((note ?? '') + ' ' + hashtag).trim();
}

/**
 * Remove a specific hashtag from a note.
 */
export function removeHashtag(note: string | undefined, hashtag: string): string {
    if (!note) return '';
    const lower = hashtag.toLowerCase();
    const tags = getHashtagsFromString(note);
    // Replace the specific tag occurrence
    let result = note;
    for (const tag of tags) {
        if (tag.toLowerCase() === lower) {
            result = result.replace(tag, '').replace(/\s+/g, ' ').trim();
        }
    }
    return result;
}

/**
 * Check if a note contains a specific hashtag (case-insensitive).
 */
export function hasHashtag(note: string | undefined, hashtag: string): boolean {
    if (!note) return false;
    const lower = hashtag.toLowerCase();
    return getHashtagsFromString(note).some(h => h.toLowerCase() === lower);
}

/** Common preset hashtags for quick-add */
export const PRESET_HASHTAGS = [
    '#godroll', '#pvp', '#pve', '#keep', '#trash', '#infuse',
    '#gambit', '#raid', '#trials', '#gm', '#favorite',
] as const;
