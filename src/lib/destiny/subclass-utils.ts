import { SocketCategoryHashes, EMPTY_PLUG_HASHES } from './destiny-constants';

export interface SubclassSocketGroup {
    socketIndex: number;
    categoryHash: number;
    categoryName: string;
    plugs: Array<{
        hash: number;
        name: string;
        icon?: string;
        canBeRemoved: boolean;
    }>;
    selectedHash?: number;
    isFragment: boolean;
}

const ABILITY_CATEGORIES = [
    SocketCategoryHashes.Super,
    SocketCategoryHashes.Abilities_Abilities,
    SocketCategoryHashes.Abilities_Abilities_Ikora,
];

const ASPECT_CATEGORIES = [
    SocketCategoryHashes.Aspects_Abilities,
    SocketCategoryHashes.Aspects_Abilities_Ikora,
    SocketCategoryHashes.Aspects_Abilities_Neomuna,
    SocketCategoryHashes.Aspects_Abilities_Stranger,
];

const FRAGMENT_CATEGORIES = [
    SocketCategoryHashes.Fragments_Abilities,
    SocketCategoryHashes.Fragments_Abilities_Ikora,
    SocketCategoryHashes.Fragments_Abilities_Neomuna,
    SocketCategoryHashes.Fragments_Abilities_Stranger,
];

const CATEGORY_NAMES: Record<number, string> = {
    [SocketCategoryHashes.Super]: 'Super',
    [SocketCategoryHashes.Abilities_Abilities]: 'Ability',
    [SocketCategoryHashes.Abilities_Abilities_Ikora]: 'Ability',
    [SocketCategoryHashes.Aspects_Abilities]: 'Aspect',
    [SocketCategoryHashes.Aspects_Abilities_Ikora]: 'Aspect',
    [SocketCategoryHashes.Aspects_Abilities_Neomuna]: 'Aspect',
    [SocketCategoryHashes.Aspects_Abilities_Stranger]: 'Aspect',
    [SocketCategoryHashes.Fragments_Abilities]: 'Fragment',
    [SocketCategoryHashes.Fragments_Abilities_Ikora]: 'Fragment',
    [SocketCategoryHashes.Fragments_Abilities_Neomuna]: 'Fragment',
    [SocketCategoryHashes.Fragments_Abilities_Stranger]: 'Fragment',
};

export function getSubclassPlugsFromManifest(
    subclassHash: number,
    manifest: Record<string, any>,
    socketOverrides?: Record<number, number>,
    liveSockets?: Array<{ plugHash?: number }>
): SubclassSocketGroup[] {
    // Get the subclass definition from InventoryItem table
    const subclassDef = manifest[subclassHash];
    
    if (!subclassDef || !subclassDef.sockets) {
        console.log('[getSubclassPlugsFromManifest] No subclass def or sockets found for hash:', subclassHash);
        return [];
    }

    const groups: SubclassSocketGroup[] = [];
    
    // Get categories from the definition
    const categories = subclassDef.sockets.socketCategories || [];
    console.log('[getSubclassPlugsFromManifest] categories:', categories);
    
    for (const category of categories) {
        const categoryHash = category.socketCategoryHash;
        const socketIndexes = category.socketIndexes || [];
        
        // Check if this is a relevant category
        const isAbility = ABILITY_CATEGORIES.includes(categoryHash);
        const isAspect = ASPECT_CATEGORIES.includes(categoryHash);
        const isFragment = FRAGMENT_CATEGORIES.includes(categoryHash);
        
        console.log('[getSubclassPlugsFromManifest] categoryHash:', categoryHash, 'isAbility:', isAbility, 'isAspect:', isAspect, 'isFragment:', isFragment);
        
        if (!isAbility && !isAspect && !isFragment) continue;
        
        const categoryName = CATEGORY_NAMES[categoryHash] || 'Unknown';
        
        // Process each socket in this category
        for (const socketIndex of socketIndexes) {
            // Get the socket entry from the definition
            const socketEntries = subclassDef.sockets.socketEntries;
            const socketDef = Array.isArray(socketEntries) ? socketEntries[socketIndex] : socketEntries?.[socketIndex];
            
            console.log('[getSubclassPlugsFromManifest] socketIndex:', socketIndex, 'socketDef:', socketDef);
            
            if (!socketDef) continue;
            
            // Get available plugs from the plug set
            const plugs: Array<{ hash: number; name: string; icon?: string; canBeRemoved: boolean }> = [];
            
            // Try reusablePlugSetHash first
            let plugSetHash = socketDef.reusablePlugSetHash;
            
            // If no reusablePlugSetHash, try randomizedPlugSetHash
            if (!plugSetHash) {
                plugSetHash = socketDef.randomizedPlugSetHash;
            }
            
            // If still no plug set, try direct reusablePlugItems on socketDef
            if (!plugSetHash && socketDef.reusablePlugItems) {
                for (const plug of socketDef.reusablePlugItems) {
                    if (EMPTY_PLUG_HASHES.has(plug.plugItemHash)) continue;
                    
                    const plugDef = manifest[plug.plugItemHash];
                    if (plugDef) {
                        plugs.push({
                            hash: plug.plugItemHash,
                            name: plugDef.displayProperties?.name || 'Unknown',
                            icon: plugDef.displayProperties?.icon,
                            canBeRemoved: isAspect || isFragment,
                        });
                    }
                }
            } else if (plugSetHash) {
                // Look up the plug set definition
                console.log('[getSubclassPlugsFromManifest] Looking up plugSetHash:', plugSetHash);
                const plugSetDef = manifest[plugSetHash];
                console.log('[getSubclassPlugsFromManifest] plugSetDef:', plugSetDef);
                
                if (plugSetDef?.reusablePlugItems) {
                    for (const plug of plugSetDef.reusablePlugItems) {
                        if (EMPTY_PLUG_HASHES.has(plug.plugItemHash)) continue;
                        
                        const plugDef = manifest[plug.plugItemHash];
                        if (plugDef) {
                            plugs.push({
                                hash: plug.plugItemHash,
                                name: plugDef.displayProperties?.name || 'Unknown',
                                icon: plugDef.displayProperties?.icon,
                                canBeRemoved: isAspect || isFragment,
                            });
                        }
                    }
                }
            }
            
            if (plugs.length > 0) {
                // Get currently selected hash (from overrides or live data)
                const selectedHash = socketOverrides?.[socketIndex] ?? liveSockets?.[socketIndex]?.plugHash;
                
                groups.push({
                    socketIndex,
                    categoryHash,
                    categoryName,
                    plugs,
                    selectedHash,
                    isFragment,
                });
            }
        }
    }
    
    // Sort: Super first, Abilities second, Aspects third, Fragments last
    const sortOrder = (hash: number) => {
        if (hash === SocketCategoryHashes.Super) return 0;
        if (ABILITY_CATEGORIES.includes(hash)) return 1;
        if (ASPECT_CATEGORIES.includes(hash)) return 2;
        if (FRAGMENT_CATEGORIES.includes(hash)) return 3;
        return 4;
    };
    
    return groups.sort((a, b) => sortOrder(a.categoryHash) - sortOrder(b.categoryHash));
}
