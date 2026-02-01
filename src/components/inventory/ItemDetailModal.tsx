import React from 'react';
import { X, Lock, Unlock, Tag } from 'lucide-react';
import { BungieImage } from '../BungieImage';
import { getElementIcon } from '../destiny/ElementIcons';
import { useHydratedItem } from '../../hooks/useHydratedItem';
import RecoilStat from '../destiny/RecoilStat';

interface ItemDetailModalProps {
    item: any;
    definition: any;
    definitions: Record<string, any>;
    characters: any[];
    allItems: any[];
    onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
    item,
    definition,
    definitions,
    characters,
    onClose
}) => {
    if (!item || !definition) return null;

    // --- Logic ---
    const { state } = item;
    // const isMasterwork = (state & 4) !== 0; // Keeping for future reference if needed
    const isLocked = (state & 1) !== 0;
    const power = item.instanceData?.primaryStat?.value || item.primaryStat?.value;
    const damageTypeHash = item.instanceData?.damageTypeHash || definition.defaultDamageTypeHash;
    const tierType = definition.inventory?.tierType || 0;

    // Rarity Color
    const rarityColor = tierType === 6 ? '#ceae33' // Exotic
        : tierType === 5 ? '#522f65' // Legendary
            : tierType === 4 ? '#5076a3' // Rare
                : '#333';

    // Hydrate Data
    const { stats, perks } = useHydratedItem(item, definition, definitions);
    const ElementIconComponent = getElementIcon(damageTypeHash);

    // Class Icons Placeholder
    const classIcons: Record<number, string> = { 0: 'T', 1: 'H', 2: 'W' };


    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            {/* STRICT DOM OVERRIDE */}
            <div className="flex h-[600px] w-[800px] bg-[#15171e] text-white overflow-hidden rounded-lg border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>

                {/* LEFT SIDEBAR (Actions) */}
                <div className="w-[220px] bg-[#090a0c] flex flex-col p-4 gap-4 border-r border-white/5 shrink-0">
                    <div className="space-y-2">
                        <button className="w-full flex items-center gap-3 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] rounded transition-colors text-sm text-gray-300">
                            <Tag size={16} /> <span>Tag Item</span>
                        </button>
                        <button className="w-full flex items-center gap-3 px-3 py-2 bg-[#1a1a1a] hover:bg-[#252525] rounded transition-colors text-sm text-gray-300">
                            {isLocked ? <Lock size={16} className="text-yellow-400" /> : <Unlock size={16} />}
                            <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                        </button>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                        <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wider">Equip On</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {characters.slice(0, 3).map(char => (
                                <button key={char.characterId} className="h-8 bg-[#1a1a1a] rounded flex items-center justify-center text-xs font-bold hover:bg-[#333]">
                                    {classIcons[char.classType]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                        <h4 className="text-[10px] uppercase font-bold text-gray-500 mb-2 tracking-wider">Pull To</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {characters.slice(0, 3).map(char => (
                                <button key={char.characterId} className="h-8 bg-[#1a1a1a] rounded flex items-center justify-center text-xs font-bold hover:bg-[#333]">
                                    {classIcons[char.classType]}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT CONTENT (Data) */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* HEADER: Name, Power, Element */}
                    <div
                        className="p-4 relative flex items-center justify-between"
                        style={{ background: `linear-gradient(to right, ${rarityColor}, transparent)` }}
                    >
                        <div className="flex items-center gap-4 z-10">
                            <div className="w-12 h-12 border-2 border-white/20 shadow-lg bg-black">
                                <BungieImage src={definition.displayProperties?.icon} className="w-full h-full" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold uppercase drop-shadow-md">{definition.displayProperties.name}</h1>
                                <div className="text-sm text-white/80">{definition.itemTypeDisplayName}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 z-10">
                            {power && <span className="text-2xl font-bold text-yellow-400 font-mono">{power}</span>}
                            {ElementIconComponent && <ElementIconComponent size={24} />}
                        </div>

                        {/* Close button inside header */}
                        <button onClick={onClose} className="absolute top-2 right-2 p-1 hover:bg-black/20 rounded z-20">
                            <X size={20} />
                        </button>
                    </div>

                    {/* SCROLLABLE BODY */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-[#15171e]">

                        {/* STATS SECTION */}
                        <div className="space-y-1">
                            {stats.length > 0 ? stats.map(stat => (
                                <div key={stat.hash} className="flex items-center gap-3 text-xs">
                                    <div className="w-24 text-right text-gray-400 truncate">{stat.label}</div>
                                    <div className="w-8 text-right font-mono font-bold">{stat.value}</div>
                                    {stat.isRecoil ? (
                                        <div className="flex-1"><RecoilStat value={stat.value} /></div>
                                    ) : stat.isBar ? (
                                        <div className="flex-1 h-3 bg-gray-700/50 rounded-sm overflow-hidden">
                                            <div className="h-full bg-white" style={{ width: `${Math.min(100, stat.value)}%` }} />
                                        </div>
                                    ) : (
                                        <div className="flex-1" />
                                    )}
                                </div>
                            )) : <div className="text-gray-500 italic">No stats available</div>}
                        </div>

                        {/* PERKS SECTION */}
                        <div>
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-1">Perks & Mods</h3>
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                                {perks.length > 0 ? perks.map((perk, i) => (
                                    <div key={i} className="group relative w-12 h-12 rounded-full overflow-hidden bg-[#222] border border-white/20 hover:border-yellow-400 transition-colors">
                                        <BungieImage src={perk.icon} className="w-full h-full object-cover" />

                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-black/90 border border-white/20 p-2 rounded z-50 pointer-events-none">
                                            <div className="font-bold text-yellow-400 text-xs mb-1">{perk.name}</div>
                                            <div className="text-[10px] text-gray-300 leading-tight">{perk.description}</div>
                                        </div>
                                    </div>
                                )) : <div className="col-span-4 text-gray-500 italic text-sm">No displayable perks</div>}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
