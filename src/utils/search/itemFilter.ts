export function filterItems(items: any[], query: string, definitions: any): any[] {
    if (!query || !query.trim()) return items;
    const lowerQuery = query.toLowerCase().trim();
    
    // Split into terms
    const terms = lowerQuery.split(' ').filter(t => t.length > 0);

    return items.filter(item => {
        const def = definitions[item.itemHash];
        if (!def) return false;
        
        const name = def.displayProperties.name.toLowerCase();
        const type = def.itemTypeDisplayName.toLowerCase();
        
        return terms.every(term => {
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
            
            return name.includes(term) || type.includes(term);
        });
    });
}
