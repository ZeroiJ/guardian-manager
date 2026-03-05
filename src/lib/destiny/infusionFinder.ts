import { BUCKETS } from '../../data/constants';

/** Gear buckets that support infusion (weapons + armor). */
const INFUSABLE_BUCKETS = new Set([
    BUCKETS.Kinetic,
    BUCKETS.Energy,
    BUCKETS.Power,
    BUCKETS.Helmet,
    BUCKETS.Gauntlets,
    BUCKETS.Chest,
    BUCKETS.Legs,
    BUCKETS.Class,
]);

const WEAPON_BUCKETS = new Set([BUCKETS.Kinetic, BUCKETS.Energy, BUCKETS.Power]);

export interface InfusionCandidate {
    item: any;          // GuardianItem
    definition: any;    // Manifest definition
    power: number;
    powerDelta: number; // How much higher than the target
    owner: string;      // Character ID or 'vault'
    isExotic: boolean;
}

/**
 * Finds all valid infusion fuel candidates for a given target item.
 *
 * Rules (Destiny 2):
 * - Fuel must be in the same bucket (e.g. Kinetic → Kinetic)
 * - Fuel must have HIGHER power than the target
 * - For weapons: any weapon in the same bucket regardless of class
 * - For armor: must be same class type OR class type 3 (universal)
 * - The target item itself is excluded
 * - Items without instanceId or without power are excluded
 *
 * Returns candidates sorted by power delta descending (highest fuel first).
 */
export function findInfusionCandidates(
    targetItem: any,
    targetDef: any,
    allItems: any[],
    definitions: Record<string, any>,
): InfusionCandidate[] {
    const targetPower = targetItem.instanceData?.primaryStat?.value;
    if (!targetPower) return [];

    // Determine the canonical bucket (use definition's bucketTypeHash, not runtime bucketHash
    // which could be postmaster 215593132)
    const targetBucket = targetDef?.inventory?.bucketTypeHash || targetItem.bucketHash;
    if (!INFUSABLE_BUCKETS.has(targetBucket)) return [];

    const isWeapon = WEAPON_BUCKETS.has(targetBucket);
    const targetClassType = targetDef?.classType ?? 3; // 3 = any

    const candidates: InfusionCandidate[] = [];

    for (const item of allItems) {
        // Skip self
        if (item.itemInstanceId === targetItem.itemInstanceId) continue;
        // Must have instance
        if (!item.itemInstanceId) continue;

        const power = item.instanceData?.primaryStat?.value;
        if (!power || power <= targetPower) continue;

        const def = definitions[item.itemHash];
        if (!def) continue;

        // Must match bucket
        const itemBucket = def?.inventory?.bucketTypeHash || item.bucketHash;
        if (itemBucket !== targetBucket) continue;

        // For armor: must be compatible class
        if (!isWeapon) {
            const itemClassType = def?.classType ?? 3;
            // Item must be wearable by the same class as the target
            // classType 3 = universal (fits any), otherwise must match
            if (itemClassType !== 3 && targetClassType !== 3 && itemClassType !== targetClassType) {
                continue;
            }
        }

        const tierType = def?.inventory?.tierType || 0;

        candidates.push({
            item,
            definition: def,
            power,
            powerDelta: power - targetPower,
            owner: item.owner,
            isExotic: tierType === 6,
        });
    }

    // Sort by power descending (highest fuel first)
    candidates.sort((a, b) => b.power - a.power);

    return candidates;
}
