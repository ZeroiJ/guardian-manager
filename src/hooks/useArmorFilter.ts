/**
 * useArmorFilter Hook
 * 
 * Pre-filters inventory armor into ProcessItems for the optimizer worker.
 * Reduces the number of items per slot to keep processing fast.
 */

import { useMemo } from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { BucketHashes, StatHashes } from '@/lib/destiny-constants';
import {
    ProcessItem,
    ProcessItemsByBucket,
    ArmorBucketHash,
    ArmorStats,
    ArmorStatHash,
    ARMOR_BUCKET_HASHES,
} from '@/lib/loadout-optimizer/types';


const ARMOR_STAT_HASHES: ArmorStatHash[] = [
    StatHashes.Mobility,
    StatHashes.Resilience,
    StatHashes.Recovery,
    StatHashes.Discipline,
    StatHashes.Intellect,
    StatHashes.Strength,
];

const BUCKET_HASH_TO_ARMOR_BUCKET: Record<number, ArmorBucketHash> = {
    [BucketHashes.Helmet]: BucketHashes.Helmet as ArmorBucketHash,
    [BucketHashes.Gauntlets]: BucketHashes.Gauntlets as ArmorBucketHash,
    [BucketHashes.ChestArmor]: BucketHashes.ChestArmor as ArmorBucketHash,
    [BucketHashes.LegArmor]: BucketHashes.LegArmor as ArmorBucketHash,
    [BucketHashes.ClassArmor]: BucketHashes.ClassArmor as ArmorBucketHash,
};

export interface ArmorFilterOptions {
    /** Filter by character class: 0=Titan, 1=Hunter, 2=Warlock */
    classType?: number;
    /** Include/exclude masterworked items */
    masterworked?: boolean | null;
    /** Include/exclude exotics */
    exotics?: boolean | null;
    /** Minimum energy capacity */
    minEnergy?: number;
    /** Maximum items per slot to keep (for performance) */
    maxItemsPerSlot?: number;
    /**
     * Exotic locking:
     * undefined = no preference
     * -1 = no exotic (remove all exotics)
     * -2 = any exotic (keep exotics, standard)
     * positive = lock a specific exotic by item hash
     */
    lockedExoticHash?: number;
}

export interface UseArmorFilterResult {
    /** Filtered armor items grouped by bucket */
    items: ProcessItemsByBucket;
    /** Total armor count */
    totalCount: number;
    /** Loading state */
    loading: boolean;
}

function itemToProcessItem(item: any, manifest: Record<number, any>): ProcessItem | null {
    const bucketHash = item.bucketHash;
    const armorBucket = BUCKET_HASH_TO_ARMOR_BUCKET[bucketHash];
    
    if (!armorBucket) {
        return null;
    }

    const def = manifest[item.itemHash];

    // Extract stats — always initialize all 6 to 0 so stats is never partial
    const stats: ArmorStats = {
        [StatHashes.Mobility]: 0,
        [StatHashes.Resilience]: 0,
        [StatHashes.Recovery]: 0,
        [StatHashes.Discipline]: 0,
        [StatHashes.Intellect]: 0,
        [StatHashes.Strength]: 0,
    } as ArmorStats;
    if (item.stats) {
        for (const statHash of ARMOR_STAT_HASHES) {
            const statValue = item.stats[statHash];
            if (statValue) {
                stats[statHash as ArmorStatHash] = statValue.value;
            }
        }
    }

    // Determine if exotic (tierType 6)
    const isExotic = def?.inventory?.tierType === 6;
    
    // Determine if artifice (has artifice stat bonus)
    const isArtifice = def?.investmentStats?.some(
        (s: any) => s.statTypeHash === 2779143083 // Artifice stat hash
    ) ?? false;

    // Get energy
    const energyCapacity = item.instanceData?.energy?.energyCapacity ?? 0;
    const energyUsed = item.instanceData?.energy?.energyUsed ?? 0;

    // Get power
    const power = item.instanceData?.primaryStat?.value ?? def?.quality?.minQuality ?? 0;

    return {
        id: item.itemInstanceId ?? `hash-${item.itemHash}`,
        hash: item.itemHash,
        bucketHash: armorBucket,
        name: def?.displayProperties?.name,
        icon: def?.displayProperties?.icon,
        isExotic,
        isArtifice,
        energyCapacity,
        energyUsed,
        remainingEnergy: Math.max(0, energyCapacity - energyUsed),
        power,
        stats,
    };
}

function filterAndLimitItems(
    items: ProcessItem[],
    maxItems: number,
    options: ArmorFilterOptions
): ProcessItem[] {
    let filtered = items;

    // Filter masterworked
    if (options.masterworked === true) {
        filtered = filtered.filter(i => (i.power ?? 0) >= 20); // Rough heuristic
    } else if (options.masterworked === false) {
        filtered = filtered.filter(i => (i.power ?? 0) < 20);
    }

    // Filter exotics
    if (options.exotics === true) {
        filtered = filtered.filter(i => i.isExotic);
    } else if (options.exotics === false) {
        filtered = filtered.filter(i => !i.isExotic);
    }

    // Filter by energy
    if (options.minEnergy) {
        filtered = filtered.filter(i => i.energyCapacity >= options.minEnergy!);
    }

    // Sort by total stats (descending) and limit
    filtered.sort((a, b) => {
        const aTotal = Object.values(a.stats).reduce((sum, v) => sum + (v ?? 0), 0);
        const bTotal = Object.values(b.stats).reduce((sum, v) => sum + (v ?? 0), 0);
        return bTotal - aTotal;
    });

    return filtered.slice(0, maxItems);
}

export function useArmorFilter(options: ArmorFilterOptions = {}): UseArmorFilterResult {
    const { maxItemsPerSlot = 30 } = options;
    
    const items = useInventoryStore(state => state.items);
    const manifest = useInventoryStore(state => state.manifest);

    const result = useMemo(() => {
        if (!items || items.length === 0) {
            return {
                items: {} as ProcessItemsByBucket,
                totalCount: 0,
                loading: false,
            };
        }

        // Convert all armor items to ProcessItems
        const processItems: ProcessItem[] = [];
        
        for (const item of items) {
            // Skip items without definitions
            const def = manifest[item.itemHash];
            if (!def) continue;
            
            // Only process armor
            const isArmor = def.itemCategoryHashes?.some(
                (cat: number) => cat === 20 // Armor category
            );
            if (!isArmor) continue;

            // Filter by class if specified
            if (options.classType !== undefined) {
                const itemClass = def.classType;
                if (itemClass !== 3 && itemClass !== options.classType) {
                    continue;
                }
            }

            const processItem = itemToProcessItem(item, manifest);
            if (processItem) {
                processItems.push(processItem);
            }
        }

        // Group by bucket
        const grouped: ProcessItemsByBucket = {} as ProcessItemsByBucket;
        for (const bucketHash of ARMOR_BUCKET_HASHES) {
            grouped[bucketHash] = [];
        }

        for (const item of processItems) {
            if (grouped[item.bucketHash]) {
                grouped[item.bucketHash].push(item);
            }
        }

        // Filter and limit each bucket
        for (const bucketHash of ARMOR_BUCKET_HASHES) {
            grouped[bucketHash] = filterAndLimitItems(
                grouped[bucketHash],
                maxItemsPerSlot,
                options
            );
        }

        // Apply exotic locking filter AFTER grouping
        const lockedExotic = options.lockedExoticHash;
        if (lockedExotic !== undefined) {
            if (lockedExotic === -1) {
                // No exotic mode — remove all exotics from all slots
                for (const bucketHash of ARMOR_BUCKET_HASHES) {
                    grouped[bucketHash] = grouped[bucketHash].filter(i => !i.isExotic);
                }
            } else if (lockedExotic > 0) {
                // Lock specific exotic — remove all other exotics, keep only the locked one
                for (const bucketHash of ARMOR_BUCKET_HASHES) {
                    grouped[bucketHash] = grouped[bucketHash].filter(
                        i => !i.isExotic || i.hash === lockedExotic
                    );
                }
            }
            // -2 (any exotic) = no filtering needed here, worker handles the requirement
        }

        const totalCount = Object.values(grouped).reduce(
            (sum, arr) => sum + arr.length,
            0
        );

        return {
            items: grouped,
            totalCount,
            loading: false,
        };
    }, [items, manifest, options.classType, options.masterworked, options.exotics, options.minEnergy, options.lockedExoticHash, maxItemsPerSlot]);

    return result;
}

export default useArmorFilter;
