// BUCKET HASHES for Sorting/Grouping
export const BUCKETS: Record<string, number> = {
    // Weapons
    Kinetic: 1498876634,
    Energy: 2465295065,
    Power: 953998645,

    // Armor
    Helmet: 3448274439,
    Gauntlets: 3551918588,
    Chest: 14239492,
    Legs: 20886954,
    Class: 1585787867,

    // General / Inventory
    Ghost: 4023194814,
    Vehicle: 284967655,
    Ship: 284967655,
    Emote: 2280235332,
    Finished: 2280235332, // Check this
    Consumables: 1469714392,
    Modifications: 3313201758,
};

export const STAT_HASHES: Record<string, number> = {
    Mobility: 2996146975,
    Resilience: 392767087,
    Recovery: 1943323491,
    Discipline: 1735777505,
    Intellect: 144602215,
    Strength: 4244567218,
};

export const DAMAGE_TYPES: Record<string, number> = {
    None: 0,
    Kinetic: 3373582085,
    Arc: 2303181850,
    Solar: 1847026933,
    Void: 3454344768,
    Stasis: 151347233,
    Strand: 3949783978,
};
