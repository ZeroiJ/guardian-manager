/**
 * Loadout Optimizer Types
 * 
 * Based on DIM's loadout-builder types: src/app/loadout-builder/process-worker/types.ts
 */

import { BucketHashes } from '@/lib/destiny-constants';

// ============================================================================
// Armor Stats (Mobility, Resilience, Recovery, Discipline, Intellect, Strength)
// ============================================================================

export const ARMOR_STAT_HASHES = [
    2996146975, // Mobility
    392767087,  // Resilience  
    1943323491, // Recovery
    1735777505, // Discipline
    144602215,  // Intellect
    4244567218, // Strength
] as const;

export type ArmorStatHash = typeof ARMOR_STAT_HASHES[number];

export type ArmorStats = Record<ArmorStatHash, number>;

// ============================================================================
// Bucket Hashes for Armor Slots
// ============================================================================

export const ARMOR_BUCKET_HASHES = [
    BucketHashes.Helmet,
    BucketHashes.Gauntlets,
    BucketHashes.ChestArmor,
    BucketHashes.LegArmor,
    BucketHashes.ClassArmor,
] as const;

export type ArmorBucketHash = typeof ARMOR_BUCKET_HASHES[number];

export const ARMOR_BUCKET_MAP: Record<ArmorBucketHash, string> = {
    [BucketHashes.Helmet]: 'helmet',
    [BucketHashes.Gauntlets]: 'gauntlets',
    [BucketHashes.ChestArmor]: 'chest',
    [BucketHashes.LegArmor]: 'legs',
    [BucketHashes.ClassArmor]: 'class',
};

// ============================================================================
// Auto Stat Mod Constants
// ============================================================================

/** Bonus to a single stat from an artifice armor mod slot (+3) */
export const ARTIFICE_BOOST = 3;
/** Bonus from a minor stat mod (+5, costs 1 energy) */
export const MINOR_BOOST = 5;
/** Bonus from a major stat mod (+10, costs 3 energy) */
export const MAJOR_BOOST = 10;
/** Energy cost for a minor stat mod */
export const MINOR_MOD_COST = 1;
/** Energy cost for a major stat mod */
export const MAJOR_MOD_COST = 3;

// ============================================================================
// Process Item (Simplified for Worker)
// ============================================================================

export interface ProcessItem {
    id: string;
    hash?: number;
    bucketHash: ArmorBucketHash;
    name?: string;
    isExotic: boolean;
    isArtifice: boolean;
    energyCapacity: number;
    energyUsed: number;
    /** Energy capacity remaining after existing mods (energyCapacity - energyUsed) */
    remainingEnergy: number;
    power: number;
    /** All 6 armor stats — always fully populated with 0 defaults */
    stats: ArmorStats;
    season?: number;
    source?: number;
}

// Process items grouped by bucket
export type ProcessItemsByBucket = Record<ArmorBucketHash, ProcessItem[]>;

// ============================================================================
// Stat Constraints
// ============================================================================

export interface StatConstraint {
    statHash: ArmorStatHash;
    min: number;
    max: number;
    ignored: boolean;
}

export interface StatRange {
    minStat: number;
    maxStat: number;
}

export type StatRanges = Record<ArmorStatHash, StatRange>;

// ============================================================================
// Process Result
// ============================================================================

export interface ProcessArmorSet {
    id: string;
    stats: ArmorStats;
    armorStats: ArmorStats;
    armor: Record<ArmorBucketHash, ProcessItem>;
    statMods: number[];
    enabledStatsTotal: number;
    statsTotal: number;
    power: number;
}

export interface ProcessStatistics {
    numProcessed: number;
    combos: number;
    skipReasons: {
        doubleExotic: number;
        noExotic: number;
        insufficientStats: number;
    };
}

export interface ProcessResult {
    sets: ProcessArmorSet[];
    combos: number;
    statRanges: StatRanges;
    processInfo: ProcessStatistics;
}

// ============================================================================
// Worker Messages
// ============================================================================

export interface OptimizerRequest {
    items: ProcessItemsByBucket;
    constraints: StatConstraint[];
    pinnedItems?: Partial<Record<ArmorBucketHash, ProcessItem>>;
    excludedItems?: string[];
    anyExotic?: boolean;
    stopOnFirstSet?: boolean;
}

export interface OptimizerProgress {
    completed: number;
    total: number;
}

export interface OptimizerResponse {
    result: ProcessResult | null;
    error?: string;
}

// ============================================================================
// Configuration
// ============================================================================

export interface OptimizerConfig {
    classType: number; // 0=Titan, 1=Hunter, 2=Warlock
    constraints: StatConstraint[];
    pinnedItems: Partial<Record<ArmorBucketHash, ProcessItem>>;
    excludedItems: Set<string>;
    anyExotic: boolean;
    autoStatMods: boolean;
    stopOnFirstSet: boolean;
}

// ============================================================================
// UI Types
// ============================================================================

export interface OptimizerResult extends ProcessArmorSet {
    uniqueName?: string;
}

export const DEFAULT_STAT_CONSTRAINTS: StatConstraint[] = ARMOR_STAT_HASHES.map(statHash => ({
    statHash,
    min: 0,
    max: 100,
    ignored: false,
}));

export const STAT_NAMES: Record<ArmorStatHash, string> = {
    2996146975: 'Mobility',
    392767087: 'Resilience',
    1943323491: 'Recovery',
    1735777505: 'Discipline',
    144602215: 'Intellect',
    4244567218: 'Strength',
};

export const STAT_COLORS: Record<ArmorStatHash, string> = {
    2996146975: '#7af48b', // Mobility - green
    392767087: '#79bbe7',  // Resilience - blue  
    1943323491: '#f5a623', // Recovery - orange
    1735777505: '#b286ff', // Discipline - purple
    144602215: '#ef641f',  // Intellect - red
    4244567218: '#A371C2', // Strength - void purple
};
