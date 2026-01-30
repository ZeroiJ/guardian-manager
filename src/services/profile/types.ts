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
}

export interface GuardianProfile {
    characters: Record<string, any>; // TODO: Type this properly with Bungie types
    items: GuardianItem[];
    currencies: any[];
    artifactPower: number;
}