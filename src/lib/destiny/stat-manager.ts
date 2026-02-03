/**
 * Stat Manager - Client-Side Stat Calculation Engine
 * Ported from DIM: src/app/inventory/store/stats.ts
 * 
 * Implements the 3-step pipeline:
 * 1. Investment → Base stats from manifest
 * 2. Bonuses → Add plug contributions from sockets
 * 3. Interpolation → Map raw values to display values
 */

import { StatHashes } from '../destiny-constants';
import { STAT_WHITELIST, getStatInfo } from '../../utils/manifest-helper';

// ============================================================================
// TYPES
// ============================================================================

export interface CalculatedStat {
    statHash: number;
    label: string;
    baseValue: number;      // Investment stat (raw)
    bonusValue: number;     // From plugs/mods
    totalValue: number;     // base + bonus (investment total)
    displayValue: number;   // After interpolation
    maximumValue: number;   // For bar display
    isBar: boolean;         // Should show as bar?
    sortOrder: number;
}

// Stats that should NOT display a bar (text only or special visual)
const NO_BAR_STATS = new Set<number>([
    StatHashes.RoundsPerMinute,
    StatHashes.Magazine,
    StatHashes.RecoilDirection,
    StatHashes.ChargeTime,
    StatHashes.DrawTime,
]);

// ============================================================================
// STEP 1: BASE STATS (INVESTMENT)
// ============================================================================

/**
 * Extract base investment stats from item definition
 */
function getBaseStats(
    definition: any,
    _definitions: Record<string, any>
): Map<number, number> {
    const baseStats = new Map<number, number>();

    // Get investment stats from definition
    const investmentStats = definition?.investmentStats || [];

    for (const stat of investmentStats) {
        const statHash = stat.statTypeHash;
        const value = stat.value || 0;

        // Only include stats we care about
        if (STAT_WHITELIST[statHash]) {
            baseStats.set(statHash, (baseStats.get(statHash) || 0) + value);
        }
    }

    return baseStats;
}

// ============================================================================
// STEP 2: SOCKET BONUSES (THE "LIVE" LAYER)
// ============================================================================

/**
 * Calculate stat bonuses from active sockets (perks/mods)
 */
function getSocketBonuses(
    item: any,
    _definition: any,
    definitions: Record<string, any>
): Map<number, number> {
    const bonuses = new Map<number, number>();

    // Get live sockets from item
    const liveSockets = item?.sockets?.sockets;
    if (!liveSockets) return bonuses;

    for (const socket of liveSockets) {
        // Must have an active plug
        const plugHash = socket.plugHash;
        if (!plugHash) continue;

        // Get plug definition
        const plugDef = definitions[plugHash];
        if (!plugDef?.investmentStats) continue;

        // Add each investment stat from the plug
        for (const stat of plugDef.investmentStats) {
            const statHash = stat.statTypeHash;
            const value = stat.value || 0;

            // Only count stats in our whitelist
            if (STAT_WHITELIST[statHash]) {
                bonuses.set(statHash, (bonuses.get(statHash) || 0) + value);
            }
        }
    }

    return bonuses;
}

// ============================================================================
// STEP 3: INTERPOLATION (THE "STAT GROUP" MAPPING)
// ============================================================================

/**
 * Interpolate a raw stat value using the display interpolation curve
 * This maps raw 0-100 values to actual display values
 */
function interpolateStatValue(
    rawValue: number,
    statHash: number,
    statGroupDef: any
): number {
    if (!statGroupDef?.scaledStats) return rawValue;

    // Find the scaling definition for this stat
    const scaledStat = statGroupDef.scaledStats.find(
        (s: any) => s.statHash === statHash
    );

    if (!scaledStat?.displayInterpolation?.length) return rawValue;

    const interpolation = scaledStat.displayInterpolation;

    // Clamp to maximum value
    const maxValue = scaledStat.maximumValue || 100;
    const clampedValue = Math.min(rawValue, maxValue);

    // Sort points by input value
    const sortedPoints = [...interpolation].sort(
        (a: any, b: any) => a.value - b.value
    );

    // Edge cases: below min or above max
    const minPoint = sortedPoints[0];
    const maxPoint = sortedPoints[sortedPoints.length - 1];

    if (clampedValue <= minPoint.value) return minPoint.weight;
    if (clampedValue >= maxPoint.value) return maxPoint.weight;

    // Linear interpolation between curve points
    for (let i = 0; i < sortedPoints.length - 1; i++) {
        const p1 = sortedPoints[i];
        const p2 = sortedPoints[i + 1];

        if (clampedValue >= p1.value && clampedValue <= p2.value) {
            const range = p2.value - p1.value;
            if (range === 0) return p1.weight;

            const t = (clampedValue - p1.value) / range;
            const interpolatedWeight = p1.weight + t * (p2.weight - p1.weight);

            // Standard rounding (simplified from DIM's banker's rounding)
            return Math.round(interpolatedWeight);
        }
    }

    return rawValue;
}

/**
 * Get the maximum display value for a stat (for bar scaling)
 */
function getStatMaximum(statHash: number, statGroupDef: any): number {
    if (!statGroupDef?.scaledStats) return 100;

    const scaledStat = statGroupDef.scaledStats.find(
        (s: any) => s.statHash === statHash
    );

    if (!scaledStat?.displayInterpolation?.length) {
        return statGroupDef.maximumValue || 100;
    }

    // Find the maximum weight in the interpolation curve
    const maxWeight = Math.max(
        ...scaledStat.displayInterpolation.map((p: any) => p.weight)
    );

    return maxWeight || 100;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate all stats for an item using the 3-step pipeline
 * 
 * @param item - Live item data from API
 * @param definition - Item manifest definition
 * @param definitions - All manifest definitions (for plugs, stat groups)
 * @returns Array of calculated stats ready for display
 */
export function calculateStats(
    item: any,
    definition: any,
    definitions: Record<string, any>
): CalculatedStat[] {
    if (!definition) return [];

    // Get stat group definition for interpolation
    const statGroupHash = definition.stats?.statGroupHash;
    const statGroupDef = statGroupHash ? definitions[statGroupHash] : null;

    // Step 1: Get base investment stats
    const baseStats = getBaseStats(definition, definitions);

    // Step 2: Get socket bonuses
    const socketBonuses = getSocketBonuses(item, definition, definitions);

    // Merge all stat hashes we need to process
    const allStatHashes = new Set([
        ...baseStats.keys(),
        ...socketBonuses.keys(),
    ]);

    const results: CalculatedStat[] = [];

    for (const statHash of allStatHashes) {
        const info = getStatInfo(statHash);
        if (!info) continue;

        const baseValue = baseStats.get(statHash) || 0;
        const bonusValue = socketBonuses.get(statHash) || 0;
        const totalValue = baseValue + bonusValue;

        // Step 3: Interpolate to display value
        const displayValue = interpolateStatValue(totalValue, statHash, statGroupDef);
        const maximumValue = getStatMaximum(statHash, statGroupDef);

        results.push({
            statHash,
            label: info.label,
            baseValue,
            bonusValue,
            totalValue,
            displayValue,
            maximumValue,
            isBar: !NO_BAR_STATS.has(statHash),
            sortOrder: info.sort,
        });
    }

    // Sort by defined order
    return results.sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Get stats with live API values as fallback
 * Uses API stats when available, falls back to calculated stats
 */
export function getStatsWithLiveFallback(
    item: any,
    definition: any,
    definitions: Record<string, any>
): CalculatedStat[] {
    const calculatedStats = calculateStats(item, definition, definitions);

    // Try to use live stats from API if available
    const liveStats = item?.stats?.values || item?.stats || {};

    return calculatedStats.map(stat => {
        // Check if we have a live value
        const liveValue = liveStats[stat.statHash]?.value;

        if (typeof liveValue === 'number') {
            return {
                ...stat,
                displayValue: liveValue,
            };
        }

        return stat;
    });
}
