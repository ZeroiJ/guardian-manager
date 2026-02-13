export function filterItems(items: any[], query: string, definitions: any, dupeInstanceIds?: Set<string>): any[] {
    if (!query || !query.trim()) return items;
    const lowerQuery = query.toLowerCase().trim();
    
    // Split into terms
    const terms = lowerQuery.split(' ').filter(t => t.length > 0);

    // Stat mapping
    const STAT_HASHES: Record<string, number> = {
        mobility: 2996146975,
        resilience: 392767087,
        recovery: 1943323491,
        discipline: 1735777505,
        intellect: 144602215,
        strength: 4244567218,
        // Aliases
        mob: 2996146975,
        res: 392767087,
        rec: 1943323491,
        dis: 1735777505,
        int: 144602215,
        str: 4244567218,
        total: -1 // Special case handling needed if Total is not a real stat in item.stats
    };

    return items.filter(item => {
        const def = definitions[item.itemHash];
        if (!def) return false;
        
        const name = def.displayProperties.name.toLowerCase();
        const type = def.itemTypeDisplayName.toLowerCase();
        
        return terms.every(term => {
            // is:dupe
            if (term === 'is:dupe') {
                return dupeInstanceIds ? dupeInstanceIds.has(item.itemInstanceId) : false;
            }

            if (term.startsWith('is:')) {
                const keyword = term.replace('is:', '');
                // Rarity
                if (keyword === 'exotic') return def.inventory.tierType === 6;
                if (keyword === 'legendary') return def.inventory.tierType === 5;
                if (keyword === 'rare') return def.inventory.tierType === 4;
                if (keyword === 'common') return def.inventory.tierType === 2;
                
                // Category
                if (keyword === 'weapon') return def.itemType === 3;
                if (keyword === 'armor') return def.itemType === 2;
                if (keyword === 'kinetic') return item.instanceData?.damageType === 1 || def.defaultDamageType === 1;
                if (keyword === 'arc') return item.instanceData?.damageType === 2 || def.defaultDamageType === 2;
                if (keyword === 'solar') return item.instanceData?.damageType === 3 || def.defaultDamageType === 3;
                if (keyword === 'void') return item.instanceData?.damageType === 4 || def.defaultDamageType === 4;
                if (keyword === 'stasis') return item.instanceData?.damageType === 6 || def.defaultDamageType === 6;
                if (keyword === 'strand') return item.instanceData?.damageType === 7 || def.defaultDamageType === 7; // Verify hash

                return true; // Unknown keyword ignored
            }

            // perk:<name>
            if (term.startsWith('perk:')) {
                const perkQuery = term.replace('perk:', '');
                if (!item.sockets?.sockets) return false;
                
                return item.sockets.sockets.some((socket: any) => {
                    if (!socket.plugHash) return false;
                    const plugDef = definitions[socket.plugHash];
                    return plugDef?.displayProperties?.name?.toLowerCase().includes(perkQuery);
                });
            }

            // stat:<name>:<op><value>
            // Example: stat:res:>90 or stat:mobility:<50
            if (term.startsWith('stat:')) {
                // Regex to parse: stat:([a-zA-Z]+):([<>=]+)(\d+)
                const match = term.match(/^stat:([a-zA-Z]+):([<>=]+)(\d+)$/);
                if (!match) return false;

                const [, statName, op, valStr] = match;
                const targetVal = parseInt(valStr, 10);
                if (isNaN(targetVal)) return false;

                // Handle 'total' special case if needed, but assuming stats map has it or logic here
                // For now, only standard stats. 'total' is usually not in stats map directly unless calculated.
                // Assuming standard stats for now.
                const statHash = STAT_HASHES[statName];
                if (!statHash) return false; // Unknown stat

                const statValue = item.stats?.[statHash]?.value || 0;

                if (op === '>') return statValue > targetVal;
                if (op === '<') return statValue < targetVal;
                if (op === '>=') return statValue >= targetVal;
                if (op === '<=') return statValue <= targetVal;
                if (op === '=') return statValue === targetVal;
                
                return false;
            }
            
            return name.includes(term) || type.includes(term);
        });
    });
}
