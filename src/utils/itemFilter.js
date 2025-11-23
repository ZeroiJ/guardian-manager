import { parseQuery } from './searchParser';

/**
 * Filters a list of items based on a search query.
 * 
 * @param {Array} items - List of items with .def (manifest definition) and .instanceData
 * @param {string} query - Search query string
 * @returns {Array} Filtered items
 */
export function filterItems(items, query) {
    if (!query) return items;

    const { text, filters } = parseQuery(query);

    return items.filter(item => {
        const def = item.def;
        if (!def) return false;

        // 1. Text Match (Name)
        if (text) {
            const name = def.displayProperties?.name?.toLowerCase() || '';
            if (!name.includes(text)) return false;
        }

        // 2. Filter: is (Rarity)
        if (filters.is.length > 0) {
            const tier = def.inventory?.tierTypeName?.toLowerCase();
            // Check if ANY of the 'is' filters match (OR logic within category)
            const matchesIs = filters.is.some(filter => tier === filter);
            if (!matchesIs) return false;
        }

        // 3. Filter: element (Damage Type)
        if (filters.element.length > 0) {
            // Damage type is usually in defaultDamageType (enum) or damageTypeHashes
            // Simple mapping for now. 
            // 1: Kinetic, 2: Arc, 3: Solar, 4: Void, 6: Stasis, 7: Strand (Approximate, need verification)
            // Better to rely on damageType definitions if available, but we might not have them loaded.
            // Let's use the item's damageType property if available on instance or def.

            // Fallback: Check item name or specific hashes if we knew them.
            // Actually, def.defaultDamageType is an integer.
            // 1=Kinetic, 2=Arc, 3=Solar, 4=Void, 5=Raid?, 6=Stasis, 7=Strand

            const DAMAGE_TYPES = {
                kinetic: 1,
                arc: 2,
                solar: 3,
                void: 4,
                stasis: 6,
                strand: 7
            };

            const itemDamageType = item.instanceData?.damageType || def.defaultDamageType;

            const matchesElement = filters.element.some(filter => {
                const targetHash = DAMAGE_TYPES[filter];
                return itemDamageType === targetHash;
            });

            if (!matchesElement) return false;
        }

        // 4. Filter: type (Item Type)
        if (filters.type.length > 0) {
            const typeName = def.itemTypeDisplayName?.toLowerCase() || '';
            const matchesType = filters.type.some(filter => typeName.includes(filter));
            if (!matchesType) return false;
        }

        return true;
    });
}
