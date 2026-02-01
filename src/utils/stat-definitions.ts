/**
 * Stat definitions matching DIM's itemStatAllowList order.
 * Ported from DIM: src/app/inventory/store/stats.ts
 */

/** Hash to Name mapping for weapon/armor stats */
export const STAT_HASH_MAP: Record<number, string> = {
    // Weapon Stats (in DIM display order)
    4284893193: "RPM",
    2961396640: "Charge Time",
    447667954: "Draw Time",
    3614673599: "Blast Radius",
    2523465841: "Velocity",
    2837207746: "Swing Speed",
    4043523819: "Impact",
    1240592695: "Range",
    2094266604: "Shield Duration",
    2762071195: "Guard Efficiency",
    3736848092: "Guard Resistance",
    1591432999: "Accuracy",
    155624089: "Stability",
    943549884: "Handling",
    3022301683: "Charge Rate",
    1842278586: "Guard Endurance",
    4188031367: "Reload Speed",
    1345609583: "Aim Assistance",
    2714457168: "Airborne Effectiveness",
    3555269338: "Zoom",
    1555942954: "Ammo Generation",
    2715839340: "Recoil Direction",
    3871231066: "Magazine",
    925767036: "Ammo Capacity",
    // Armor Stats
    2996146975: "Mobility",
    392767087: "Resilience",
    1943323491: "Recovery",
    1735777505: "Discipline",
    144602215: "Intellect",
    4244567218: "Strength",
};

/**
 * DIM's exact stat display order (itemStatAllowList).
 * Stats are sorted by their index in this array.
 */
export const STAT_ORDER: number[] = [
    4284893193, // RPM
    2961396640, // Charge Time
    447667954,  // Draw Time
    3614673599, // Blast Radius
    2523465841, // Velocity
    2837207746, // Swing Speed
    4043523819, // Impact
    1240592695, // Range
    2094266604, // Shield Duration
    2762071195, // Guard Efficiency
    3736848092, // Guard Resistance
    1591432999, // Accuracy
    155624089,  // Stability
    943549884,  // Handling
    3022301683, // Charge Rate
    1842278586, // Guard Endurance
    4188031367, // Reload Speed
    1345609583, // Aim Assistance
    2714457168, // Airborne Effectiveness
    3555269338, // Zoom
    1555942954, // Ammo Generation
    2715839340, // Recoil Direction
    3871231066, // Magazine
    925767036,  // Ammo Capacity
    // Armor
    2996146975, // Mobility
    392767087,  // Resilience
    1943323491, // Recovery
    1735777505, // Discipline
    144602215,  // Intellect
    4244567218, // Strength
];

/**
 * Stats that should NOT display a bar (text only or special visual).
 * Matches DIM's statsNoBar.
 */
const NO_BAR_STATS: number[] = [
    4284893193, // RPM
    3871231066, // Magazine
    2715839340, // Recoil Direction
    447667954,  // Draw Time
    2961396640, // Charge Time
];

/**
 * Returns the sort order for a stat hash.
 * Lower index = higher priority.
 */
export function getStatSortOrder(hash: number): number {
    const index = STAT_ORDER.indexOf(hash);
    return index === -1 ? 999999 + Math.abs(hash) : index;
}

/**
 * Returns true if the stat should be displayed as a progress bar.
 * Returns false for RPM, Magazine, Recoil Direction, Draw/Charge Time.
 */
export function isBarStat(hash: number): boolean {
    return !NO_BAR_STATS.includes(hash);
}

/**
 * Returns true if the stat is Recoil Direction (needs special arc visual).
 */
export function isRecoilStat(hash: number): boolean {
    return hash === 2715839340;
}
