import { GuardianItem } from '@/services/profile/types';

/**
 * Stat utilities for item comparison and display
 */

// Stat Hash Definitions (Destiny 2)
export const STAT_HASHES = {
  // Armor stats
  MOBILITY: 2996146975,
  RESILIENCE: 392767087,
  RECOVERY: 1943323491,
  DISCIPLINE: 1735777505,
  INTELLECT: 144602215,
  STRENGTH: 4244567218,

  // Weapon stats
  ACCURACY: 1591432999,
  BLAST_RADIUS: 155624089,
  CHARGE_TIME: 2523465841,
  DRAW_TIME: 3614673599,
  HANDLING: 276764241,
  IMPACT: 209426660,
  MAGAZINE: 925767936,
  RANGE: 3871231066,
  RECOIL: 2715839340,
  RELOAD_SPEED: 1345609583,
  RPM: 1931675084,
  VELOCITY: 1931675084,
  SWING_SPEED: 3291498656,
  GUARD_EFFICIENCY: 2837207746,
  GUARD_RESISTANCE: 2094674309,
  ZOOM: 447667954,
} as const;

// Armor stat hashes in order
export const ARMOR_STAT_ORDER = [
  STAT_HASHES.MOBILITY,
  STAT_HASHES.RESILIENCE,
  STAT_HASHES.RECOVERY,
  STAT_HASHES.DISCIPLINE,
  STAT_HASHES.INTELLECT,
  STAT_HASHES.STRENGTH,
];

/**
 * Get all stats for an item as a Record<statHash, value>
 */
export function getItemStats(item: GuardianItem): Record<number, number> {
  const stats: Record<number, number> = {};

  if (item.stats) {
    for (const [hash, stat] of Object.entries(item.stats)) {
      const statHash = typeof hash === 'string' ? parseInt(hash, 10) : hash;
      if (stat && typeof stat.value === 'number') {
        stats[statHash] = stat.value;
      }
    }
  }

  return stats;
}

/**
 * Get a specific stat value for an item
 */
export function getStatValue(item: GuardianItem, statHash: number): number | undefined {
  const stats = item.stats || {};
  const stat = stats[statHash];
  return stat?.value;
}

/**
 * Calculate total of armor stats (mobility + resilience + recovery + discipline + intellect + strength)
 */
export function calculateTotalArmorStats(item: GuardianItem): number {
  let total = 0;
  for (const statHash of ARMOR_STAT_ORDER) {
    const value = getStatValue(item, statHash);
    if (value !== undefined) {
      total += value;
    }
  }
  return total;
}

/**
 * Get stat definition from manifest (placeholder - requires definitions lookup)
 */
export function getStatDefinition(
  statHash: number,
  statDefinitions: Record<number, any>
): any | undefined {
  return statDefinitions[statHash];
}

/**
 * Get stat name from definition
 */
export function getStatName(statHash: number, statDefinitions: Record<number, any>): string {
  const def = statDefinitions[statHash];
  return def?.displayProperties?.name || 'Unknown Stat';
}

/**
 * Check if a stat is an armor stat
 */
export function isArmorStat(statHash: number): boolean {
  return ARMOR_STAT_ORDER.includes(statHash);
}

/**
 * Get the three main stats for armor tier calculation
 * (mobility, resilience, recovery for hunters/titans/warlocks)
 */
export function getArmorTierStats(
  item: GuardianItem,
  classType: number
): { mobility: number; resilience: number; recovery: number } {
  return {
    mobility: getStatValue(item, STAT_HASHES.MOBILITY) || 0,
    resilience: getStatValue(item, STAT_HASHES.RESILIENCE) || 0,
    recovery: getStatValue(item, STAT_HASHES.RECOVERY) || 0,
  };
}

/**
 * Calculate the tier (1-10) for a given stat value
 */
export function calculateTier(statValue: number): number {
  return Math.floor(statValue / 10);
}

/**
 * Calculate total tiers across armor stats
 */
export function calculateTotalTiers(item: GuardianItem): number {
  let tiers = 0;
  for (const statHash of ARMOR_STAT_ORDER) {
    const value = getStatValue(item, statHash);
    if (value !== undefined) {
      tiers += calculateTier(value);
    }
  }
  return tiers;
}

/**
 * Format stat value for display
 */
export function formatStatValue(value: number, statHash?: number): string {
  // Recoil direction has special formatting (visual indicator)
  if (statHash === STAT_HASHES.RECOIL) {
    return value.toString();
  }
  return value.toString();
}

/**
 * Compare two items by a specific stat
 * Returns: negative if item1 < item2, positive if item1 > item2, 0 if equal
 */
export function compareByStat(
  item1: GuardianItem,
  item2: GuardianItem,
  statHash: number
): number {
  const val1 = getStatValue(item1, statHash) || 0;
  const val2 = getStatValue(item2, statHash) || 0;
  return val1 - val2;
}
