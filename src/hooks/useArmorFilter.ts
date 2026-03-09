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

// Item state bitmasks
const ITEM_STATE_LOCKED = 1;
const ITEM_STATE_MASTERWORKED = 4;

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
}

export interface UseArmorFilterResult {
    /** Filtered armor items grouped by bucket */
    items: ProcessItemsByBucket;
    /** Total armor count */
    totalCount: number;
    /** Loading state */
    loading: boolean;
}

function itemToProcessItem(item: any): ProcessItem | null {
    const bucketHash = item.bucketHash;
    const armorBucket = BUCKET_HASH_TO_ARMOR_BUCKET[bucketHash];
    
    if (!armorBucket) {
        return null;
    }

    // Extract stats
    const stats: Partial<ArmorStats> = {};
    if (item.stats) {
        for (const statHash of ARMOR_STAT_HASHES) {
            const statValue = item.stats[statHash];
            if (statValue) {
                stats[statHash as ArmorStatHash] = statValue.value;
            }
        }
    }

    // Determine if exotic (tierType 6)
    const isExotic = item.definition?.inventory?.tierType === 6;
    
    // Determine if artifice (has artifice stat bonus)
    const isArtifice = item.definition?.investmentStats?.some(
        (s: any) => s.statTypeHash === 2779143083 // Artifice stat hash
    ) ?? false;

    // Get energy
    const energyCapacity = item.instanceData?.energy?.energyCapacity ?? 0;
    const energyUsed = item.instanceData?.energy?.energyUsed ?? 0;

    // Get power
    const power = item.instanceData?.primaryStat?.value ?? item.definition?.quality?.minQuality ?? 0;

    // Check if masterworked
    const isMasterworked = (item.state & ITEM_STATE_MASTERWORKED) !== 0;

    return {
        id: item.itemInstanceId ?? `hash-${item.itemHash}`,
        hash: item.itemHash,
        bucketHash: armorBucket,
        name: item.definition?.displayProperties?.name,
        isExotic,
        isArtifice,
        energyCapacity,
        energyUsed,
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
    const definitions = useInventoryStore(state => state.definitions);

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
            if (!item.definition) continue;
            
            // Only process armor
            const isArmor = item.definition.itemCategoryHashes?.some(
                (cat: number) => cat === 20 // Armor category
            );
            if (!isArmor) continue;

            // Filter by class if specified
            if (options.classType !== undefined) {
                const itemClass = item.definition.classType;
                if (itemClass !== 3 && itemClass !== options.classType) {
                    continue;
                }
            }

            const processItem = itemToProcessItem(item);
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

        const totalCount = Object.values(grouped).reduce(
            (sum, arr) => sum + arr.length,
            0
        );

        return {
            items: grouped,
            totalCount,
            loading: false,
        };
    }, [items, definitions, options.classType, options.masterworked, options.exotics, options.minEnergy, maxItemsPerSlot]);

    return result;
}

export default useArmorFilter;
