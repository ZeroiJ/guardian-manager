export interface GuardianItem {
    // Core Bungie Data
    itemHash: number;
    itemInstanceId?: string;
    quantity: number;
    bindStatus: number;
    location: number;
    bucketHash: number;
    transferStatus: number;
    lockable: boolean;
    state: number;
    expirationDate?: string;

    // Added by useProfile hook
    owner: string;

    // Instance Data (if applicable)
    instanceData?: {
        damageType?: number;
        damageTypeHash?: number;
        primaryStat?: {
            statHash: number;
            value: number;
        };
        itemLevel?: number;
        quality?: number;
        isEquipped?: boolean;
        canEquip?: boolean;
        equipRequiredLevel?: number;
    };

    // User Metadata (The "Zipper" Part)
    userTag?: string | null; // e.g., 'favorite', 'junk'
    userNote?: string | null;

    // Instance components added during hydration
    /** Per-instance stats from itemComponents.stats.data[instanceId].stats */
    stats?: Record<string | number, { statHash: number; value: number }>;
    /** Per-instance sockets from itemComponents.sockets.data[instanceId] */
    sockets?: { sockets: Array<{ plugHash?: number; isEnabled?: boolean; isVisible?: boolean }> };
    /** Per-instance objectives from itemComponents.objectives.data[instanceId] */
    objectives?: { objectives: Array<{ objectiveHash: number; progress?: number; completionValue?: number; complete?: boolean; visible?: boolean }> };
}

export interface GuardianProfile {
    characters: Record<string, any>; // TODO: Type this properly with Bungie types
    items: GuardianItem[];
    currencies: any[];
    artifactPower: number;
}

// --- Unified Progress Types ---

export interface ProgressReward {
    itemHash: number;
    quantity: number;
    icon?: string;
    name?: string;
}

export interface ProgressObjective {
    objectiveHash: number;
    progress: number;
    completionValue: number;
    complete: boolean;
    description?: string;
    visible?: boolean;
}

/**
 * A unified interface for displaying any progress-related item
 * (Bounty, Quest, Milestone, Raid Challenge, Pathfinder Node)
 */
export interface ProgressItem {
    hash: number;
    instanceId?: string; // Optional (Milestones don't have one)
    name: string;
    icon: string;
    description?: string;
    
    // Status
    percent: number; // 0-100
    isComplete: boolean;
    isTracked?: boolean;
    expirationDate?: Date;
    
    // Details
    objectives: ProgressObjective[];
    rewards: ProgressReward[];
    
    // Context
    type: 'Bounty' | 'Quest' | 'Item' | 'Milestone' | 'Raid' | 'Pathfinder' | 'Challenge';
    tierType?: number; // Rarity (0-6)
}
