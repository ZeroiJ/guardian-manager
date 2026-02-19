// BUCKET HASHES for Sorting/Grouping
export const BUCKETS: Record<string, number> = {
    // Weapons
    Kinetic: 1498876634,
    Energy: 2465295065,
    Power: 953998645,

    // Postmaster
    Postmaster: 215593132,

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
    // Progress
    Bounties: 1784235469,
    Quests: 1345459588,
};

// Item Category Hashes
export const ITEM_CATEGORY_QUEST_STEP = 16;

// Progression Hashes
export const PROGRESSION_CRUCIBLE_REWARD = 2206541810; // Hidden rank affecting multipliers
export const PROGRESSION_STRANGE_FAVOR = 527867935; // Dares of Eternity
export const WELL_RESTED_PERK_HASH = 2352765282;

// Obsolete/Hidden Ranks (to filter out)
export const HIDDEN_PROGRESSIONS = [
    784742260,  // Engram Ensiders (Rahool)
    2411069437, // Gunsmith Rank (Old)
    1471185389, // Xûr Rank
    // 527867935, // Strange Favor (Dares) - DIM hides this from main list usually but we might want it
];

// Major Faction Progression Hashes (Verified)
export const MAJOR_FACTION_PROGRESSIONS = {
    Vanguard: 457612306,
    Crucible: 2083746873,
    Gambit: 2755675426,
    Gunsmith: 3611615741,
    IronBanner: 599071390,
    Trials: 3696598664,
};

// Common Faction Hashes (Fallback if CoreSettings unavailable)
export const FACTION_HASHES = [
    2000925172, // Crucible
    2755675426, // Gambit
    3008065600, // Vanguard
    2105209711, // Gunsmith
    350061650,  // Trials of Osiris
    3696598664, // Competitive Division
    599071390,  // Iron Banner
    527867935,  // Strange Favor (Dares)
    // Add seasonal ranks here if needed dynamically
];

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

export const RARITY_COLORS: Record<number, string> = {
    6: '#ceae33',    // Exotic (DIM Gold)
    5: '#522f65',    // Legendary (DIM Purple)
    4: '#5076a3',    // Rare
    3: '#366f42',    // Uncommon
    2: '#c3bcb4',    // Common
    0: '#c3bcb4'     // Basic
};

export const MASTERWORK_GOLD = '#eade8b';

// --- NEW PROGRESS CONSTANTS ---

// Presentation Nodes
export const RAID_NODE = 4025982223;
export const PALE_HEART_PATHFINDER_NODE = 1062988660;

// Activity Types
export const RAID_ACTIVITY_TYPE = 2043403989;

// Raid Milestones (Known hashes for manual filtering if needed)
export const RAID_MILESTONE_HASHES = [
    2712317338, // Garden of Salvation
    // Add others if auto-detection fails
];

// Item Categories
export const ITEM_CATEGORY_WEAPON = 1;
export const ITEM_CATEGORY_ARMOR = 20;
// ITEM_CATEGORY_QUEST_STEP is already defined as 16 above (DIM uses 12? Bungie docs say 16 is "Quest Step", 12 is "Quest")
// Let's keep existing 16 but be aware.
