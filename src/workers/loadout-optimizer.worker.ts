/**
 * Loadout Optimizer Web Worker
 * 
 * Offloads armor set optimization to a background thread to avoid
 * blocking the main React UI.
 * 
 * Based on DIM's loadout-builder process-worker/process.ts
 */

import {
    ARMOR_BUCKET_HASHES,
    ProcessItem,
    ProcessItemsByBucket,
    ProcessArmorSet,
    ProcessResult,
    ProcessStatistics,
    StatConstraint,
    ArmorStats,
    StatRanges,
} from '../lib/loadout-optimizer/types';

// Bucket hash values
const HELMET_BUCKET = 3448274439;
const GAUNTLETS_BUCKET = 3551918588;
const CHEST_BUCKET = 14239492;
const LEGS_BUCKET = 20886954;
const CLASS_BUCKET = 1585787867;

const MAX_RETURNED_SETS = 200;

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

    getAll(): ProcessArmorSet[] {
        return this.heap
            .sort((a, b) => b.key.localeCompare(a.key))
            .map(item => item.set);
    }

    get length(): number {
        return this.heap.length;
    }

    private bubbleUp(index: number): void {
        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            if (this.heap[parentIndex].key <= this.heap[index].key) break;
            [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
            index = parentIndex;
        }
    }

    private bubbleDown(index: number): void {
        while (true) {
            const leftChild = 2 * index + 1;
            const rightChild = 2 * index + 2;
            let smallest = index;

            if (leftChild < this.heap.length && this.heap[leftChild].key < this.heap[smallest].key) {
                smallest = leftChild;
            }
            if (rightChild < this.heap.length && this.heap[rightChild].key < this.heap[smallest].key) {
                smallest = rightChild;
            }
            if (smallest === index) break;

            [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
            index = smallest;
        }
    }

    private pop(): void {
        if (this.heap.length === 0) return;
        const last = this.heap.pop()!;
        if (this.heap.length > 0) {
            this.heap[0] = last;
            this.bubbleDown(0);
        }
    }
}

// Stat lookup for armor stats
function getStatValue(stats: Partial<ArmorStats>, statHash: number): number {
    return stats[statHash as keyof ArmorStats] ?? 0;
}

// Calculate total enabled stats (sum of non-ignored stats within range)
function calculateEnabledStats(
    stats: ArmorStats,
    constraints: StatConstraint[]
): number {
    let total = 0;
    for (const constraint of constraints) {
        if (constraint.ignored) continue;
        const value = stats[constraint.statHash] ?? 0;
        if (value >= constraint.min) {
            total += Math.min(value, constraint.max);
        }
    }
    return total;
}

// Check if stats meet minimum constraints
function meetsStatMinimums(
    stats: Partial<ArmorStats>,
    constraints: StatConstraint[]
): boolean {
    for (const constraint of constraints) {
        if (constraint.ignored) continue;
        const value = stats[constraint.statHash] ?? 0;
        if (value < constraint.min) {
            return false;
        }
    }
    return true;
}

// Calculate stat ranges for all sets
function calculateStatRanges(
    sets: ProcessArmorSet[],
    allStatHashes: number[]
): StatRanges {
    const ranges: StatRanges = {} as StatRanges;

    for (const statHash of allStatHashes) {
        ranges[statHash] = { minStat: 1000, maxStat: 0 };
    }

    for (const set of sets) {
        for (const statHash of allStatHashes) {
            const value = set.stats[statHash] ?? 0;
            if (value < ranges[statHash].minStat) {
                ranges[statHash].minStat = value;
            }
            if (value > ranges[statHash].maxStat) {
                ranges[statHash].maxStat = value;
            }
        }
    }

    return ranges;
}

// Simple stat sum for sorting
function getStatMixKey(stats: ArmorStats, constraints: StatConstraint[]): string {
    const parts: string[] = [];
    for (const constraint of constraints) {
        if (constraint.ignored) continue;
        const value = Math.min(stats[constraint.statHash] ?? 0, constraint.max);
        parts.push(String(value).padStart(3, '0'));
    }
    return parts.join('');
}

// Add all stats from two stat objects
function addStats(a: Partial<ArmorStats>, b: Partial<ArmorStats>): ArmorStats {
    const result: ArmorStats = {} as ArmorStats;
    for (const key of Object.keys(a) as (keyof ArmorStats)[]) {
        result[key] = (a[key as keyof ArmorStats] ?? 0) + (b[key as keyof ArmorStats] ?? 0);
    }
    return result;
}

// Main optimization function
function optimize(
    items: ProcessItemsByBucket,
    constraints: StatConstraint[],
    pinnedItems: Partial<Record<number, ProcessItem>> = {},
    excludedItems: Set<string> = new Set(),
    anyExotic: boolean = false,
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

    // Add pinned items if not excluded
    const bucketToArray: Record<number, ProcessItem[]> = {
        [HELMET_BUCKET]: filteredHelms,
        [GAUNTLETS_BUCKET]: filteredGauntlets,
        [CHEST_BUCKET]: filteredChests,
        [LEGS_BUCKET]: filteredLegs,
        [CLASS_BUCKET]: filteredClassItems,
    };

    // Insert pinned items first
    for (const [bucket, item] of Object.entries(pinnedItems)) {
        const bucketNum = Number(bucket);
        if (item && bucketToArray[bucketNum]) {
            const arr = bucketToArray[bucketNum];
            // Remove any existing item with same id
            const existingIdx = arr.findIndex(i => i.id === item.id);
            if (existingIdx >= 0) arr.splice(existingIdx, 1);
            // Add pinned item at front
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

    // Main combination loop
    for (const helm of filteredHelms) {
        for (const gaunt of filteredGauntlets) {
            for (const chest of filteredChests) {
                for (const leg of filteredLegs) {
                    for (const classItem of filteredClassItems) {
                        processed++;

                        if (processed % progressInterval === 0) {
                            onProgress?.(processed, combos);
                        }

                        // Check for double exotic (but allow if anyExotic is false)
                        if (!anyExotic) {
                            const exoticCount = [helm, gaunt, chest, leg, classItem].filter(i => i.isExotic).length;
                            if (exoticCount > 1) {
                                stats.skipReasons.doubleExotic++;
                                continue;
                            }
                        }

                        // Calculate base stats
                        let totalStats = addStats(
                            addStats(
                                addStats(addStats(helm.stats, gaunt.stats), chest.stats),
                                leg.stats
                            ),
                            classItem.stats
                        );

                        // Quick stat minimum check (early rejection)
                        if (!meetsStatMinimums(totalStats, constraints)) {
                            stats.skipReasons.insufficientStats++;
                            continue;
                        }

                        // Create the armor set
                        const set: ProcessArmorSet = {
                            id: `${helm.id}-${gaunt.id}-${chest.id}-${leg.id}-${classItem.id}`,
                            stats: totalStats,
                            armorStats: { ...totalStats },
                            armor: {
                                [HELMET_BUCKET]: helm,
                                [GAUNTLETS_BUCKET]: gaunt,
                                [CHEST_BUCKET]: chest,
                                [LEGS_BUCKET]: leg,
                                [CLASS_BUCKET]: classItem,
                            },
                            statMods: [],
                            enabledStatsTotal: calculateEnabledStats(totalStats, constraints),
                            statsTotal: Object.values(totalStats).reduce((a, b) => a + b, 0),
                            power: Math.floor(
                                ((helm.power ?? 0) + (gaunt.power ?? 0) + (chest.power ?? 0) + 
                                (leg.power ?? 0) + (classItem.power ?? 0)) / 5
                            ),
                        };

                        // Add to heap
                        const key = getStatMixKey(set.stats, constraints) + String(set.power).padStart(4, '0');
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

    const statHashes = constraints.map(c => c.statHash);

    return {
        sets: resultSets,
        combos,
        statRanges: calculateStatRanges(resultSets, statHashes),
        processInfo: stats,
    };
}

// Worker message handler
self.onmessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    switch (type) {
        case 'optimize': {
            const { items, constraints, pinnedItems, excludedItems, anyExotic, stopOnFirstSet } = payload;

            const excludedSet = new Set(excludedItems ?? []);

            try {
                const result = optimize(
                    items,
                    constraints,
                    pinnedItems ?? {},
                    excludedSet,
                    anyExotic ?? false,
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
