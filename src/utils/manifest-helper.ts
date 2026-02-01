/**
 * STRICT MANUAL STAT DEFINITIONS
 * DO NOT MODIFY WITHOUT EXPLICIT OVERRIDE
 */

export interface StatDefinition {
    label: string;
    sort: number;
}

export const STAT_WHITELIST: Record<number, StatDefinition> = {
    // WEAPON STATS
    4284895488: { label: "Airborne", sort: 8 },
    1345609583: { label: "Aim Assist", sort: 7 },
    4043523819: { label: "Impact", sort: 2 },
    1240592695: { label: "Range", sort: 3 },
    155624089: { label: "Stability", sort: 4 },
    943549884: { label: "Handling", sort: 5 },
    4188031367: { label: "Reload", sort: 6 },
    1931675084: { label: "RPM", sort: 1 },
    3555269338: { label: "Zoom", sort: 9 },
    3871231066: { label: "Magazine", sort: 10 },
    2715839340: { label: "Recoil Dir", sort: 11 }, // Added Recoil Dir to ensure it appears

    // ARMOR STATS
    2996146975: { label: "Mobility", sort: 1 },
    392767087: { label: "Resilience", sort: 2 },
    1943323491: { label: "Recovery", sort: 3 },
    1735777505: { label: "Discipline", sort: 4 },
    144602215: { label: "Intellect", sort: 5 },
    4244567218: { label: "Strength", sort: 6 }
};

export const getStatInfo = (hash: number): StatDefinition | undefined => {
    return STAT_WHITELIST[hash];
};
