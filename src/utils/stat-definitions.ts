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
    3614673599: "Blast Radius",
    2523465841: "Velocity",
    2837207746: "Swing Speed",
    2094266604: "Shield Duration",
    2762071195: "Guard Efficiency",
    3736848092: "Guard Resistance",
    1842278586: "Guard Endurance",
    1591432999: "Accuracy",
    3022301683: "Charge Rate",
    2996146975: "Mobility",
    392767087: "Resilience",
    1943323491: "Recovery",
    1735777505: "Discipline",
    144602215: "Intellect",
    4244567218: "Strength",
    // Hidden / Other
    1935470627: "Power",
    1480404414: "Attack",
    3897883278: "Defense",
    2714457168: "Airborne Effectiveness",
    925767036: "Ammo Capacity",
    1555942954: "Ammo Generation"
};

/**
 * Returns true if the stat should be displayed as a progress bar.
 * Matches DIM's logic for excluding RPM, Magazine, etc.
 */
export const isBarStat = (hash: number) => {
    // Explicitly excluded stats (Text only)
    const NO_BAR_STATS = [
        1931675084, // RPM
        3871231066, // Magazine
        2715839340, // Recoil Direction (Special arc in DIM, text for now)
        447667954,  // Draw Time
        2961396640, // Charge Time (usually text)
        925767036,  // Ammo Capacity
        3555269338  // Zoom
    ];

    if (NO_BAR_STATS.includes(hash)) return false;

    // Most other visible stats are bars
    return true;
};
