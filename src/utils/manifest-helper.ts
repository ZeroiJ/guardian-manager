/**
 * MANIFEST HELPER - STAT DEFINITIONS
 * Uses destiny-constants for official hash values.
 */
import { StatHashes } from '../lib/destiny-constants';

export interface StatDefinition {
    label: string;
    sort: number;
}

/**
 * Whitelist of stats to display with labels and sort order.
 * Uses StatHashes constants for type safety.
 */
export const STAT_WHITELIST: Record<number, StatDefinition> = {
    // WEAPON STATS
    [StatHashes.RoundsPerMinute]: { label: "RPM", sort: 1 },
    [StatHashes.Impact]: { label: "Impact", sort: 2 },
    [StatHashes.Range]: { label: "Range", sort: 3 },
    [StatHashes.Stability]: { label: "Stability", sort: 4 },
    [StatHashes.Handling]: { label: "Handling", sort: 5 },
    [StatHashes.ReloadSpeed]: { label: "Reload", sort: 6 },
    [StatHashes.AimAssistance]: { label: "Aim Assist", sort: 7 },
    [StatHashes.AirborneEffectiveness]: { label: "Airborne", sort: 8 },
    [StatHashes.Zoom]: { label: "Zoom", sort: 9 },
    [StatHashes.Magazine]: { label: "Magazine", sort: 10 },
    [StatHashes.RecoilDirection]: { label: "Recoil Dir", sort: 11 },
    [StatHashes.ChargeTime]: { label: "Charge Time", sort: 12 },
    [StatHashes.DrawTime]: { label: "Draw Time", sort: 13 },
    [StatHashes.BlastRadius]: { label: "Blast Radius", sort: 14 },
    [StatHashes.Velocity]: { label: "Velocity", sort: 15 },
    [StatHashes.SwingSpeed]: { label: "Swing Speed", sort: 16 },
    [StatHashes.ShieldDuration]: { label: "Shield Duration", sort: 17 },
    [StatHashes.GuardEfficiency]: { label: "Guard Efficiency", sort: 18 },
    [StatHashes.GuardEndurance]: { label: "Guard Endurance", sort: 19 },
    [StatHashes.GuardResistance]: { label: "Guard Resist", sort: 20 },

    // ARMOR STATS
    [StatHashes.Mobility]: { label: "Mobility", sort: 1 },
    [StatHashes.Resilience]: { label: "Resilience", sort: 2 },
    [StatHashes.Recovery]: { label: "Recovery", sort: 3 },
    [StatHashes.Discipline]: { label: "Discipline", sort: 4 },
    [StatHashes.Intellect]: { label: "Intellect", sort: 5 },
    [StatHashes.Strength]: { label: "Strength", sort: 6 },
};

/**
 * Get stat definition by hash.
 */
export const getStatInfo = (hash: number): StatDefinition | undefined => {
    return STAT_WHITELIST[hash];
};
