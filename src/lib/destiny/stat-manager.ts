/**
 * Stat Manager - Client-Side Stat Calculation Engine
 * Ported from DIM: src/app/inventory/store/stats.ts
 * 
 * Implements the 3-step pipeline:
 * 1. Investment → Base stats from manifest
 * 2. Bonuses → Add plug contributions from sockets
 * 3. Interpolation → Map raw values to display values
 */

import { StatHashes, PlugCategoryHashes } from '../destiny-constants';
import { STAT_WHITELIST, getStatInfo } from '../../utils/manifest-helper';

// ============================================================================
// TYPES
// ============================================================================

/** Segment type for color-coded stat bars (ported from DIM's ItemStat.tsx) */
export type StatSegmentType = 'base' | 'parts' | 'traits' | 'mod' | 'masterwork';

/** A single segment in a stat bar: [value, type, optional plug name] */
export type StatSegment = [value: number, type: StatSegmentType, name?: string];

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
    segments: StatSegment[]; // Color-coded bar segments
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

    // Get live sockets from item (support both processed and raw paths)
    const liveSockets = item?.sockets?.sockets || item?.itemComponents?.sockets?.data?.sockets;
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
// STEP 2b: SEGMENTED SOCKET BONUSES (Per-Source Breakdown)
// Ported from DIM: ItemStat.tsx getModEffects / getWeaponComponentEffects / getTraitEffects
// ============================================================================

/**
 * Weapon component plug category hashes — barrels, mags, bowstrings, etc.
 * These contribute "parts" segments (blue) on the stat bar.
 * Ported from DIM: src/app/search/d2-known-values.ts weaponComponentPCHs
 */
const WEAPON_COMPONENT_PCHS = new Set<number>([
    PlugCategoryHashes.Barrels,
    PlugCategoryHashes.Magazines,
    PlugCategoryHashes.Scopes,
    PlugCategoryHashes.Stocks,
    PlugCategoryHashes.Grips,
    PlugCategoryHashes.Arrows,
    // Additional DIM values we may not have constants for yet:
    // Bowstrings, Batteries, Blades, Tubes, Hafts, Guards, Rails, Bolts
    // If we add them to destiny-constants they'd go here.
    // For now, also match by plugCategoryIdentifier as a fallback.
]);

/**
 * Trait plug category hashes — Rampage, Subsistence, etc.
 * These contribute "traits" segments (green) on the stat bar.
 */
const TRAIT_PCHS = new Set<number>([
    PlugCategoryHashes.Frames,      // Weapon trait perks (Rampage, etc.)
    PlugCategoryHashes.Intrinsics,   // Exotic perks, armor intrinsics
    PlugCategoryHashes.Origins,      // Origin traits (Witch Queen+)
]);

/**
 * Classify a plug into a segment type based on its definition.
 * Follows DIM's classification logic from ItemStat.tsx.
 */
function classifyPlug(plugDef: any): StatSegmentType {
    const pch = plugDef?.plug?.plugCategoryHash;
    const pci = plugDef?.plug?.plugCategoryIdentifier || '';

    // Masterwork: identified by plugCategoryIdentifier
    if (pci.includes('masterwork') || pci.includes('catalyst') || pci.includes('exotic.masterwork')) {
        return 'masterwork';
    }

    // Weapon components (barrels, mags, etc.) → "parts"
    if (WEAPON_COMPONENT_PCHS.has(pch)) {
        return 'parts';
    }

    // Additional weapon component identification by plugCategoryIdentifier
    // Covers batteries, blades, tubes, hafts, guards, rails, bolts
    if (pci.includes('barrel') || pci.includes('magazine') || pci.includes('scope') ||
        pci.includes('stock') || pci.includes('grip') || pci.includes('arrow') ||
        pci.includes('bowstring') || pci.includes('battery') || pci.includes('blade') ||
        pci.includes('tube') || pci.includes('haft') || pci.includes('guard') ||
        pci.includes('rail') || pci.includes('bolt')) {
        return 'parts';
    }

    // Traits (Rampage, Subsistence, etc.) → "traits"
    if (TRAIT_PCHS.has(pch)) {
        return 'traits';
    }

    // Mods (Backup Mag, Adept Range, armor mods, etc.) → "mod"
    // Also covers weapon.mod_ and tuning.mods
    if (pci.includes('weapon.mod_') || pci.includes('tuning.mods') ||
        pci.includes('v400.plugs.armor') || pci.includes('enhancements.')) {
        return 'mod';
    }

    // Default to mod for anything with investmentStats that doesn't match above
    return 'mod';
}

/**
 * Calculate segmented stat bonuses, broken down by source type.
 * Returns per-stat arrays of [value, type, plugName] tuples.
 * 
 * This is the key enhancement over getSocketBonuses() — instead of a single sum,
 * we get color-coded segments for each contributing plug.
 */
function getSegmentedSocketBonuses(
    item: any,
    _definition: any,
    definitions: Record<string, any>
): Map<number, StatSegment[]> {
    const segmentsByStatHash = new Map<number, StatSegment[]>();

    const liveSockets = item?.sockets?.sockets || item?.itemComponents?.sockets?.data?.sockets;
    if (!liveSockets) return segmentsByStatHash;

    for (const socket of liveSockets) {
        const plugHash = socket.plugHash;
        if (!plugHash) continue;

        const plugDef = definitions[plugHash];
        if (!plugDef?.investmentStats) continue;

        const segmentType = classifyPlug(plugDef);
        const plugName = plugDef.displayProperties?.name || '';

        for (const stat of plugDef.investmentStats) {
            const statHash = stat.statTypeHash;
            const value = stat.value || 0;

            if (!STAT_WHITELIST[statHash] || value === 0) continue;

            if (!segmentsByStatHash.has(statHash)) {
                segmentsByStatHash.set(statHash, []);
            }
            segmentsByStatHash.get(statHash)!.push([value, segmentType, plugName]);
        }
    }

    return segmentsByStatHash;
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
 * @param socketOverrides - Optional map of socketIndex → plugHash for perk swap preview
 * @returns Array of calculated stats ready for display
 */
export function calculateStats(
    item: any,
    definition: any,
    definitions: Record<string, any>,
    socketOverrides?: Record<number, number>
): CalculatedStat[] {
    if (!definition) return [];

    // If there are socket overrides, create a shallow-cloned item with swapped plugs
    const effectiveItem = socketOverrides && Object.keys(socketOverrides).length > 0
        ? applySocketOverridesToItem(item, socketOverrides)
        : item;

    // Get stat group definition for interpolation
    const statGroupHash = definition.stats?.statGroupHash;
    const statGroupDef = statGroupHash ? definitions[statGroupHash] : null;

    // Step 1: Get base investment stats
    const baseStats = getBaseStats(definition, definitions);

    // Step 2: Get socket bonuses (flat sum for totalValue calculation)
    const socketBonuses = getSocketBonuses(effectiveItem, definition, definitions);

    // Step 2b: Get segmented socket bonuses (per-source breakdown for colored bars)
    const segmentedBonuses = getSegmentedSocketBonuses(effectiveItem, definition, definitions);

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

        // Build segments for the stat bar.
        // For weapons, base = item definition investmentStats minus all socket contributions.
        // We build: [base, ...parts, ...traits, ...mods, ...masterwork]
        const plugSegments = segmentedBonuses.get(statHash) || [];
        const partsTotal = plugSegments
            .filter(([, t]) => t === 'parts')
            .reduce((sum, [v]) => sum + v, 0);
        const traitsTotal = plugSegments
            .filter(([, t]) => t === 'traits')
            .reduce((sum, [v]) => sum + v, 0);
        const modsTotal = plugSegments
            .filter(([, t]) => t === 'mod')
            .reduce((sum, [v]) => sum + v, 0);
        const mwTotal = plugSegments
            .filter(([, t]) => t === 'masterwork')
            .reduce((sum, [v]) => sum + v, 0);

        // Base bar = displayValue minus all bonuses (like DIM)
        const baseBar = Math.max(displayValue - partsTotal - traitsTotal - modsTotal - mwTotal, 0);

        const segments: StatSegment[] = [[baseBar, 'base']];
        // Add parts (barrels, mags) — blue
        for (const seg of plugSegments.filter(([, t]) => t === 'parts')) {
            segments.push(seg);
        }
        // Add traits (Rampage, etc.) — green
        for (const seg of plugSegments.filter(([, t]) => t === 'traits')) {
            segments.push(seg);
        }
        // Add mods (Backup Mag, etc.) — purple
        for (const seg of plugSegments.filter(([, t]) => t === 'mod')) {
            segments.push(seg);
        }
        // Add masterwork — gold
        for (const seg of plugSegments.filter(([, t]) => t === 'masterwork')) {
            segments.push(seg);
        }

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
            segments,
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

// ============================================================================
// SOCKET OVERRIDE HELPERS
// ============================================================================

/**
 * Create a shallow clone of an item with specific socket plugs overridden.
 * Used for perk swap stat preview — swaps plugHash on the relevant sockets
 * so the stat pipeline recalculates with the new plug's investmentStats.
 */
function applySocketOverridesToItem(
    item: any,
    socketOverrides: Record<number, number>
): any {
    const liveSockets = item?.sockets?.sockets;
    if (!liveSockets) return item;

    const newSockets = liveSockets.map((socket: any, index: number) => {
        const override = socketOverrides[index];
        if (override !== undefined) {
            return { ...socket, plugHash: override };
        }
        return socket;
    });

    return {
        ...item,
        sockets: { sockets: newSockets },
    };
}

/** Describes a single available plug option for a socket. */
export interface PlugAlternative {
    plugHash: number;
    plugDef: any;
    isCurrentlyEquipped: boolean;
    canInsert: boolean;
}

/** Per-socket alternatives keyed by socket index. */
export type SocketAlternatives = Record<number, PlugAlternative[]>;

/**
 * Get available plug alternatives for each perk socket on an item.
 * 
 * Data sources (priority order):
 * 1. Live `reusablePlugs` (component 305) — what the player actually rolled on this instance
 * 2. Manifest `DestinyPlugSetDefinition` via `socketEntry.reusablePlugSetHash` — all possible plugs
 * 3. Manifest `socketEntry.randomizedPlugSetHash` — random roll pool
 * 4. Manifest `socketEntry.reusablePlugItems` — inline fallback
 * 
 * @param item - Live item data (with reusablePlugs if hydrated)
 * @param definition - Item manifest definition (has sockets.socketEntries)
 * @param definitions - All manifest definitions (for plug sets and plug items)
 * @returns Map of socketIndex → array of PlugAlternative
 */
export function getSocketAlternatives(
    item: any,
    definition: any,
    definitions: Record<string, any>
): SocketAlternatives {
    const result: SocketAlternatives = {};

    const liveSockets = item?.sockets?.sockets;
    const socketEntries = definition?.sockets?.socketEntries;
    if (!liveSockets || !socketEntries) return result;

    // Live reusable plugs from component 305 (keyed by socket index)
    const liveReusable = item.reusablePlugs as Record<number, Array<{ plugItemHash: number; canInsert: boolean; enabled: boolean }>> | undefined;

    for (let i = 0; i < liveSockets.length; i++) {
        const currentPlugHash = liveSockets[i]?.plugHash;
        const socketEntry = socketEntries[i];
        if (!socketEntry) continue;

        // Collect candidate plug hashes
        const candidates: Array<{ plugItemHash: number; canInsert: boolean }> = [];
        const seenHashes = new Set<number>();

        // Source 1: Live reusable plugs (component 305) — most accurate
        if (liveReusable?.[i]) {
            for (const plug of liveReusable[i]) {
                if (!seenHashes.has(plug.plugItemHash)) {
                    seenHashes.add(plug.plugItemHash);
                    candidates.push({ plugItemHash: plug.plugItemHash, canInsert: plug.canInsert });
                }
            }
        }

        // Source 2: Manifest plug set (reusablePlugSetHash)
        if (candidates.length === 0 && socketEntry.reusablePlugSetHash) {
            const plugSetDef = definitions[socketEntry.reusablePlugSetHash];
            if (plugSetDef?.reusablePlugItems) {
                for (const entry of plugSetDef.reusablePlugItems) {
                    if (!seenHashes.has(entry.plugItemHash)) {
                        seenHashes.add(entry.plugItemHash);
                        candidates.push({ plugItemHash: entry.plugItemHash, canInsert: true });
                    }
                }
            }
        }

        // Source 3: Manifest plug set (randomizedPlugSetHash)
        if (candidates.length === 0 && socketEntry.randomizedPlugSetHash) {
            const plugSetDef = definitions[socketEntry.randomizedPlugSetHash];
            if (plugSetDef?.reusablePlugItems) {
                for (const entry of plugSetDef.reusablePlugItems) {
                    if (!seenHashes.has(entry.plugItemHash)) {
                        seenHashes.add(entry.plugItemHash);
                        candidates.push({ plugItemHash: entry.plugItemHash, canInsert: true });
                    }
                }
            }
        }

        // Source 4: Inline reusablePlugItems on the socket entry
        if (candidates.length === 0 && socketEntry.reusablePlugItems) {
            for (const entry of socketEntry.reusablePlugItems) {
                if (!seenHashes.has(entry.plugItemHash)) {
                    seenHashes.add(entry.plugItemHash);
                    candidates.push({ plugItemHash: entry.plugItemHash, canInsert: true });
                }
            }
        }

        // Only include sockets with >1 alternative (i.e., there's actually something to swap)
        if (candidates.length <= 1) continue;

        // Resolve plug definitions
        const alternatives: PlugAlternative[] = [];
        for (const c of candidates) {
            const plugDef = definitions[c.plugItemHash];
            if (!plugDef?.displayProperties?.icon) continue; // skip plugs without icons
            alternatives.push({
                plugHash: c.plugItemHash,
                plugDef,
                isCurrentlyEquipped: c.plugItemHash === currentPlugHash,
                canInsert: c.canInsert,
            });
        }

        if (alternatives.length > 1) {
            result[i] = alternatives;
        }
    }

    return result;
}
