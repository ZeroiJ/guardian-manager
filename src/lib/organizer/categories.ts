/**
 * Organizer Categories — Hierarchical item category tree
 *
 * Mirrors DIM's ItemCategoryTreeNode but simplified for our use case.
 * Categories filter the items shown in the organizer table.
 */

import { ItemCategoryHashes, BucketHashes } from '@/lib/destiny-constants';
import type { CategoryNode } from './types';

// ============================================================================
// WEAPON CATEGORIES
// ============================================================================

const weaponTypes: CategoryNode[] = [
    { label: 'Auto Rifle', id: 'auto-rifle', categoryHashes: [ItemCategoryHashes.AutoRifle] },
    { label: 'Hand Cannon', id: 'hand-cannon', categoryHashes: [ItemCategoryHashes.HandCannon] },
    { label: 'Pulse Rifle', id: 'pulse-rifle', categoryHashes: [ItemCategoryHashes.PulseRifle] },
    { label: 'Scout Rifle', id: 'scout-rifle', categoryHashes: [ItemCategoryHashes.ScoutRifle] },
    { label: 'Sidearm', id: 'sidearm', categoryHashes: [ItemCategoryHashes.Sidearm] },
    { label: 'SMG', id: 'smg', categoryHashes: [ItemCategoryHashes.SubmachineGuns] },
    { label: 'Bow', id: 'bow', categoryHashes: [ItemCategoryHashes.Bows] },
    { label: 'Trace Rifle', id: 'trace-rifle', categoryHashes: [ItemCategoryHashes.TraceRifles] },
    { label: 'Shotgun', id: 'shotgun', categoryHashes: [ItemCategoryHashes.Shotgun] },
    { label: 'Fusion Rifle', id: 'fusion-rifle', categoryHashes: [ItemCategoryHashes.FusionRifle] },
    { label: 'Sniper Rifle', id: 'sniper-rifle', categoryHashes: [ItemCategoryHashes.SniperRifle] },
    { label: 'Glaive', id: 'glaive', categoryHashes: [ItemCategoryHashes.Glaives] },
    { label: 'Rocket Launcher', id: 'rocket-launcher', categoryHashes: [ItemCategoryHashes.RocketLauncher] },
    { label: 'Grenade Launcher', id: 'grenade-launcher', categoryHashes: [ItemCategoryHashes.GrenadeLaunchers] },
    { label: 'Linear Fusion', id: 'linear-fusion', categoryHashes: [ItemCategoryHashes.LinearFusionRifles] },
    { label: 'Machine Gun', id: 'machine-gun', categoryHashes: [ItemCategoryHashes.MachineGun] },
    { label: 'Sword', id: 'sword', categoryHashes: [ItemCategoryHashes.Sword] },
];

// ============================================================================
// ARMOR CATEGORIES
// ============================================================================

const armorSlots: CategoryNode[] = [
    { label: 'Helmet', id: 'helmet', bucketHashes: [BucketHashes.Helmet] },
    { label: 'Gauntlets', id: 'gauntlets', bucketHashes: [BucketHashes.Gauntlets] },
    { label: 'Chest', id: 'chest', bucketHashes: [BucketHashes.ChestArmor] },
    { label: 'Legs', id: 'legs', bucketHashes: [BucketHashes.LegArmor] },
    { label: 'Class Item', id: 'class-item', bucketHashes: [BucketHashes.ClassArmor] },
];

const armorByClass: CategoryNode[] = [
    { label: 'Titan', id: 'titan', categoryHashes: [ItemCategoryHashes.Titan] },
    { label: 'Hunter', id: 'hunter', categoryHashes: [ItemCategoryHashes.Hunter] },
    { label: 'Warlock', id: 'warlock', categoryHashes: [ItemCategoryHashes.Warlock] },
];

// ============================================================================
// FULL CATEGORY TREE
// ============================================================================

export const CATEGORY_TREE: CategoryNode[] = [
    {
        label: 'Weapons',
        id: 'weapons',
        categoryHashes: [ItemCategoryHashes.Weapon],
        isGroup: false,
        children: weaponTypes,
    },
    {
        label: 'Armor',
        id: 'armor',
        categoryHashes: [ItemCategoryHashes.Armor],
        isGroup: false,
        children: [
            {
                label: 'By Slot',
                id: 'armor-slot',
                isGroup: true,
                children: armorSlots,
            },
            {
                label: 'By Class',
                id: 'armor-class',
                isGroup: true,
                children: armorByClass,
            },
        ],
    },
];

/**
 * Find a category node by its ID path.
 * Returns null if not found.
 */
export function findCategory(id: string, tree: CategoryNode[] = CATEGORY_TREE): CategoryNode | null {
    for (const node of tree) {
        if (node.id === id) return node;
        if (node.children) {
            const found = findCategory(id, node.children);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Get the flat list of selectable (non-group) categories for quick navigation.
 */
export function getSelectableCategories(tree: CategoryNode[] = CATEGORY_TREE): CategoryNode[] {
    const result: CategoryNode[] = [];
    for (const node of tree) {
        if (!node.isGroup) result.push(node);
        if (node.children) result.push(...getSelectableCategories(node.children));
    }
    return result;
}
