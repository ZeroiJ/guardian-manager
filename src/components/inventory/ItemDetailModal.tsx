import React from 'react';
import { X, Lock, Unlock, Tag, Plus, ChevronRight } from 'lucide-react';
import { BungieImage } from '../BungieImage';
import { RARITY_COLORS, MASTERWORK_GOLD } from '../../data/constants';
import { getElementIcon } from '../destiny/ElementIcons';
import { useHydratedItem } from '../../hooks/useHydratedItem';

interface ItemDetailModalProps {
    item: any;
    definition: any;
    definitions: Record<string, any>;
    characters: any[];
    allItems: any[];
    onClose: () => void;
}

/**
 * DIM-Standard Item Detail Modal
 * Displays comprehensive item information in a dense, data-heavy dark theme.
 */
export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
    item,
    definition,
    definitions,
    characters,
    allItems,
    onClose
}) => {
    if (!item || !definition) return null;

    // --- Derived Data ---
    const { state } = item;
    const isMasterwork = (state & 4) !== 0;
    const isLocked = (state & 1) !== 0;
    const power = item.instanceData?.primaryStat?.value || item.primaryStat?.value;
    const damageTypeHash = item.instanceData?.damageTypeHash || definition.defaultDamageTypeHash;
    const tierType = definition.inventory?.tierType || 0;

    // --- Rarity Header Color ---
    const headerBgColor = tierType === 6 ? '#ceae33'
        : tierType === 5 ? '#522f65'
            : tierType === 4 ? '#5076a3'
                : '#333';

    const borderColor = isMasterwork ? MASTERWORK_GOLD : (RARITY_COLORS[tierType] || RARITY_COLORS[0]);

    // Element Icon
    const ElementIconComponent = getElementIcon(damageTypeHash);

    // --- Ammo Type ---
    const ammoTypes: Record<number, string> = { 1: 'Primary', 2: 'Special', 3: 'Heavy' };
    const ammoType = ammoTypes[definition.equippingBlock?.ammoType] || null;

    // --- Space Check Logic ---
    const checkSpace = (characterId: string, bucketHash: number): boolean => {
        const itemsInBucket = allItems.filter(i =>
            i.owner === characterId &&
            definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash
        );
        const unequipped = itemsInBucket.filter(i => !i.instanceData?.isEquipped);
        return unequipped.length < 9;
    };

    const targetBucketHash = definition.inventory?.bucketTypeHash;

    // --- Hydrated Stats & Perks from Manifest ---
    const { stats, perks } = useHydratedItem(item, definition, definitions);

    // Class names for characters
    const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
    const classIcons: Record<number, string> = {
        0: 'T', // Titan placeholder
        1: 'H', // Hunter placeholder  
        2: 'W'  // Warlock placeholder
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="bg-[#15171e] w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg border border-white/10 shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* ===== RARITY HEADER ===== */}
                <div
                    className="h-20 flex items-center px-4 gap-4 shrink-0 relative overflow-hidden"
                    style={{ backgroundColor: headerBgColor }}
                >
                    {/* Gradient overlay for depth */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent pointer-events-none" />

                    {/* Item Icon */}
                    <div
                        className="w-14 h-14 border-2 shadow-lg relative shrink-0 z-10"
                        style={{ borderColor }}
                    >
                        <BungieImage src={definition.displayProperties?.icon} className="w-full h-full object-cover" />
                        {isMasterwork && (
                            <div className="absolute inset-0 border border-[#f5dc56]/40 pointer-events-none" />
                        )}
                    </div>

                    {/* Item Name & Type */}
                    <div className="flex-1 z-10 min-w-0">
                        <h1 className="text-2xl font-bold text-white truncate drop-shadow-md">
                            {definition.displayProperties.name}
                        </h1>
                        <div className="text-sm text-white/80 font-medium flex items-center gap-2">
                            <span>{definition.itemTypeDisplayName}</span>
                            {ammoType && (
                                <>
                                    <span className="text-white/40">•</span>
                                    <span className="text-white/60">{ammoType}</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Element & Power */}
                    <div className="flex items-center gap-3 z-10">
                        {ElementIconComponent && (
                            <ElementIconComponent size={24} className="drop-shadow-md" />
                        )}
                        {power && (
                            <div className="text-2xl font-bold text-yellow-400 drop-shadow-lg font-mono">
                                {power}
                            </div>
                        )}
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-black/20 rounded transition-colors z-10"
                    >
                        <X className="w-5 h-5 text-white" />
                    </button>
                </div>

                {/* ===== BODY: SIDEBAR + MAIN ===== */}
                <div className="flex-1 flex overflow-hidden">

                    {/* ===== ACTION SIDEBAR ===== */}
                    <div className="w-[60px] bg-[#090a0c] border-r border-white/5 flex flex-col items-center py-3 gap-4 shrink-0">

                        {/* Tag Button */}
                        <button
                            className="w-10 h-10 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 flex items-center justify-center transition-colors"
                            title="Tag Item"
                        >
                            <Tag size={16} className="text-gray-400" />
                        </button>

                        {/* Lock Button */}
                        <button
                            className={`w-10 h-10 rounded border flex items-center justify-center transition-colors ${isLocked
                                ? 'bg-[#2a2518] border-[#f5dc56]/30'
                                : 'bg-[#1a1a1a] hover:bg-[#252525] border-white/10'
                                }`}
                            title={isLocked ? 'Locked' : 'Unlocked'}
                        >
                            {isLocked
                                ? <Lock size={16} className="text-[#f5dc56]" />
                                : <Unlock size={16} className="text-gray-400" />
                            }
                        </button>

                        {/* Loadout Button */}
                        <button
                            className="w-10 h-10 rounded bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 flex items-center justify-center transition-colors"
                            title="Add to Loadout"
                        >
                            <Plus size={16} className="text-gray-400" />
                        </button>

                        <div className="h-px w-8 bg-white/10 my-1" />

                        {/* Equip Row */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[8px] uppercase text-gray-500 font-bold tracking-wide">Equip</span>
                            <div className="flex flex-col gap-1">
                                {characters.slice(0, 3).map((char) => {
                                    const hasSpace = checkSpace(char.characterId, targetBucketHash);
                                    return (
                                        <button
                                            key={`equip-${char.characterId}`}
                                            disabled={!hasSpace}
                                            className={`w-8 h-8 rounded text-[10px] font-bold border flex items-center justify-center transition-all ${hasSpace
                                                ? 'bg-[#1a1a1a] hover:bg-[#333] border-white/10 text-gray-300'
                                                : 'bg-[#111] border-red-900/30 text-gray-600 opacity-50 cursor-not-allowed'
                                                }`}
                                            title={`${classNames[char.classType]}${hasSpace ? '' : ' (No Space)'}`}
                                        >
                                            {classIcons[char.classType]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="h-px w-8 bg-white/10 my-1" />

                        {/* Pull Row */}
                        <div className="flex flex-col items-center gap-1">
                            <span className="text-[8px] uppercase text-gray-500 font-bold tracking-wide">Pull</span>
                            <div className="flex flex-col gap-1">
                                {characters.slice(0, 3).map((char) => {
                                    const hasSpace = checkSpace(char.characterId, targetBucketHash);
                                    return (
                                        <button
                                            key={`pull-${char.characterId}`}
                                            disabled={!hasSpace}
                                            className={`w-8 h-8 rounded text-[10px] font-bold border flex items-center justify-center transition-all ${hasSpace
                                                ? 'bg-[#1a1a1a] hover:bg-[#333] border-white/10 text-gray-300'
                                                : 'bg-[#111] border-red-900/30 text-gray-600 opacity-50 cursor-not-allowed'
                                                }`}
                                            title={`${classNames[char.classType]}${hasSpace ? '' : ' (No Space)'}`}
                                        >
                                            {classIcons[char.classType]}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Vault Button */}
                        <button
                            className="w-8 h-8 rounded bg-[#1a1a1a] hover:bg-[#333] border border-white/10 flex items-center justify-center transition-colors text-[10px] font-bold text-gray-400"
                            title="Send to Vault"
                        >
                            V
                        </button>
                    </div>

                    {/* ===== MAIN CONTENT ===== */}
                    <div className="flex-1 p-4 overflow-y-auto bg-[#15171e]">

                        {/* Flavor Text */}
                        {definition.flavorText && (
                            <div className="mb-4 text-sm text-gray-500 italic border-l-2 border-white/10 pl-3 py-1">
                                "{definition.flavorText}"
                            </div>
                        )}

                        {/* ===== STATS SECTION ===== */}
                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ChevronRight size={12} />
                                Stats
                            </h3>
                            <div className="space-y-2">
                                {stats.length > 0 ? stats.map((stat) => (
                                    <div key={stat.hash} className="flex items-center gap-3 text-xs">
                                        <div className="w-20 text-gray-400 text-right truncate">
                                            {stat.label}
                                        </div>
                                        <div className="flex-1 h-3 bg-gray-700/50 rounded-sm overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-300 ${isMasterwork ? 'bg-gradient-to-r from-white to-[#f5dc56]' : 'bg-white'
                                                    }`}
                                                style={{ width: `${Math.min(100, stat.value)}%` }}
                                            />
                                        </div>
                                        <div className={`w-8 text-right font-mono font-bold ${isMasterwork ? 'text-[#f5dc56]' : 'text-white'
                                            }`}>
                                            {stat.value}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-gray-600 text-sm italic">No stats available</div>
                                )}
                            </div>
                        </div>

                        {/* ===== PERKS/SOCKETS SECTION ===== */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ChevronRight size={12} />
                                Perks
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {perks.length > 0 ? perks.map((perk, idx) => (
                                    <div key={idx} className="group relative">
                                        <div className="w-10 h-10 rounded-full bg-[#222] border-2 border-white/20 overflow-hidden hover:border-[#f5dc56] transition-colors cursor-pointer">
                                            <BungieImage
                                                src={perk.icon}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block min-w-[120px] max-w-[180px] bg-black/95 border border-white/20 px-2 py-1.5 rounded text-center z-50 pointer-events-none">
                                            <div className="text-[11px] text-white font-medium">
                                                {perk.name}
                                            </div>
                                            {perk.description && (
                                                <div className="text-[9px] text-gray-400 mt-0.5 line-clamp-3">
                                                    {perk.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-gray-600 text-sm italic">No perks available</div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
