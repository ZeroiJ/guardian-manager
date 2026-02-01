/**
 * DESTINY CONSTANTS DICTIONARY
 * Ported from DIM: src/data/d2/generated-enums.ts
 * 
 * These are official Bungie hash constants for Destiny 2.
 * DO NOT MODIFY MANUALLY - regenerate from DIM source if needed.
 */

// ============================================================================
// STAT HASHES
// ============================================================================
export const StatHashes = {
    Accuracy: 1591432999,
    AimAssistance: 1345609583,
    AirborneEffectiveness: 2714457168,
    AmmoCapacity: 925767036,
    AmmoGeneration: 1931675084,
    Attack: 1480404414,
    BlastRadius: 3614673599,
    ChargeRate: 3022301683,
    ChargeTime: 2961396640,
    Defense: 3897883278,
    Discipline: 1735777505,
    DrawTime: 447667954,
    GuardEfficiency: 2762071195,
    GuardEndurance: 3736848092,
    GuardResistance: 209426660,
    Handling: 943549884,
    Impact: 4043523819,
    Intellect: 144602215,
    Magazine: 3871231066,
    Mobility: 2996146975,
    Power: 1935470627,
    Range: 1240592695,
    RecoilDirection: 2715839340,
    Recovery: 1943323491,
    ReloadSpeed: 4188031367,
    Resilience: 392767087,
    RoundsPerMinute: 4284893193,
    ShieldDuration: 1842278586,
    Stability: 155624089,
    Strength: 4244567218,
    SwingSpeed: 2837207746,
    Velocity: 2523465841,
    Zoom: 3555269338,
} as const;

// ============================================================================
// BUCKET HASHES (Inventory Slots)
// ============================================================================
export const BucketHashes = {
    KineticWeapons: 1498876634,
    EnergyWeapons: 2465295065,
    PowerWeapons: 953998645,
    Helmet: 3448274439,
    Gauntlets: 3551918588,
    ChestArmor: 14239492,
    LegArmor: 20886954,
    ClassArmor: 1585787867,
    Ghost: 4023194814,
    Vehicle: 2025709351,
    Ships: 284967655,
    Subclass: 3284755031,
    Emblems: 4274335291,
    Emotes: 1107761855,
    Finishers: 3683254069,
    Consumables: 1469714392,
    Materials: 3865314626,
    Modifications: 3313201758,
    LostItems: 215593132, // Postmaster
    General: 138197802,
    Quests: 1345459588,
    SeasonalArtifact: 1506418338,
    Engrams: 375726501,
} as const;

// ============================================================================
// ITEM CATEGORY HASHES
// ============================================================================
export const ItemCategoryHashes = {
    Weapon: 1,
    KineticWeapon: 2,
    EnergyWeapon: 3,
    PowerWeapon: 4,
    AutoRifle: 5,
    HandCannon: 6,
    PulseRifle: 7,
    ScoutRifle: 8,
    FusionRifle: 9,
    SniperRifle: 10,
    Shotgun: 11,
    MachineGun: 12,
    RocketLauncher: 13,
    Sidearm: 14,
    Armor: 20,
    Warlock: 21,
    Titan: 22,
    Hunter: 23,
    Helmets: 45,
    Arms: 46,
    Chest: 47,
    Legs: 48,
    ClassItems: 49,
    Subclasses: 50,
    Bows: 3317538576,
    Glaives: 3871742104,
    GrenadeLaunchers: 153950757,
    LinearFusionRifles: 1504945536,
    SubmachineGuns: 3954685534,
    Sword: 54,
    TraceRifles: 2489664120,
    Ghost: 39,
    Sparrows: 43,
    Ships: 42,
    Emblems: 19,
    Shaders: 41,
    Emotes: 44,
    Finishers: 1112488720,
    Engrams: 34,
    Consumables: 35,
    Materials: 40,
    Currencies: 18,
    Quest: 53,
    Bounties: 1784235469,
    WeaponMods: 610365472,
    ArmorMods: 4104513227,
} as const;

// ============================================================================
// SOCKET CATEGORY HASHES
// ============================================================================
export const SocketCategoryHashes = {
    ArmorMods: 590099826,
    ArmorPerks_LargePerk: 3154740035,
    ArmorPerks_Reusable: 2518356196,
    ArmorTier: 760375309,
    ArmorCosmetics: 1926152773,
    WeaponPerks: 4241085061, // Note: This wasn't in the enum, using known value
    IntrinsicTraits: 3956125808,
    GhostMods: 3886482628,
    GhostShellPerks: 3301318876,
    EmblemCustomization: 279738248,
    Super: 457473665,
} as const;

// ============================================================================
// TYPE EXPORTS
// ============================================================================
export type StatHash = typeof StatHashes[keyof typeof StatHashes];
export type BucketHash = typeof BucketHashes[keyof typeof BucketHashes];
export type ItemCategoryHash = typeof ItemCategoryHashes[keyof typeof ItemCategoryHashes];
export type SocketCategoryHash = typeof SocketCategoryHashes[keyof typeof SocketCategoryHashes];
