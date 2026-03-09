/**
 * Loadout Optimizer Web Worker
 * 
 * Offloads armor set optimization to a background thread to avoid
 * blocking the main React UI.
 * 
 * Based on DIM's loadout-builder process-worker/process.ts
 * 
 * Phase 2 improvements:
 * - Flat stat arrays for faster inner loop (like DIM)
 * - Auto stat mod assignment (artifice +3, minor +5, major +10)
 * - Energy-aware mod fitting
 * - lockedExoticHash support
 */

import {
    ARMOR_STAT_HASHES,
    ProcessItem,
    ProcessItemsByBucket,
    ProcessArmorSet,
    ProcessResult,
    ProcessStatistics,
    StatConstraint,
    ArmorStats,
    StatRanges,
    ARTIFICE_BOOST,
    MINOR_BOOST,
    MAJOR_BOOST,
    MINOR_MOD_COST,
    MAJOR_MOD_COST,
} from '../lib/loadout-optimizer/types';

// Bucket hash values
const HELMET_BUCKET = 3448274439;
const GAUNTLETS_BUCKET = 3551918588;
const CHEST_BUCKET = 14239492;
const LEGS_BUCKET = 20886954;
const CLASS_BUCKET = 1585787867;

const MAX_RETURNED_SETS = 200;

// The stat order — all stats are processed in this fixed order
const STAT_ORDER = ARMOR_STAT_HASHES;

interface HeapItem {
    set: ProcessArmorSet;
    key: string;
}

// Simple min-heap for top-N tracking
class SetHeap {
    private heap: HeapItem[] = [];
    private maxSize: number;

    constructor(maxSize: number) {
        this.maxSize = maxSize;
    }

    push(item: HeapItem): void {
        this.heap.push(item);
        this.bubbleUp(this.heap.length - 1);

        if (this.heap.length > this.maxSize) {
            this.pop();
        }
    }

    pop(): HeapItem | undefined {
        const min = this.heap[0];
        const last = this.heap.pop();
        if (last && this.heap.length > 0) {
            this.heap[0] = last;
            this.sinkDown(0);
        }
        return min;
    }

    get length() {
        return this.heap.length;
    }

    couldInsert(totalStats: number): boolean {
        if (this.heap.length < this.maxSize) return true;
        // Check against the worst (min) entry
        const worstKey = this.heap[0]?.key;
        if (!worstKey) return true;
        const worstTotal = parseInt(worstKey.slice(0, 4), 10);
        return totalStats >= worstTotal;
    }

    getAll(): ProcessArmorSet[] {
        return this.heap
            .sort((a, b) => b.key.localeCompare(a.key))
            .map((item) => item.set);
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[index].key < this.heap[parentIndex].key) {
                [this.heap[index], this.heap[parentIndex]] = [
                    this.heap[parentIndex],
                    this.heap[index],
                ];
                index = parentIndex;
            } else {
                break;
            }
        }
    }

    private sinkDown(index: number): void {
        const length = this.heap.length;
        while (true) {
            let smallest = index;
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;

            if (leftChild < length && this.heap[leftChild].key < this.heap[smallest].key) {
                smallest = leftChild;
            }
            if (rightChild < length && this.heap[rightChild].key < this.heap[smallest].key) {
                smallest = rightChild;
            }
            if (smallest !== index) {
                [this.heap[index], this.heap[smallest]] = [
                    this.heap[smallest],
                    this.heap[index],
                ];
                index = smallest;
            } else {
                break;
            }
        }
    }
}

// Check if stats meet minimum constraints
function meetsStatMinimums(stats: number[], constraints: StatConstraint[]): boolean {
    for (let i = 0; i < constraints.length; i++) {
        const constraint = constraints[i];
        if (constraint.ignored) continue;
        if (stats[i] < constraint.min) {
            return false;
        }
    }
    return true;
}

// Calculate the sum of non-ignored stats (capped at max)
function calculateEnabledStats(stats: number[], constraints: StatConstraint[]): number {
    let total = 0;
    for (let i = 0; i < constraints.length; i++) {
        if (constraints[i].ignored) continue;
        total += Math.min(stats[i], constraints[i].max);
    }
    return total;
}

// Calculate stat ranges from result sets
function calculateStatRanges(sets: ProcessArmorSet[]): StatRanges {
    const ranges: StatRanges = {} as StatRanges;
    for (const statHash of STAT_ORDER) {
        ranges[statHash] = { minStat: 200, maxStat: 0 };
    }

    for (const set of sets) {
        for (const statHash of STAT_ORDER) {
            const val = set.stats[statHash] ?? 0;
            if (val < ranges[statHash].minStat) ranges[statHash].minStat = val;
            if (val > ranges[statHash].maxStat) ranges[statHash].maxStat = val;
        }
    }

    if (sets.length === 0) {
        for (const statHash of STAT_ORDER) {
            ranges[statHash] = { minStat: 0, maxStat: 0 };
        }
    }

    return ranges;
}

// Build sort key for heap ordering
function getStatMixKey(enabledTotal: number, stats: number[], constraints: StatConstraint[], power: number): string {
    let key = String(enabledTotal).padStart(4, '0');
    for (let i = 0; i < constraints.length; i++) {
        if (constraints[i].ignored) continue;
        key += String(Math.min(stats[i], constraints[i].max)).padStart(3, '0');
    }
    key += String(power).padStart(4, '0');
    return key;
}

// Pre-compute a flat stat array from a ProcessItem in stat order
function itemStatArray(item: ProcessItem): number[] {
    return STAT_ORDER.map(h => item.stats[h] ?? 0);
}

// ============================================================================
// Auto Stat Mod Assignment
// ============================================================================

interface ModAssignment {
    /** Stat mod hashes that were auto-assigned (using placeholder hashes) */
    modHashes: number[];
    /** Bonus stats from auto mods, in STAT_ORDER */
    bonusStats: number[];
    /** Total energy cost of assigned mods */
    totalEnergyCost: number;
}

/**
 * Placeholder mod hashes for auto-assigned mods.
 * These represent the concept "this slot got a +10/+5/+3 mod for stat X".
 * In a full implementation these would be actual plug hashes from the manifest.
 */
const MAJOR_MOD_PLACEHOLDER = 900001;
const MINOR_MOD_PLACEHOLDER = 900002;
const ARTIFICE_MOD_PLACEHOLDER = 900003;

/**
 * Greedy auto stat mod assignment.
 * 
 * For each stat that is below its minimum constraint, tries to assign mods
 * to bring it up, prioritizing artifice (free) > major (+10) > minor (+5).
 * 
 * @returns ModAssignment if successful, null if constraints can't be met
 */
function assignAutoStatMods(
    stats: number[],
    constraints: StatConstraint[],
    armor: ProcessItem[],
): ModAssignment | null {
    const bonusStats = new Array(6).fill(0);
    const modHashes: number[] = [];

    // Calculate total remaining energy across all items
    let totalRemainingEnergy = 0;
    for (const item of armor) {
        totalRemainingEnergy += item.remainingEnergy;
    }

    // Count artifice slots available
    let artificeSlots = 0;
    for (const item of armor) {
        if (item.isArtifice) artificeSlots++;
    }

    // Calculate needed stats (what we're short by)
    const neededStats: number[] = [];
    let totalNeeded = 0;
    for (let i = 0; i < constraints.length; i++) {
        if (constraints[i].ignored || stats[i] >= constraints[i].min) {
            neededStats.push(0);
        } else {
            const needed = constraints[i].min - stats[i];
            neededStats.push(needed);
            totalNeeded += needed;
        }
    }

    // If we don't need anything, return empty assignment
    if (totalNeeded === 0) {
        return { modHashes: [], bonusStats, totalEnergyCost: 0 };
    }

    // Quick upper bound check: max possible boost
    const maxBoost = (artificeSlots * ARTIFICE_BOOST) + 
                     Math.floor(totalRemainingEnergy / MINOR_MOD_COST) * MINOR_BOOST;
    if (totalNeeded > maxBoost) {
        return null; // No way to hit targets
    }

    let energyUsed = 0;
    let artificeUsed = 0;

    // Process each stat that needs boosting, in priority order (first stat = highest priority)
    for (let i = 0; i < neededStats.length; i++) {
        let remaining = neededStats[i];
        if (remaining <= 0) continue;

        // 1. Try artifice mods first (free, +3 each)
        while (remaining > 0 && artificeUsed < artificeSlots) {
            artificeUsed++;
            bonusStats[i] += ARTIFICE_BOOST;
            remaining -= ARTIFICE_BOOST;
            modHashes.push(ARTIFICE_MOD_PLACEHOLDER);
        }

        // 2. Try major mods (+10 each, cost 3 energy)
        while (remaining > 0 && energyUsed + MAJOR_MOD_COST <= totalRemainingEnergy) {
            // Only use major if we need at least MINOR_BOOST+1 more (otherwise minor is enough)
            if (remaining > MINOR_BOOST) {
                energyUsed += MAJOR_MOD_COST;
                bonusStats[i] += MAJOR_BOOST;
                remaining -= MAJOR_BOOST;
                modHashes.push(MAJOR_MOD_PLACEHOLDER);
            } else {
                break;
            }
        }

        // 3. Try minor mods (+5 each, cost 1 energy)
        while (remaining > 0 && energyUsed + MINOR_MOD_COST <= totalRemainingEnergy) {
            energyUsed += MINOR_MOD_COST;
            bonusStats[i] += MINOR_BOOST;
            remaining -= MINOR_BOOST;
            modHashes.push(MINOR_MOD_PLACEHOLDER);
        }

        // If we still can't meet minimum, fail
        if (remaining > 0) {
            return null;
        }
    }

    return { modHashes, bonusStats, totalEnergyCost: energyUsed };
}

// ============================================================================
// Main Optimization
// ============================================================================

function optimize(
    items: ProcessItemsByBucket,
    constraints: StatConstraint[],
    pinnedItems: Partial<Record<number, ProcessItem>> = {},
    excludedItems: Set<string> = new Set(),
    anyExotic: boolean = false,
    lockedExoticHash: number | undefined = undefined,
    stopOnFirstSet: boolean = false,
    onProgress?: (completed: number, total: number) => void
): ProcessResult {
    const startTime = performance.now();

    // Get items per bucket
    const helms = items[HELMET_BUCKET] ?? [];
    const gauntlets = items[GAUNTLETS_BUCKET] ?? [];
    const chests = items[CHEST_BUCKET] ?? [];
    const legs = items[LEGS_BUCKET] ?? [];
    const classItems = items[CLASS_BUCKET] ?? [];

    // Filter out excluded items
    const filterExcluded = (item: ProcessItem) => !excludedItems.has(item.id);

    const filteredHelms = helms.filter(filterExcluded);
    const filteredGauntlets = gauntlets.filter(filterExcluded);
    const filteredChests = chests.filter(filterExcluded);
    const filteredLegs = legs.filter(filterExcluded);
    const filteredClassItems = classItems.filter(filterExcluded);

    // Handle pinned items
    const bucketToArray: Record<number, ProcessItem[]> = {
        [HELMET_BUCKET]: filteredHelms,
        [GAUNTLETS_BUCKET]: filteredGauntlets,
        [CHEST_BUCKET]: filteredChests,
        [LEGS_BUCKET]: filteredLegs,
        [CLASS_BUCKET]: filteredClassItems,
    };

    for (const [bucket, item] of Object.entries(pinnedItems)) {
        const bucketNum = Number(bucket);
        if (item && bucketToArray[bucketNum]) {
            const arr = bucketToArray[bucketNum];
            const existingIdx = arr.findIndex(i => i.id === item.id);
            if (existingIdx >= 0) arr.splice(existingIdx, 1);
            arr.unshift(item);
        }
    }

    const combos = filteredHelms.length * filteredGauntlets.length * filteredChests.length * filteredLegs.length * filteredClassItems.length;

    const stats: ProcessStatistics = {
        numProcessed: 0,
        combos,
        skipReasons: {
            doubleExotic: 0,
            noExotic: 0,
            insufficientStats: 0,
        },
    };

    const heap = new SetHeap(MAX_RETURNED_SETS);

    let processed = 0;
    const progressInterval = Math.max(1, Math.floor(combos / 100));

    // Pre-compute flat stat arrays for each item (like DIM's statsCache)
    const statsCache = new Map<string, number[]>();
    const allItems = [...filteredHelms, ...filteredGauntlets, ...filteredChests, ...filteredLegs, ...filteredClassItems];
    for (const item of allItems) {
        statsCache.set(item.id, itemStatArray(item));
    }

    // Determine if we require an exotic
    const requireExotic = lockedExoticHash === -2 || anyExotic;
    // lockedExoticHash > 0 already handled by filter (only that exotic's items are passed)

    // Main combination loop with flat stat arrays
    for (let hi = 0; hi < filteredHelms.length; hi++) {
        const helm = filteredHelms[hi];
        const helmExotic = helm.isExotic ? 1 : 0;
        const helmStats = statsCache.get(helm.id)!;

        for (let gi = 0; gi < filteredGauntlets.length; gi++) {
            const gaunt = filteredGauntlets[gi];
            const gauntExotic = gaunt.isExotic ? 1 : 0;
            const gauntStats = statsCache.get(gaunt.id)!;

            for (let ci = 0; ci < filteredChests.length; ci++) {
                const chest = filteredChests[ci];
                const chestExotic = chest.isExotic ? 1 : 0;
                const chestStats = statsCache.get(chest.id)!;

                for (let li = 0; li < filteredLegs.length; li++) {
                    const leg = filteredLegs[li];
                    const legExotic = leg.isExotic ? 1 : 0;
                    const legStats = statsCache.get(leg.id)!;

                    for (let cli = 0; cli < filteredClassItems.length; cli++) {
                        const classItem = filteredClassItems[cli];
                        processed++;

                        if (processed % progressInterval === 0) {
                            onProgress?.(processed, combos);
                        }

                        const classItemExotic = classItem.isExotic ? 1 : 0;
                        const classItemStats = statsCache.get(classItem.id)!;

                        // Check exotic constraints
                        const exoticCount = helmExotic + gauntExotic + chestExotic + legExotic + classItemExotic;
                        if (exoticCount > 1) {
                            stats.skipReasons.doubleExotic++;
                            continue;
                        }
                        if (requireExotic && exoticCount === 0) {
                            stats.skipReasons.noExotic++;
                            continue;
                        }

                        // Sum stats using flat arrays (unrolled for performance, like DIM)
                        const flatStats = [
                            helmStats[0] + gauntStats[0] + chestStats[0] + legStats[0] + classItemStats[0],
                            helmStats[1] + gauntStats[1] + chestStats[1] + legStats[1] + classItemStats[1],
                            helmStats[2] + gauntStats[2] + chestStats[2] + legStats[2] + classItemStats[2],
                            helmStats[3] + gauntStats[3] + chestStats[3] + legStats[3] + classItemStats[3],
                            helmStats[4] + gauntStats[4] + chestStats[4] + legStats[4] + classItemStats[4],
                            helmStats[5] + gauntStats[5] + chestStats[5] + legStats[5] + classItemStats[5],
                        ];

                        const armor = [helm, gaunt, chest, leg, classItem];

                        // Try auto stat mod assignment
                        const modAssignment = assignAutoStatMods(flatStats, constraints, armor);

                        // Apply bonus stats from auto mods
                        let finalStats: number[];
                        let statMods: number[];
                        if (modAssignment) {
                            finalStats = [
                                flatStats[0] + modAssignment.bonusStats[0],
                                flatStats[1] + modAssignment.bonusStats[1],
                                flatStats[2] + modAssignment.bonusStats[2],
                                flatStats[3] + modAssignment.bonusStats[3],
                                flatStats[4] + modAssignment.bonusStats[4],
                                flatStats[5] + modAssignment.bonusStats[5],
                            ];
                            statMods = modAssignment.modHashes;
                        } else {
                            finalStats = flatStats;
                            statMods = [];
                        }

                        // Check stat minimums (after mods)
                        if (!meetsStatMinimums(finalStats, constraints)) {
                            stats.skipReasons.insufficientStats++;
                            continue;
                        }

                        const enabledTotal = calculateEnabledStats(finalStats, constraints);
                        const totalAll = finalStats[0] + finalStats[1] + finalStats[2] + finalStats[3] + finalStats[4] + finalStats[5];

                        // Early rejection: check if this could beat worst set in heap
                        if (!heap.couldInsert(enabledTotal)) {
                            continue;
                        }

                        // Convert flat stats back to ArmorStats object
                        const statsObj: ArmorStats = {} as ArmorStats;
                        const armorOnlyStatsObj: ArmorStats = {} as ArmorStats;
                        for (let s = 0; s < STAT_ORDER.length; s++) {
                            statsObj[STAT_ORDER[s]] = finalStats[s];
                            armorOnlyStatsObj[STAT_ORDER[s]] = flatStats[s];
                        }

                        const set: ProcessArmorSet = {
                            id: `${helm.id}-${gaunt.id}-${chest.id}-${leg.id}-${classItem.id}`,
                            stats: statsObj,
                            armorStats: armorOnlyStatsObj,
                            armor: {
                                [HELMET_BUCKET]: helm,
                                [GAUNTLETS_BUCKET]: gaunt,
                                [CHEST_BUCKET]: chest,
                                [LEGS_BUCKET]: leg,
                                [CLASS_BUCKET]: classItem,
                            },
                            statMods,
                            enabledStatsTotal: enabledTotal,
                            statsTotal: totalAll,
                            power: Math.floor(
                                ((helm.power ?? 0) + (gaunt.power ?? 0) + (chest.power ?? 0) +
                                (leg.power ?? 0) + (classItem.power ?? 0)) / 5
                            ),
                        };

                        const key = getStatMixKey(enabledTotal, finalStats, constraints, set.power);
                        heap.push({ set, key });

                        // Stop early if requested
                        if (stopOnFirstSet && heap.length > 0) {
                            break;
                        }
                    }
                }
            }
        }
    }

    stats.numProcessed = processed;

    const resultSets = heap.getAll();

    const endTime = performance.now();
    console.log(`[LoadoutOptimizer] Processed ${processed} combinations in ${(endTime - startTime).toFixed(0)}ms, found ${resultSets.length} sets`);

    return {
        sets: resultSets,
        combos,
        statRanges: calculateStatRanges(resultSets),
        processInfo: stats,
    };
}

// Worker message handler
self.onmessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'optimize': {
            const { items, constraints, pinnedItems, excludedItems, anyExotic, lockedExoticHash, stopOnFirstSet } = payload;

            const excludedSet = new Set<string>(excludedItems ?? []);

            try {
                const result = optimize(
                    items,
                    constraints,
                    pinnedItems ?? {},
                    excludedSet,
                    anyExotic ?? false,
                    lockedExoticHash,
                    stopOnFirstSet ?? false,
                    (completed, total) => {
                        self.postMessage({
                            type: 'progress',
                            payload: { completed, total }
                        });
                    }
                );

                self.postMessage({
                    type: 'result',
                    payload: result
                });
            } catch (error) {
                self.postMessage({
                    type: 'error',
                    payload: { message: error instanceof Error ? error.message : 'Unknown error' }
                });
            }
            break;
        }

        default:
            self.postMessage({
                type: 'error',
                payload: { message: `Unknown message type: ${type}` }
            });
    }
};

export {};
