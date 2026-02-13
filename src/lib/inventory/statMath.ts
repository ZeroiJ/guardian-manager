// src/lib/inventory/statMath.ts

export interface StatDelta {
    statHash: number;
    value: number;
    delta: number;
    tierDelta: number;
}

export function compareStats(itemA: any, itemB: any, definitions: any): StatDelta[] {
    const results: StatDelta[] = [];
    if (!itemA || !itemB || !definitions) return results;

    const defA = definitions[itemA.itemHash];
    
    // Get Investment Stats (Base) if live stats missing, otherwise use live stats
    // Note: Live stats (item.stats) usually key by Hash directly.
    const getStats = (item: any, def: any) => {
        const stats: Record<number, number> = {};
        
        // 1. Try Live Stats
        if (item.stats) {
            Object.values(item.stats).forEach((s: any) => {
                if (s.statHash) stats[s.statHash] = s.value;
            });
        } 
        // 2. Fallback to Definition Investment Stats
        else if (def?.investmentStats) {
            def.investmentStats.forEach((s: any) => {
                stats[s.statTypeHash] = s.value;
            });
        }
        
        return stats;
    };

    const statsA = getStats(itemA, defA);
    const statsB = getStats(itemB, definitions[itemB.itemHash]);

    // Union of Stat Hashes
    const allHashes = new Set([...Object.keys(statsA), ...Object.keys(statsB)].map(Number));

    allHashes.forEach(hash => {
        // Filter out non-displayable stats if needed, or rely on UI to filter
        // Standard Armor/Weapon stats only? For now, include all common ones.
        
        const valA = statsA[hash] || 0;
        const valB = statsB[hash] || 0;
        const delta = valB - valA;
        
        const tierA = Math.floor(valA / 10);
        const tierB = Math.floor(valB / 10);
        const tierDelta = tierB - tierA;

        results.push({
            statHash: hash,
            value: valB, // We usually show Item B's value and the delta from A
            delta,
            tierDelta
        });
    });

    return results;
}
