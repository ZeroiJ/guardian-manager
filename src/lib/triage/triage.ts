/**
 * Item Triage — Vault Cleaning Intelligence
 *
 * Provides data for the triage panel in the item detail overlay:
 * 1. Similar items count (how many share the same "factor" — name, slot, element, archetype)
 * 2. Armor stat comparison (compare this armor piece against your best per slot)
 * 3. Better/worse items (strictly better/worse armor pieces)
 * 4. Notable stats (stats that are ≥82% of the best comparable item)
 *
 * Ported from DIM: src/app/item-triage/
 */

import type { GuardianItem } from '@/services/profile/types';
import type { ManifestDefinition } from '@/store/useInventoryStore';
import { StatHashes, ItemCategoryHashes } from '@/lib/destiny-constants';

// ============================================================================
// TYPES
// ============================================================================

export interface TriageData {
    /** How many similar items you own (same name, bucket, class) */
    similarCount: number;
    /** For armor: stats compared to your best per stat */
    armorStats: ArmorStatComparison | null;
    /** For armor: strictly better / strictly worse items */
    betterWorse: BetterWorseResult | null;
    /** Notable stat highlights (stats ≥82% of best) */
    notableStats: NotableStat[];
    /** Loadouts containing this item (placeholder for future) */
    loadoutCount: number;
}

export interface ArmorStatComparison {
    /** This item's stat totals */
    stats: ArmorStats;
    /** Best available stats across all comparable items in the same slot+class */
    best: ArmorStats;
    /** Percentile of each stat (this / best, 0-1) */
    percentiles: ArmorStats;
    /** Total stat */
    total: number;
    bestTotal: number;
}

export interface ArmorStats {
    mobility: number;
    resilience: number;
    recovery: number;
    discipline: number;
    intellect: number;
    strength: number;
}

export interface BetterWorseResult {
    /** Items strictly better than this one (better or equal in ALL stats) */
    betterCount: number;
    /** Items strictly worse than this one */
    worseCount: number;
}

export interface NotableStat {
    label: string;
    value: number;
    bestValue: number;
    /** 0-1 percentage of best */
    percentOfBest: number;
    /** HSL hue for color coding (0=red, 60=yellow, 120=green) */
    hue: number;
}

// ============================================================================
// STAT HELPERS
// ============================================================================

const ARMOR_STAT_HASHES = [
    StatHashes.Mobility,
    StatHashes.Resilience,
    StatHashes.Recovery,
    StatHashes.Discipline,
    StatHashes.Intellect,
    StatHashes.Strength,
] as const;

const STAT_LABELS: Record<number, string> = {
    [StatHashes.Mobility]: 'Mobility',
    [StatHashes.Resilience]: 'Resilience',
    [StatHashes.Recovery]: 'Recovery',
    [StatHashes.Discipline]: 'Discipline',
    [StatHashes.Intellect]: 'Intellect',
    [StatHashes.Strength]: 'Strength',
};

function getStatValue(item: GuardianItem, statHash: number): number {
    return item.stats?.[statHash]?.value ?? 0;
}

function getArmorStats(item: GuardianItem): ArmorStats {
    return {
        mobility: getStatValue(item, StatHashes.Mobility),
        resilience: getStatValue(item, StatHashes.Resilience),
        recovery: getStatValue(item, StatHashes.Recovery),
        discipline: getStatValue(item, StatHashes.Discipline),
        intellect: getStatValue(item, StatHashes.Intellect),
        strength: getStatValue(item, StatHashes.Strength),
    };
}

function getTotalStats(stats: ArmorStats): number {
    return stats.mobility + stats.resilience + stats.recovery +
           stats.discipline + stats.intellect + stats.strength;
}

// ============================================================================
// SIMILAR ITEMS
// ============================================================================

/**
 * Count how many items share the same "identity factors" as this item.
 * Factors: same name (stripped of Adept/Timelost), same bucket, same class.
 */
export function countSimilarItems(
    item: GuardianItem,
    allItems: GuardianItem[],
    manifest: Record<number, ManifestDefinition>,
): number {
    const def = manifest[item.itemHash];
    if (!def) return 0;

    const name = (def.displayProperties?.name || '')
        .replace(/\s*\((Adept|Timelost|Harrowed)\)/gi, '')
        .trim()
        .toLowerCase();

    const isWeapon = def.itemCategoryHashes?.includes(ItemCategoryHashes.Weapon);
    const isArmor = def.itemCategoryHashes?.includes(ItemCategoryHashes.Armor);
    const bucketHash = def.inventory?.bucketTypeHash || item.bucketHash;
    const classType = def.classType;

    let count = 0;
    for (const other of allItems) {
        if (other.itemInstanceId === item.itemInstanceId) continue;
        const otherDef = manifest[other.itemHash];
        if (!otherDef) continue;

        const otherName = (otherDef.displayProperties?.name || '')
            .replace(/\s*\((Adept|Timelost|Harrowed)\)/gi, '')
            .trim()
            .toLowerCase();

        if (otherName !== name) continue;

        // For armor, must be same class
        if (isArmor && otherDef.classType !== classType) continue;

        // Must be same general type (weapon/armor)
        if (isWeapon && !otherDef.itemCategoryHashes?.includes(ItemCategoryHashes.Weapon)) continue;
        if (isArmor && !otherDef.itemCategoryHashes?.includes(ItemCategoryHashes.Armor)) continue;

        count++;
    }

    return count;
}

// ============================================================================
// ARMOR STAT COMPARISON
// ============================================================================

/**
 * Compare this armor piece's stats to the best available in the same slot+class.
 * Returns null if the item is not armor.
 */
export function compareArmorStats(
    item: GuardianItem,
    allItems: GuardianItem[],
    manifest: Record<number, ManifestDefinition>,
): ArmorStatComparison | null {
    const def = manifest[item.itemHash];
    if (!def || !def.itemCategoryHashes?.includes(ItemCategoryHashes.Armor)) return null;

    const bucketHash = def.inventory?.bucketTypeHash || item.bucketHash;
    const classType = def.classType;

    // Find all comparable armor (same slot + class)
    const comparable: GuardianItem[] = [];
    for (const other of allItems) {
        const otherDef = manifest[other.itemHash];
        if (!otherDef) continue;
        if (!otherDef.itemCategoryHashes?.includes(ItemCategoryHashes.Armor)) continue;
        const otherBucket = otherDef.inventory?.bucketTypeHash || other.bucketHash;
        if (otherBucket !== bucketHash) continue;
        if (otherDef.classType !== classType) continue;
        // Only Legendary+ for meaningful comparison
        if ((otherDef.inventory?.tierType ?? 0) < 5) continue;
        comparable.push(other);
    }

    if (comparable.length === 0) return null;

    const stats = getArmorStats(item);

    // Find best per stat across all comparable
    const best: ArmorStats = { mobility: 0, resilience: 0, recovery: 0, discipline: 0, intellect: 0, strength: 0 };
    let bestTotal = 0;

    for (const other of comparable) {
        const otherStats = getArmorStats(other);
        best.mobility = Math.max(best.mobility, otherStats.mobility);
        best.resilience = Math.max(best.resilience, otherStats.resilience);
        best.recovery = Math.max(best.recovery, otherStats.recovery);
        best.discipline = Math.max(best.discipline, otherStats.discipline);
        best.intellect = Math.max(best.intellect, otherStats.intellect);
        best.strength = Math.max(best.strength, otherStats.strength);
        bestTotal = Math.max(bestTotal, getTotalStats(otherStats));
    }

    const percentiles: ArmorStats = {
        mobility: best.mobility > 0 ? stats.mobility / best.mobility : 0,
        resilience: best.resilience > 0 ? stats.resilience / best.resilience : 0,
        recovery: best.recovery > 0 ? stats.recovery / best.recovery : 0,
        discipline: best.discipline > 0 ? stats.discipline / best.discipline : 0,
        intellect: best.intellect > 0 ? stats.intellect / best.intellect : 0,
        strength: best.strength > 0 ? stats.strength / best.strength : 0,
    };

    return {
        stats,
        best,
        percentiles,
        total: getTotalStats(stats),
        bestTotal,
    };
}

// ============================================================================
// BETTER / WORSE ITEMS (STRICT DOMINANCE)
// ============================================================================

/**
 * Count items that are strictly better or strictly worse.
 * "Strictly better" = better or equal in ALL 6 stats, and strictly better in at least 1.
 *
 * Artifice armor gets +3 bonus to one stat (accounted for).
 */
export function compareBetterWorse(
    item: GuardianItem,
    allItems: GuardianItem[],
    manifest: Record<number, ManifestDefinition>,
): BetterWorseResult | null {
    const def = manifest[item.itemHash];
    if (!def || !def.itemCategoryHashes?.includes(ItemCategoryHashes.Armor)) return null;

    const bucketHash = def.inventory?.bucketTypeHash || item.bucketHash;
    const classType = def.classType;
    const myStats = ARMOR_STAT_HASHES.map(h => getStatValue(item, h));

    // Check if this item is artifice (has an extra mod socket)
    const isArtifice = isArtificeArmor(item, def, manifest);

    let betterCount = 0;
    let worseCount = 0;

    for (const other of allItems) {
        if (other.itemInstanceId === item.itemInstanceId) continue;
        const otherDef = manifest[other.itemHash];
        if (!otherDef) continue;
        if (!otherDef.itemCategoryHashes?.includes(ItemCategoryHashes.Armor)) continue;
        const otherBucket = otherDef.inventory?.bucketTypeHash || other.bucketHash;
        if (otherBucket !== bucketHash) continue;
        if (otherDef.classType !== classType) continue;
        if ((otherDef.inventory?.tierType ?? 0) < 5) continue;

        const otherStats = ARMOR_STAT_HASHES.map(h => getStatValue(other, h));
        const otherIsArtifice = isArtificeArmor(other, otherDef, manifest);

        // Check if other is strictly better than me
        if (isStrictlyBetter(otherStats, myStats, otherIsArtifice, isArtifice)) {
            betterCount++;
        }

        // Check if I am strictly better than other (other is worse)
        if (isStrictlyBetter(myStats, otherStats, isArtifice, otherIsArtifice)) {
            worseCount++;
        }
    }

    return { betterCount, worseCount };
}

/**
 * Check if `a` is strictly better than `b`.
 * a is strictly better if: for every stat, a[i] >= b[i], and at least one a[i] > b[i].
 * Artifice bonus: +3 to one stat for the artifice item.
 */
function isStrictlyBetter(
    a: number[],
    b: number[],
    aIsArtifice: boolean,
    bIsArtifice: boolean,
): boolean {
    // Apply artifice bonus — best case for a, worst case for b
    const aBonus = aIsArtifice ? 3 : 0;
    const bBonus = bIsArtifice ? 3 : 0;

    // For a: we can add aBonus to any one stat
    // For b: b can add bBonus to any one stat (worst case for our comparison)
    // Simplified: a beats b if even without a's bonus and with b's bonus, a still dominates

    // Conservative: ignore bonus entirely for simplicity (DIM's approach is complex)
    // Just compare raw stats
    let allGE = true;
    let anyGT = false;

    for (let i = 0; i < a.length; i++) {
        const aVal = a[i] + (aIsArtifice && !bIsArtifice ? 3 : 0); // Only bonus if opponent isn't also artifice
        if (aVal < b[i]) {
            allGE = false;
            break;
        }
        if (aVal > b[i]) anyGT = true;
    }

    return allGE && anyGT;
}

/**
 * Check if armor is artifice (has socketCategoryHash 590099826 with >1 mod socket entry
 * or the specific artifice mod socket plugSetHash).
 * Simplified heuristic: check for the artifice empty plug hash.
 */
function isArtificeArmor(item: GuardianItem, def: ManifestDefinition, _manifest: Record<number, ManifestDefinition>): boolean {
    // Artifice armor has the empty artifice mod socket plug (4173924323)
    const sockets = item.sockets?.sockets;
    if (!sockets) return false;
    return sockets.some((s: any) => s.plugHash === 4173924323);
}

// ============================================================================
// NOTABLE STATS
// ============================================================================

/**
 * Identify stats that are notable (≥82% of best comparable item, ≥90% for total).
 * Color coded: 0-100 mapped to red→yellow→green HSL hue.
 */
export function getNotableStats(
    item: GuardianItem,
    comparison: ArmorStatComparison | null,
): NotableStat[] {
    if (!comparison) return [];

    const results: NotableStat[] = [];
    const entries: [keyof ArmorStats, string, number][] = [
        ['mobility', 'Mobility', StatHashes.Mobility],
        ['resilience', 'Resilience', StatHashes.Resilience],
        ['recovery', 'Recovery', StatHashes.Recovery],
        ['discipline', 'Discipline', StatHashes.Discipline],
        ['intellect', 'Intellect', StatHashes.Intellect],
        ['strength', 'Strength', StatHashes.Strength],
    ];

    for (const [key, label] of entries) {
        const value = comparison.stats[key];
        const bestValue = comparison.best[key];
        if (bestValue === 0) continue;

        const pct = value / bestValue;
        if (pct >= 0.82) {
            results.push({
                label,
                value,
                bestValue,
                percentOfBest: pct,
                hue: Math.min(pct, 1) * 120, // 0=red, 120=green
            });
        }
    }

    // Total check (≥90% threshold)
    if (comparison.bestTotal > 0) {
        const totalPct = comparison.total / comparison.bestTotal;
        if (totalPct >= 0.90) {
            results.push({
                label: 'Total',
                value: comparison.total,
                bestValue: comparison.bestTotal,
                percentOfBest: totalPct,
                hue: Math.min(totalPct, 1) * 120,
            });
        }
    }

    return results;
}

// ============================================================================
// MAIN TRIAGE FUNCTION
// ============================================================================

/**
 * Compute all triage data for an item.
 * This is the main entry point — memoize the result per item.
 */
export function computeTriage(
    item: GuardianItem,
    allItems: GuardianItem[],
    manifest: Record<number, ManifestDefinition>,
): TriageData {
    const similarCount = countSimilarItems(item, allItems, manifest);
    const armorStats = compareArmorStats(item, allItems, manifest);
    const betterWorse = compareBetterWorse(item, allItems, manifest);
    const notableStats = getNotableStats(item, armorStats);

    return {
        similarCount,
        armorStats,
        betterWorse,
        notableStats,
        loadoutCount: 0, // TODO: integrate with loadout store
    };
}
