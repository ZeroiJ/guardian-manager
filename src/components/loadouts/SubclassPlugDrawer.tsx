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
import { createPortal } from 'react-dom';
import { getSubclassPlugsFromManifest, SubclassSocketGroup } from '@/lib/destiny/subclass-utils';

interface SubclassPlugDrawerProps {
    item: GuardianItem;
    socketOverrides: Record<number, number>;
    onAccept: (overrides: Record<number, number>) => void;
    onClose: () => void;
}

export function SubclassPlugDrawer({
    item,
    socketOverrides,
    onAccept,
    onClose,
}: SubclassPlugDrawerProps) {
    const manifest = useInventoryStore((s) => s.manifest);
    const [selected, setSelected] = useState<Record<number, number>>({ ...socketOverrides });

    // Get socket groups from manifest using the utility function
    const socketGroups = useMemo((): SubclassSocketGroup[] => {
        return getSubclassPlugsFromManifest(
            item.itemHash,
            manifest,
            selected,
            item.sockets?.sockets
        );
    }, [item.itemHash, manifest, selected, item.sockets?.sockets]);

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
            if (group.categoryName === 'Aspect') {
                aspects++;
            }
            if (group.categoryName === 'Fragment') {
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
        const groups: Record<string, SubclassSocketGroup[]> = {};
        for (const group of socketGroups) {
            if (!groups[group.categoryName]) groups[group.categoryName] = [];
            groups[group.categoryName].push(group);
        }
        return groups;
    }, [socketGroups]);

    // Get item definition for display
    const itemDef = manifest[item.itemHash];

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
                            <p>No configurable sockets found for this subclass.</p>
                            <p className="text-xs mt-2 text-gray-600">This may be because socket data hasn't loaded yet.</p>
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
