import { BUCKETS } from '../../data/constants';

// Standard "Equippable" Buckets
const POWER_BUCKETS = [
    BUCKETS.Kinetic,
    BUCKETS.Energy,
    BUCKETS.Power,
    BUCKETS.Helmet,
    BUCKETS.Gauntlets,
    BUCKETS.Chest,
    BUCKETS.Legs,
    BUCKETS.Class
];

interface PowerItem {
    itemHash: number;
    power: number;
    tierType: number; // 6 = Exotic
    bucketHash: number;
    classType: number; // 3 = any, 0=Titan, etc
    instanceId: string;
}

/**
 * Calculates the maximum possible power level for a specific character class.
 * Respects the constraint of only 1 Exotic Weapon and 1 Exotic Armor.
 */
export function calculateMaxPower(
    items: any[],
    definitions: Record<string, any>,
    targetClassType: number
): number {
    // 1. Filter and Map items to a lighter structure
    const candidates: PowerItem[] = items
        .filter(item => {
            const def = definitions[item.itemHash];
            if (!def) return false;

            const power = item.instanceData?.primaryStat?.value;
            if (!power) return false;

            const bucketHash = def.inventory?.bucketTypeHash;
            // Must be in a gear slot
            if (!POWER_BUCKETS.includes(bucketHash)) return false;

            // Must be compatible class (or ClassType 3 = Any)
            const itemClass = def.classType;
            if (itemClass !== 3 && itemClass !== targetClassType) return false;

            return true;
        })
        .map(item => {
            const def = definitions[item.itemHash];
            return {
                itemHash: item.itemHash,
                power: item.instanceData.primaryStat.value,
                tierType: def.inventory?.tierType || 0,
                bucketHash: def.inventory.bucketTypeHash,
                classType: def.classType,
                instanceId: item.itemInstanceId
            };
        });

    // 2. Group by Bucket
    const itemsByBucket: Record<number, PowerItem[]> = {};
    POWER_BUCKETS.forEach(h => itemsByBucket[h] = []);

    candidates.forEach(item => {
        if (itemsByBucket[item.bucketHash]) {
            itemsByBucket[item.bucketHash].push(item);
        }
    });

    // Sort items in each bucket descending by power
    Object.values(itemsByBucket).forEach(bucketList => bucketList.sort((a, b) => b.power - a.power));

    // 3. Find the base max without exotics constraint concern logic 
    //    (Actually we MUST respect exotics. Simple Greedy approach fails if best weapon is exotic AND best armor is exotic).

    // We can iterate the two simple states:
    // Case A: Exotic Weapon allowed (Best Exotic Weapon + Best Legendaries in other slots)
    // Case B: Exotic Armor allowed (Best Exotic Armor + Best Legendaries in other slots)
    // Note: Can't have both. 
    // However, we CAN have NO exotics if legendaries are higher.

    // Better Algorithm:
    // 1. Get the absolute best item for every slot regardless of exotic rules.
    // 2. Check if that loadout is valid.
    // 3. If invalid (has >1 exotic weapon OR >1 exotic armor - wait, rules are separate. 
    //    Rule: Max 1 Exotic WEAPON. Max 1 Exotic ARMOR. They are independent constraints.
    //    So we can solve Weapons and Armor independently.

    // Solve Max Weapons Power
    const maxWeaponsPower = solveSubproblem(
        [BUCKETS.Kinetic, BUCKETS.Energy, BUCKETS.Power],
        itemsByBucket
    );

    // Solve Max Armor Power
    const maxArmorPower = solveSubproblem(
        [BUCKETS.Helmet, BUCKETS.Gauntlets, BUCKETS.Chest, BUCKETS.Legs, BUCKETS.Class],
        itemsByBucket
    );

    const totalPower = maxWeaponsPower + maxArmorPower;
    return totalPower / 8;
}

function solveSubproblem(buckets: number[], itemsByBucket: Record<number, PowerItem[]>): number {
    // We want to maximize sum of power across these buckets.
    // Constraint: Count(Exotics) <= 1.

    // Approach:
    // Option 1: No Exotics. Take best Non-Exotic in each slot.
    // Option 2: Exotic in Slot 1. Take best Exotic in Slot 1, best Non-Exotic in others.
    // Option 3: Exotic in Slot 2... etc.

    let bestSum = 0;

    // 1. Try No Exotics
    let sumNoExo = 0;
    let validNoExo = true;
    for (const b of buckets) {
        const bestLegendary = itemsByBucket[b].find(i => i.tierType !== 6);
        if (!bestLegendary) {
            // Need fallback? If user ONLY has exotics for a slot, this permutation is impossible?
            // Actually in Destiny you always have white gear etc, but theoretically possible.
            // If we can't fill a slot, this calc is busted.
            // But let's assume we use the "best item" if no legendary exists, it acts as the exotic choice.
            // For simplify: If strictly no legendary, we skip this path.
            // But simpler: Just iterate all permutation of "Apply Exotic to Bucket X".
        }
        if (bestLegendary) sumNoExo += bestLegendary.power;
        else validNoExo = false; // logic gap: what if slot is empty? assume 0
    }
    if (validNoExo) bestSum = Math.max(bestSum, sumNoExo);

    // 2. Try Exotic in each Slot X
    for (const exoticBucket of buckets) {
        let currentSum = 0;
        let possible = true;

        for (const b of buckets) {
            if (b === exoticBucket) {
                // Must pick best item (Exotic OR Legendary, whichever is highest)
                // Actually, simply "Best Item" is fine, we are AUTHORIZING an exotic here.
                const best = itemsByBucket[b][0];
                if (!best) { possible = false; break; }
                currentSum += best.power;
            } else {
                // Must pick best Non-Exotic
                const bestNonExo = itemsByBucket[b].find(i => i.tierType !== 6);
                if (!bestNonExo) { possible = false; break; }
                currentSum += bestNonExo.power;
            }
        }
        if (possible) bestSum = Math.max(bestSum, currentSum);
    }

    // Fallback: If user has literally only exotics in multiple slots?
    // The "bestSum" logic above covers 0 exotics, and 1 exotic.
    // If a user has NO legendaries for a slot, they literally cannot equip a full loadout.
    // But we should just return what we have.

    return bestSum;
}
