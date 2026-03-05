/**
 * Organizer Columns — Full column definitions for the spreadsheet view
 *
 * Each column defines how to extract, display, sort, and export data.
 * Inspired by DIM's 40+ columns but tailored for our GuardianItem type.
 */

import type { GuardianItem } from '@/services/profile/types';
import type { ManifestDefinition } from '@/store/useInventoryStore';
import type { OrganizerColumn, ColumnContext } from './types';
import { StatHashes, ItemCategoryHashes } from '@/lib/destiny-constants';
import { getItemSeasonInfo } from '@/lib/destiny/season-info';
import { getKillTracker } from '@/lib/destiny/item-info';

// ============================================================================
// HELPERS
// ============================================================================

function getLocationLabel(item: GuardianItem, ctx: ColumnContext): string {
    if (item.owner === 'vault') return 'Vault';
    const char = ctx.characters[item.owner];
    if (!char) return item.owner;
    const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
    const equipped = item.instanceData?.isEquipped ? ' (Eq)' : '';
    return (classNames[char.classType] || 'Unknown') + equipped;
}

function getDamageLabel(damageType: number | undefined): string {
    switch (damageType) {
        case 1: return 'Kinetic';
        case 2: return 'Arc';
        case 3: return 'Solar';
        case 4: return 'Void';
        case 6: return 'Stasis';
        case 7: return 'Strand';
        default: return '';
    }
}

function getDamageColor(damageType: number | undefined): string {
    switch (damageType) {
        case 2: return '#79c8ec'; // Arc
        case 3: return '#f0631e'; // Solar
        case 4: return '#b185df'; // Void
        case 6: return '#4d88ff'; // Stasis
        case 7: return '#35d07a'; // Strand
        default: return '#d0d0d0'; // Kinetic
    }
}

function getTagLabel(tag: string | null | undefined): string {
    if (!tag) return '';
    const labels: Record<string, string> = {
        favorite: 'Fav',
        keep: 'Keep',
        infuse: 'Infuse',
        junk: 'Junk',
        archive: 'Archive',
    };
    return labels[tag] || tag;
}

function getTagEmoji(tag: string | null | undefined): string {
    if (!tag) return '';
    const emojis: Record<string, string> = {
        favorite: '\u2764', // heart
        keep: '\u2705',     // check
        infuse: '\u2B06',   // up arrow
        junk: '\u274C',     // cross
        archive: '\uD83D\uDCE6', // package
    };
    return emojis[tag] || '';
}

/** Check if an item is armor */
function isArmor(def: ManifestDefinition): boolean {
    return def.itemCategoryHashes?.includes(ItemCategoryHashes.Armor) ?? false;
}

/** Check if an item is a weapon */
function isWeapon(def: ManifestDefinition): boolean {
    return def.itemCategoryHashes?.includes(ItemCategoryHashes.Weapon) ?? false;
}

/** Get a specific stat value from an item */
function getStatValue(item: GuardianItem, statHash: number): number {
    if (!item.stats) return 0;
    const stat = item.stats[statHash];
    return stat?.value ?? 0;
}

/** Get total armor stats */
function getTotalStats(item: GuardianItem): number {
    const armorStatHashes = [
        StatHashes.Mobility, StatHashes.Resilience, StatHashes.Recovery,
        StatHashes.Discipline, StatHashes.Intellect, StatHashes.Strength,
    ];
    return armorStatHashes.reduce((sum, hash) => sum + getStatValue(item, hash), 0);
}

// ============================================================================
// COLUMN DEFINITIONS
// ============================================================================

// --- Core Columns ---

const iconColumn: OrganizerColumn = {
    id: 'icon',
    header: '',
    gridWidth: '40px',
    sortable: false,
    defaultVisible: true,
    group: 'core',
    value: () => 0,
    cell: (_item, def) => {
        const icon = def.displayProperties?.icon;
        if (!icon) return null;
        return null; // Rendered specially in the page component
    },
};

const nameColumn: OrganizerColumn = {
    id: 'name',
    header: 'Name',
    gridWidth: '1fr',
    defaultVisible: true,
    group: 'core',
    value: (_item, def) => def.displayProperties?.name || '',
    csv: (_item, def) => def.displayProperties?.name || '',
};

const powerColumn: OrganizerColumn = {
    id: 'power',
    header: 'Power',
    gridWidth: '64px',
    defaultVisible: true,
    group: 'core',
    value: (item) => item.instanceData?.primaryStat?.value ?? 0,
    csv: (item) => String(item.instanceData?.primaryStat?.value ?? ''),
};

const tierColumn: OrganizerColumn = {
    id: 'tier',
    header: 'Tier',
    gridWidth: '80px',
    defaultVisible: true,
    group: 'core',
    value: (_item, def) => def.inventory?.tierType ?? 0,
    csv: (_item, def) => def.inventory?.tierTypeName || '',
};

const typeColumn: OrganizerColumn = {
    id: 'type',
    header: 'Type',
    gridWidth: '120px',
    defaultVisible: true,
    group: 'core',
    value: (_item, def) => def.itemTypeDisplayName || '',
    csv: (_item, def) => def.itemTypeDisplayName || '',
};

const locationColumn: OrganizerColumn = {
    id: 'location',
    header: 'Location',
    gridWidth: '90px',
    defaultVisible: true,
    group: 'core',
    value: (item, _def, ctx) => getLocationLabel(item, ctx),
    csv: (item, _def, ctx) => getLocationLabel(item, ctx),
};

// --- Weapon Columns ---

const damageColumn: OrganizerColumn = {
    id: 'element',
    header: 'Element',
    gridWidth: '72px',
    defaultVisible: true,
    group: 'weapon',
    value: (item) => item.instanceData?.damageType ?? 0,
    csv: (item) => getDamageLabel(item.instanceData?.damageType),
};

// --- Armor Stat Columns ---

function makeArmorStatColumn(label: string, statHash: number): OrganizerColumn {
    return {
        id: `stat_${label.toLowerCase()}`,
        header: label.substring(0, 3).toUpperCase(),
        gridWidth: '48px',
        defaultVisible: true,
        group: 'stats',
        value: (item) => getStatValue(item, statHash),
        csv: (item) => String(getStatValue(item, statHash) || ''),
    };
}

const mobilityColumn = makeArmorStatColumn('Mobility', StatHashes.Mobility);
const resilienceColumn = makeArmorStatColumn('Resilience', StatHashes.Resilience);
const recoveryColumn = makeArmorStatColumn('Recovery', StatHashes.Recovery);
const disciplineColumn = makeArmorStatColumn('Discipline', StatHashes.Discipline);
const intellectColumn = makeArmorStatColumn('Intellect', StatHashes.Intellect);
const strengthColumn = makeArmorStatColumn('Strength', StatHashes.Strength);

const totalStatsColumn: OrganizerColumn = {
    id: 'stat_total',
    header: 'TOT',
    gridWidth: '48px',
    defaultVisible: true,
    group: 'stats',
    value: (item) => getTotalStats(item),
    csv: (item) => String(getTotalStats(item) || ''),
};

// --- Weapon Stat Columns ---

function makeWeaponStatColumn(label: string, statHash: number, width = '48px'): OrganizerColumn {
    return {
        id: `wstat_${label.toLowerCase().replace(/\s+/g, '_')}`,
        header: label,
        gridWidth: width,
        defaultVisible: false, // Most weapon stats hidden by default
        group: 'weapon_stats',
        value: (item) => getStatValue(item, statHash),
        csv: (item) => String(getStatValue(item, statHash) || ''),
    };
}

const impactColumn = makeWeaponStatColumn('Impact', StatHashes.Impact);
const rangeColumn = makeWeaponStatColumn('Range', StatHashes.Range);
const stabilityColumn = makeWeaponStatColumn('Stability', StatHashes.Stability);
const handlingColumn = makeWeaponStatColumn('Handling', StatHashes.Handling);
const reloadColumn = makeWeaponStatColumn('Reload', StatHashes.ReloadSpeed, '56px');
const rpmColumn = makeWeaponStatColumn('RPM', StatHashes.RoundsPerMinute);
const magazineColumn = makeWeaponStatColumn('Mag', StatHashes.Magazine);
const aimAssistColumn = makeWeaponStatColumn('Aim', StatHashes.AimAssistance);
const zoomColumn = makeWeaponStatColumn('Zoom', StatHashes.Zoom);
const recoilColumn = makeWeaponStatColumn('Recoil', StatHashes.RecoilDirection, '56px');

// --- Meta Columns ---

const tagColumn: OrganizerColumn = {
    id: 'tag',
    header: 'Tag',
    gridWidth: '60px',
    defaultVisible: true,
    group: 'meta',
    value: (item) => item.userTag || '',
    csv: (item) => item.userTag || '',
};

const noteColumn: OrganizerColumn = {
    id: 'note',
    header: 'Notes',
    gridWidth: '1fr',
    defaultVisible: false,
    group: 'meta',
    value: (item) => item.userNote || '',
    csv: (item) => item.userNote || '',
};

const lockedColumn: OrganizerColumn = {
    id: 'locked',
    header: 'Lock',
    gridWidth: '44px',
    defaultVisible: true,
    group: 'meta',
    value: (item) => (item.state & 1) !== 0 ? 1 : 0,
    csv: (item) => (item.state & 1) !== 0 ? 'Yes' : 'No',
};

const masterworkColumn: OrganizerColumn = {
    id: 'masterwork',
    header: 'MW',
    gridWidth: '44px',
    defaultVisible: true,
    group: 'meta',
    value: (item) => (item.state & 4) !== 0 ? 1 : 0,
    csv: (item) => (item.state & 4) !== 0 ? 'Yes' : 'No',
};

const craftedColumn: OrganizerColumn = {
    id: 'crafted',
    header: 'Craft',
    gridWidth: '48px',
    defaultVisible: false,
    group: 'meta',
    value: (item) => (item.state & 8) !== 0 ? 1 : 0,
    csv: (item) => (item.state & 8) !== 0 ? 'Yes' : 'No',
};

const seasonColumn: OrganizerColumn = {
    id: 'season',
    header: 'Season',
    gridWidth: '64px',
    defaultVisible: false,
    group: 'meta',
    value: (_item, def) => {
        const info = getItemSeasonInfo(def);
        return info?.seasonNumber ?? 0;
    },
    csv: (_item, def) => {
        const info = getItemSeasonInfo(def);
        return info ? `S${info.seasonNumber}` : '';
    },
};

const killsColumn: OrganizerColumn = {
    id: 'kills',
    header: 'Kills',
    gridWidth: '64px',
    defaultVisible: false,
    group: 'meta',
    value: (item, def) => {
        const tracker = getKillTracker(item, def);
        return tracker?.count ?? 0;
    },
    csv: (item, def) => {
        const tracker = getKillTracker(item, def);
        return tracker ? String(tracker.count) : '';
    },
};

const energyColumn: OrganizerColumn = {
    id: 'energy',
    header: 'E',
    gridWidth: '40px',
    defaultVisible: true,
    group: 'stats',
    value: (item) => item.instanceData?.energy?.energyCapacity ?? 0,
    csv: (item) => String(item.instanceData?.energy?.energyCapacity ?? ''),
};

// ============================================================================
// COLUMN SETS
// ============================================================================

/** Columns shown for weapons */
export const WEAPON_COLUMNS: OrganizerColumn[] = [
    iconColumn,
    nameColumn,
    powerColumn,
    damageColumn,
    tierColumn,
    typeColumn,
    tagColumn,
    lockedColumn,
    masterworkColumn,
    craftedColumn,
    // Weapon stats
    impactColumn,
    rangeColumn,
    stabilityColumn,
    handlingColumn,
    reloadColumn,
    rpmColumn,
    magazineColumn,
    aimAssistColumn,
    zoomColumn,
    recoilColumn,
    // Meta
    killsColumn,
    seasonColumn,
    noteColumn,
    locationColumn,
];

/** Columns shown for armor */
export const ARMOR_COLUMNS: OrganizerColumn[] = [
    iconColumn,
    nameColumn,
    powerColumn,
    tierColumn,
    typeColumn,
    tagColumn,
    lockedColumn,
    masterworkColumn,
    energyColumn,
    // Armor stats
    mobilityColumn,
    resilienceColumn,
    recoveryColumn,
    disciplineColumn,
    intellectColumn,
    strengthColumn,
    totalStatsColumn,
    // Meta
    seasonColumn,
    noteColumn,
    locationColumn,
];

/** All available columns (for column visibility toggle) */
export const ALL_COLUMNS: OrganizerColumn[] = [
    iconColumn,
    nameColumn,
    powerColumn,
    damageColumn,
    tierColumn,
    typeColumn,
    tagColumn,
    lockedColumn,
    masterworkColumn,
    craftedColumn,
    energyColumn,
    // Armor stats
    mobilityColumn,
    resilienceColumn,
    recoveryColumn,
    disciplineColumn,
    intellectColumn,
    strengthColumn,
    totalStatsColumn,
    // Weapon stats
    impactColumn,
    rangeColumn,
    stabilityColumn,
    handlingColumn,
    reloadColumn,
    rpmColumn,
    magazineColumn,
    aimAssistColumn,
    zoomColumn,
    recoilColumn,
    // Meta
    killsColumn,
    seasonColumn,
    noteColumn,
    locationColumn,
];

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export {
    getLocationLabel,
    getDamageLabel,
    getDamageColor,
    getTagLabel,
    getTagEmoji,
    isArmor,
    isWeapon,
    getStatValue,
    getTotalStats,
};
