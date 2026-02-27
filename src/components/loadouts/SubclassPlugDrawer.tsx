/**
 * SubclassPlugDrawer - Configure subclass aspects, fragments, abilities
 * 
 * A drawer to configure subclass socket overrides (Aspects, Fragments, Abilities, Super)
 * Ported from DIM's SubclassPlugDrawer
 */
import { useState, useMemo, useCallback } from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/store/useInventoryStore';
import { GuardianItem } from '@/services/profile/types';
import { SocketCategoryHashes, EMPTY_PLUG_HASHES } from '@/lib/destiny-constants';
import { createPortal } from 'react-dom';

interface SubclassPlugDrawerProps {
    item: GuardianItem;
    socketOverrides: Record<number, number>;
    onAccept: (overrides: Record<number, number>) => void;
    onClose: () => void;
}

type SocketPlug = {
    hash: number;
    name: string;
    icon?: string;
    canBeRemoved: boolean;
};

type SocketGroup = {
    socketIndex: number;
    categoryHash: number;
    categoryName: string;
    plugs: SocketPlug[];
    selectedHash: number;
    isFragment: boolean;
};

const ABILITY_CATEGORIES: number[] = [
    SocketCategoryHashes.Super,
    SocketCategoryHashes.Abilities_Abilities,
    SocketCategoryHashes.Abilities_Abilities_Ikora,
];

const ASPECT_CATEGORIES: number[] = [
    SocketCategoryHashes.Aspects_Abilities,
    SocketCategoryHashes.Aspects_Abilities_Ikora,
    SocketCategoryHashes.Aspects_Abilities_Neomuna,
    SocketCategoryHashes.Aspects_Abilities_Stranger,
];

const FRAGMENT_CATEGORIES: number[] = [
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

export function SubclassPlugDrawer({
    item,
    socketOverrides,
    onAccept,
    onClose,
}: SubclassPlugDrawerProps) {
    const manifest = useInventoryStore((s) => s.manifest);
    const [selected, setSelected] = useState<Record<number, number>>({ ...socketOverrides });

    // Get the item definition
    const itemDef = manifest[item.itemHash];

    // Build socket groups - matching DIM's approach using categories
    const socketGroups = useMemo(() => {
        if (!item.sockets || !itemDef?.sockets) return [] as SocketGroup[];

        const groups: SocketGroup[] = [];
        
        // Get categories from item definition
        const categories = itemDef.sockets.socketCategories || [];
        
        for (const category of categories) {
            const categoryHash = category.socketCategoryHash;
            const socketIndexes = category.socketIndexes || [];
            
            // Skip if not a relevant category
            const isAbility = ABILITY_CATEGORIES.includes(categoryHash);
            const isAspect = ASPECT_CATEGORIES.includes(categoryHash);
            const isFragment = FRAGMENT_CATEGORIES.includes(categoryHash);
            
            if (!isAbility && !isAspect && !isFragment) continue;
            
            const categoryName = CATEGORY_NAMES[categoryHash] || 'Unknown';
            
            // Process each socket in this category
            for (const socketIndex of socketIndexes) {
                const liveSocket = item.sockets?.sockets?.[socketIndex];
                if (!liveSocket) continue;
                
                // Get plug options from the socket's plug set
                const plugs: SocketPlug[] = [];
                
                // Try to get plugs from the socket definition
                const socketDef = itemDef.sockets?.socketEntries?.[socketIndex];
                
                if (socketDef?.reusablePlugSetHash) {
                    const plugSetDef = manifest[socketDef.reusablePlugSetHash];
                    if (plugSetDef?.reusablePlugItems) {
                        for (const plug of plugSetDef.reusablePlugItems) {
                            // Skip empty plugs
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
                    // Get currently selected plug hash (from overrides or current)
                    const selectedHash = selected[socketIndex] ?? liveSocket.plugHash;
                    
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
    }, [item, itemDef, manifest, selected]);

    const handleSelect = useCallback((socketIndex: number, plugHash: number) => {
        setSelected((prev) => {
            // If clicking the already selected plug, deselect it
            if (prev[socketIndex] === plugHash) {
                const { [socketIndex]: _, ...rest } = prev;
                return rest;
            }
            return { ...prev, [socketIndex]: plugHash };
        });
    }, []);

    const handleAccept = useCallback(() => {
        onAccept(selected);
        onClose();
    }, [selected, onAccept, onClose]);

    // Calculate capacity info
    const capacityInfo = useMemo(() => {
        let aspects = 0;
        let fragments = 0;

        for (const group of socketGroups) {
            if (ASPECT_CATEGORIES.includes(group.categoryHash)) {
                aspects++;
            }
            if (FRAGMENT_CATEGORIES.includes(group.categoryHash)) {
                fragments++;
            }
        }

        return {
            aspectSlots: aspects,
            fragmentSlots: fragments,
        };
    }, [socketGroups]);

    // Group by category name for display
    const groupedSockets = useMemo(() => {
        const groups: Record<string, SocketGroup[]> = {};
        for (const group of socketGroups) {
            if (!groups[group.categoryName]) groups[group.categoryName] = [];
            groups[group.categoryName].push(group);
        }
        return groups;
    }, [socketGroups]);

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div 
                className="w-[600px] max-h-[80vh] bg-[#0a0a0a] border border-white/15 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        {itemDef?.displayProperties?.icon && (
                            <img 
                                src={`https://www.bungie.net${itemDef.displayProperties.icon}`} 
                                alt=""
                                className="w-10 h-10 rounded-sm border border-rarity-legendary/30"
                            />
                        )}
                        <div>
                            <h2 className="text-lg font-bold font-rajdhani tracking-widest uppercase text-white">
                                Configure {itemDef?.displayProperties?.name || 'Subclass'}
                            </h2>
                            <p className="text-xs text-gray-500 font-mono">
                                {capacityInfo.aspectSlots} Aspect slots, {capacityInfo.fragmentSlots} Fragment slots
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Socket Groups */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {Object.entries(groupedSockets).map(([categoryName, groups]) => (
                        <div key={categoryName} className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest flex items-center gap-2">
                                {categoryName}s
                                <span className="text-[10px] font-mono text-gray-600">
                                    ({groups.length} slot{groups.length !== 1 ? 's' : ''})
                                </span>
                            </h3>
                            <div className="grid grid-cols-1 gap-2">
                                {groups.map((group) => {
                                    const selectedPlug = group.plugs.find(p => p.hash === group.selectedHash);
                                    
                                    return (
                                        <div 
                                            key={`${group.categoryHash}-${group.socketIndex}`}
                                            className="p-3 rounded-sm border border-white/10 bg-white/[0.02]"
                                        >
                                            <div className="text-[10px] text-gray-600 font-mono mb-2">
                                                Socket {group.socketIndex + 1} - {group.selectedHash ? 'Customized' : 'Default'}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                {group.plugs.map((plug) => {
                                                    const isSelected = group.selectedHash === plug.hash;
                                                    
                                                    return (
                                                        <button
                                                            key={plug.hash}
                                                            onClick={() => handleSelect(group.socketIndex, plug.hash)}
                                                            className={cn(
                                                                'flex flex-col items-center gap-1 p-2 rounded-sm border transition-all',
                                                                isSelected 
                                                                    ? 'border-rarity-legendary bg-rarity-legendary/10' 
                                                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                                            )}
                                                        >
                                                            {plug.icon ? (
                                                                <img 
                                                                    src={`https://www.bungie.net${plug.icon}`} 
                                                                    alt=""
                                                                    className="w-8 h-8 rounded-sm object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-sm bg-white/10" />
                                                            )}
                                                            <span className="text-[8px] font-bold font-rajdhani text-center truncate w-full">
                                                                {plug.name}
                                                            </span>
                                                            {isSelected && (
                                                                <Check size={10} className="text-rarity-legendary" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                    {socketGroups.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            No configurable sockets found for this subclass.
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-rajdhani"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAccept}
                        className="px-6 py-2 rounded-sm text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-gray-200 font-rajdhani flex items-center gap-2"
                    >
                        <Check size={14} />
                        Apply
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default SubclassPlugDrawer;
