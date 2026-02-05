import { ItemCategoryHashes } from '../destiny-constants';

// Generic Icon Map for Weapon Types (Fallback if Manifest Category Icon is slow/missing)
export const WEAPON_TYPE_ICONS: Record<string, string> = {
    // Kinetic / General
    'Auto Rifle': 'https://www.bungie.net/common/destiny2_content/icons/f2e51a66e66c99c89422961d50c776b2.png',
    'Hand Cannon': 'https://www.bungie.net/common/destiny2_content/icons/12e6931215f91720d20d588506ac6393.png',
    'Pulse Rifle': 'https://www.bungie.net/common/destiny2_content/icons/f46487df1cb72545d17960fc062f7d3a.png',
    'Scout Rifle': 'https://www.bungie.net/common/destiny2_content/icons/873f32867e9148d57d09635b7194d21f.png',
    'Fusion Rifle': 'https://www.bungie.net/common/destiny2_content/icons/d69e46a504b77203b5a195e638dbf6d9.png',
    'Sniper Rifle': 'https://www.bungie.net/common/destiny2_content/icons/c7cba7c390554c22718e24c0840c4d87.png',
    'Shotgun': 'https://www.bungie.net/common/destiny2_content/icons/24a18012484ab9f4a7c0f135293291dc.png',
    'Machine Gun': 'https://www.bungie.net/common/destiny2_content/icons/c571987d60ed43f7be2e6c5354be2e02.png',
    'Rocket Launcher': 'https://www.bungie.net/common/destiny2_content/icons/f5d75dd13cc334005cf39f993306db36.png',
    'Sidearm': 'https://www.bungie.net/common/destiny2_content/icons/46320575e53317711d95393d93708e92.png',
    'Sword': 'https://www.bungie.net/common/destiny2_content/icons/0c238b1f7e91d8481ffec9ba7c95780d.png',
    'Bow': 'https://www.bungie.net/common/destiny2_content/icons/f1f855dd45524249a263dbab8a68bc43.png',
    'Combat Bow': 'https://www.bungie.net/common/destiny2_content/icons/f1f855dd45524249a263dbab8a68bc43.png',
    'Linear Fusion Rifle': 'https://www.bungie.net/common/destiny2_content/icons/663c5525997b5d1e44f8b965f5451a4a.png',
    'Submachine Gun': 'https://www.bungie.net/common/destiny2_content/icons/246e65a044f51e330f81d85fb666002f.png',
    'Trace Rifle': 'https://www.bungie.net/common/destiny2_content/icons/6554869c3a375cb450e181513233bd70.png',
    'Glaive': 'https://www.bungie.net/common/destiny2_content/icons/e761661d9ac5f7c35f293b6e70f6991c.png',
    'Grenade Launcher': 'https://www.bungie.net/common/destiny2_content/icons/93dc453303c20068a649ef243306a44c.png',
};

export interface GroupedInventory {
    Kinetic: Record<string, any[]>;
    Energy: Record<string, any[]>;
    Power: Record<string, any[]>;
    Armor: Record<string, any[]>;
    General: Record<string, any[]>;
}

export function groupItemsForDisplay(items: any[], definitions: Record<string, any>): GroupedInventory {
    // 1. Initialize Groups
    const groups: GroupedInventory = {
        Kinetic: {},
        Energy: {},
        Power: {},
        Armor: {},
        General: {}
    };

    // 2. Iterate and Sort
    items.forEach(item => {
        const def = definitions[item.itemHash];
        if (!def) return;

        const cats = def.itemCategoryHashes || [];

        // Determine Slot
        let slot: keyof GroupedInventory = 'General';

        if (cats.includes(ItemCategoryHashes.KineticWeapon)) {
            slot = 'Kinetic';
        } else if (cats.includes(ItemCategoryHashes.EnergyWeapon)) {
            slot = 'Energy';
        } else if (cats.includes(ItemCategoryHashes.PowerWeapon)) {
            slot = 'Power';
        } else if (cats.includes(ItemCategoryHashes.Armor)) {
            slot = 'Armor';
        }

        // Determine Type (e.g. "Auto Rifle")
        // Use itemTypeDisplayName, fallback to itemType if needed
        const typeName = def.itemTypeDisplayName || 'Unknown';

        // Add to Group
        if (!groups[slot][typeName]) {
            groups[slot][typeName] = [];
        }
        groups[slot][typeName].push(item);
    });

    // 3. Sort Items within each Type Group (by Power Level / Name)
    // For now, let's just leave them as-is, assuming the API returns them somewhat ordered or we sort later.
    // Ideally, we sort here.

    // Helper to sort a type group
    const sortGroup = (group: Record<string, any[]>) => {
        Object.keys(group).forEach(type => {
            group[type].sort((a, b) => {
                // Primary Sort: Power Level (Descending)
                const powerA = a.primaryStat?.value || 0;
                const powerB = b.primaryStat?.value || 0;
                return powerB - powerA;
            });
        });
    };

    sortGroup(groups.Kinetic);
    sortGroup(groups.Energy);
    sortGroup(groups.Power);
    sortGroup(groups.Armor);
    sortGroup(groups.General);

    return groups;
}

/**
 * Returns a sorted list of type names for a given group (e.g. ["Auto Rifle", "Bow", ...])
 */
export function getSortedTypes(group: Record<string, any[]>): string[] {
    return Object.keys(group).sort((a, b) => a.localeCompare(b));
}
