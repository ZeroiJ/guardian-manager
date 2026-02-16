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