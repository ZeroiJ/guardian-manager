// src/lib/inventory/statMath.ts

import { StatHashes } from '../destiny-constants';

export interface StatDelta {
    statHash: number;
    value: number;
    delta: number;
    tierDelta: number;
}

/** Tier break info for armor stats (10-point tiers). */
export interface TierBreakInfo {
    tier: number;
    pointsToNext: number;
    isMaxTier: boolean;
}

/** Categorized stat deltas for UI grouping. */
export interface CategorizedDeltas {
    weapon: StatDelta[];
    armor: StatDelta[];
    hidden: StatDelta[];
}

export function compareStats(itemA: any, itemB: any, definitions: any): StatDelta[] {
    const results: StatDelta[] = [];
    if (!itemA || !itemB || !definitions) return results;

    const defA = definitions[itemA.itemHash];

    // Get Investment Stats (Base) if live stats missing, otherwise use live stats
    // Note: Live stats (item.stats) usually key by Hash directly.
    const getStats = (item: any, def: any) => {
        const stats: Record<number, number> = {};

        // 1. Try Live Stats
        if (item.stats) {
            Object.values(item.stats).forEach((s: any) => {
                if (s.statHash) stats[s.statHash] = s.value;
            });
        }
        // 2. Fallback to Definition Investment Stats
        else if (def?.investmentStats) {
            def.investmentStats.forEach((s: any) => {
                stats[s.statTypeHash] = s.value;
            });
        }

        return stats;
    };

    const statsA = getStats(itemA, defA);
    const statsB = getStats(itemB, definitions[itemB.itemHash]);

    // Union of Stat Hashes
    const allHashes = new Set([...Object.keys(statsA), ...Object.keys(statsB)].map(Number));

    allHashes.forEach(hash => {
        // Filter out non-displayable stats if needed, or rely on UI to filter
        // Standard Armor/Weapon stats only? For now, include all common ones.

        const valA = statsA[hash] || 0;
        const valB = statsB[hash] || 0;
        const delta = valB - valA;

        const tierA = Math.floor(valA / 10);
        const tierB = Math.floor(valB / 10);
        const tierDelta = tierB - tierA;

        results.push({
            statHash: hash,
            value: valB, // We usually show Item B's value and the delta from A
            delta,
            tierDelta
        });
    });

    return results;
}

// ============================================================================
// ARMOR STAT HASHES (for categorization)
// ============================================================================
const ARMOR_STAT_HASHES = new Set<number>([
    StatHashes.Mobility,
    StatHashes.Resilience,
    StatHashes.Recovery,
    StatHashes.Discipline,
    StatHashes.Intellect,
    StatHashes.Strength,
]);

const HIDDEN_STAT_HASHES = new Set<number>([
    StatHashes.AimAssistance,
    StatHashes.Zoom,
    StatHashes.AirborneEffectiveness,
    StatHashes.RecoilDirection,
]);

/**
 * Group stat deltas into weapon, armor, and hidden categories for UI display.
 *
 * @param deltas - Array of stat deltas from compareStats()
 * @returns Categorized deltas for sectioned rendering
 */
export function categorizeStatDeltas(deltas: StatDelta[]): CategorizedDeltas {
    const weapon: StatDelta[] = [];
    const armor: StatDelta[] = [];
    const hidden: StatDelta[] = [];

    for (const d of deltas) {
        if (ARMOR_STAT_HASHES.has(d.statHash)) {
            armor.push(d);
        } else if (HIDDEN_STAT_HASHES.has(d.statHash)) {
            hidden.push(d);
        } else {
            weapon.push(d);
        }
    }

    return { weapon, armor, hidden };
}

/**
 * Calculate tier-break info for an armor stat value.
 * Destiny 2 armor stats work in tiers of 10 (T1–T10).
 *
 * @param value - The current stat value (0–100+)
 * @returns Tier number, points needed for next tier, and max-tier flag
 */
export function getTierBreakInfo(value: number): TierBreakInfo {
    const MAX_TIER = 10;
    const tier = Math.min(Math.floor(value / 10), MAX_TIER);
    const isMaxTier = tier >= MAX_TIER;
    const pointsToNext = isMaxTier ? 0 : (tier + 1) * 10 - value;

    return { tier, pointsToNext, isMaxTier };
}

