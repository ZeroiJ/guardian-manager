import { EMPTY_PLUG_HASHES } from '../destiny-constants';

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

function getCategoryFromPlug(plugDef: any): string {
    if (!plugDef?.plug?.plugCategoryIdentifier) return 'Ability';
    
    const id = plugDef.plug.plugCategoryIdentifier.toLowerCase();
    
    if (id.includes('aspect')) return 'Aspect';
    if (id.includes('fragment')) return 'Fragment';
    if (id.includes('super')) return 'Super';
    
    return 'Ability';
}

function getSortOrder(categoryName: string): number {
    switch (categoryName) {
        case 'Super': return 0;
        case 'Ability': return 1;
        case 'Aspect': return 2;
        case 'Fragment': return 3;
        default: return 4;
    }
}

export function getSubclassPlugsFromManifest(
    subclassHash: number,
    manifest: Record<string, any>,
    socketOverrides?: Record<number, number>,
    liveSockets?: Array<{ plugHash?: number }>
): SubclassSocketGroup[] {
    const subclassDef = manifest[subclassHash];
    
    if (!subclassDef || !subclassDef.sockets) {
        console.log('[getSubclassPlugsFromManifest] No subclass def or sockets for hash:', subclassHash);
        return [];
    }

    const groups: SubclassSocketGroup[] = [];
    
    // Get ALL socket entries from the subclass definition
    const socketEntries = subclassDef.sockets.socketEntries || [];
    
    // Iterate over all sockets
    for (let socketIndex = 0; socketIndex < socketEntries.length; socketIndex++) {
        const socketDef = socketEntries[socketIndex];
        if (!socketDef) continue;
        
        // Get available plugs
        const plugs: Array<{ hash: number; name: string; icon?: string; canBeRemoved: boolean }> = [];
        let samplePlugDef: any = null;
        
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
                    // Use first valid plug to determine category
                    if (!samplePlugDef) samplePlugDef = plugDef;
                    
                    plugs.push({
                        hash: plug.plugItemHash,
                        name: plugDef.displayProperties?.name || 'Unknown',
                        icon: plugDef.displayProperties?.icon,
                        canBeRemoved: true, // All subclass plugs can be removed
                    });
                }
            }
        } else if (plugSetHash) {
            const plugSetDef = manifest[plugSetHash];
            
            if (plugSetDef?.reusablePlugItems) {
                for (const plug of plugSetDef.reusablePlugItems) {
                    if (EMPTY_PLUG_HASHES.has(plug.plugItemHash)) continue;
                    
                    const plugDef = manifest[plug.plugItemHash];
                    if (plugDef) {
                        // Use first valid plug to determine category
                        if (!samplePlugDef) samplePlugDef = plugDef;
                        
                        plugs.push({
                            hash: plug.plugItemHash,
                            name: plugDef.displayProperties?.name || 'Unknown',
                            icon: plugDef.displayProperties?.icon,
                            canBeRemoved: true,
                        });
                    }
                }
            }
        }
        
        if (plugs.length > 0 && samplePlugDef) {
            // Dynamically determine category from the plug's plugCategoryIdentifier
            const categoryName = getCategoryFromPlug(samplePlugDef);
            const isFragment = categoryName === 'Fragment';
            
            const selectedHash = socketOverrides?.[socketIndex] ?? liveSockets?.[socketIndex]?.plugHash;
            
            groups.push({
                socketIndex,
                categoryHash: socketIndex, // Use socket index as fallback
                categoryName,
                plugs,
                selectedHash,
                isFragment,
            });
        }
    }
    
    // Sort by category: Super, Ability, Aspect, Fragment
    return groups.sort((a, b) => getSortOrder(a.categoryName) - getSortOrder(b.categoryName));
}
