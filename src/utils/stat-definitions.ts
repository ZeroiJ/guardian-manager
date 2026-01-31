export const STAT_HASH_MAP: Record<number, string> = {
    // --- Core Weapon Stats ---
    4284895488: "Airborne Effectiveness",
    1345609583: "Aim Assistance",
    2961396640: "Charge Time",
    447667954: "Draw Time",
    943549884: "Handling",
    4043523819: "Impact",
    3871231066: "Magazine",
    1240592695: "Range",
    2715839340: "Recoil Direction",
    4188031367: "Reload Speed",
    1931675084: "RPM",
    155624089: "Stability",
    3555269338: "Zoom",
    // --- Armor Stats ---
    2996146975: "Mobility",
    392767087: "Resilience",
    1943323491: "Recovery",
    1735777505: "Discipline",
    144602215: "Intellect",
    4244567218: "Strength"
};

/**
 * Returns true if the stat should be displayed as a progress bar.
 */
export const isBarStat = (hash: number) => {
    return [
        1345609583, // Aim Assist
        943549884,  // Handling
        4043523819, // Impact
        1240592695, // Range
        4188031367, // Reload
        155624089,  // Stability
        2715839340, // Recoil Direction (Special case usually)
        2961396640, // Charge Time (sometimes bar)
        4284895488  // AE
    ].includes(hash);
};
