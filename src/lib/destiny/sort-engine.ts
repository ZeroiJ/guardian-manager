import { ItemCategoryHashes } from '../destiny-constants';

// Import Local Icons
import autoRifle from '../../assets/icons/weapons/auto_rifle.svg';
import handCannon from '../../assets/icons/weapons/hand_cannon.svg';
import pulseRifle from '../../assets/icons/weapons/pulse_rifle.svg';
import scoutRifle from '../../assets/icons/weapons/scout_rifle.svg';
import fusionRifle from '../../assets/icons/weapons/fusion_rifle.svg';
import sniperRifle from '../../assets/icons/weapons/sniper_rifle.svg';
import shotgun from '../../assets/icons/weapons/shotgun.svg';
import machinegun from '../../assets/icons/weapons/machinegun.svg';
import rocketLauncher from '../../assets/icons/weapons/rocket_launcher.svg';
import sidearm from '../../assets/icons/weapons/sidearm.svg';
import sword from '../../assets/icons/weapons/sword_heavy.svg';
import bow from '../../assets/icons/weapons/bow.svg';
import linearFusion from '../../assets/icons/weapons/wire_rifle.svg';
import smg from '../../assets/icons/weapons/smg.svg';
import traceRifle from '../../assets/icons/weapons/beam_weapon.svg';
import glaive from '../../assets/icons/weapons/glaive.svg';
import grenadeLauncher from '../../assets/icons/weapons/grenade_launcher.svg';

// Generic Icon Map for Weapon Types (Fallback if Manifest Category Icon is slow/missing)
export const WEAPON_TYPE_ICONS: Record<string, string> = {
    'Auto Rifle': autoRifle,
    'Hand Cannon': handCannon,
    'Pulse Rifle': pulseRifle,
    'Scout Rifle': scoutRifle,
    'Fusion Rifle': fusionRifle,
    'Sniper Rifle': sniperRifle,
    'Shotgun': shotgun,
    'Machine Gun': machinegun,
    'Rocket Launcher': rocketLauncher,
    'Sidearm': sidearm,
    'Sword': sword,
    'Bow': bow,
    'Combat Bow': bow,
    'Linear Fusion Rifle': linearFusion,
    'Submachine Gun': smg,
    'Trace Rifle': traceRifle,
    'Glaive': glaive,
    'Grenade Launcher': grenadeLauncher,
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
