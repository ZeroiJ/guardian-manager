import React from 'react';
import { X, Lock, Unlock, MoveDown, User } from 'lucide-react';
import { BungieImage } from '../BungieImage';
import { RARITY_COLORS, MASTERWORK_GOLD } from '../../data/constants';

interface ItemDetailModalProps {
    item: any;
    definition: any;
    definitions: Record<string, any>; // For looking up other definitions (stats, perks)
    characters: any[];
    allItems: any[]; // Needed for space checking
    onClose: () => void;
}

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

    // Colors
    const borderColor = isMasterwork ? MASTERWORK_GOLD : (RARITY_COLORS[tierType] || RARITY_COLORS[0]);
    const headerColor = definition.inventory?.tierType === 6 ? '#ceae33' : definition.inventory?.tierType === 5 ? '#522f65' : '#333';

    // --- Space Check Logic ---
    const checkSpace = (characterId: string, bucketHash: number): boolean => {
        // Find all items on this character in this bucket
        const itemsInBucket = allItems.filter(i =>
            i.owner === characterId &&
            definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash
        );
        // Capacity is usually 9 for equipment buckets + 1 equipped = 10? 
        // Actually typically 9 inventory slots + 1 equipped. 
        // Let's assume 10 total slots for safety, or just check if inventory count (unequipped) is >= 9.

        // Count unequipped only?
        const unequipped = itemsInBucket.filter(i => !i.instanceData?.isEquipped);
        return unequipped.length < 9;
    };

    const targetBucketHash = definition.inventory?.bucketTypeHash;

    // --- Stats Logic ---
    // Use instance stats (actual values) if available, else definition stats (base)
    // Map stats to array { label, value, max }
    const stats = Object.entries(item.stats || {}).map(([hash, stat]: [string, any]) => {
        const statDef = definitions[hash];
        return {
            hash,
            label: statDef?.displayProperties?.name || 'Stat',
            value: stat.value,
            max: 100 // Most stats max at 100
        };
    }).filter(s => s.label && s.label !== 'Power' && s.label !== 'Attack' && s.label !== 'Defense');

    // Fallback to definition stats if instance stats missing (e.g. uninstantiated items)
    // Note: implementation omitted for brevity, assuming instance stats for now

    // --- Sockets (Perks) ---
    // Extract perk icons from sockets (simplified)
    // We look for sockets that have reusable plugs (perks)
    // This is a rough approximation without full socket categories
    const perks = (item.itemComponents?.sockets?.data?.sockets || []).map((socket: any) => {
        if (!socket.plugHash) return null;
        const plugDef = definitions[socket.plugHash];
        if (!plugDef?.displayProperties?.hasIcon) return null;
        return plugDef;
    }).filter(Boolean).slice(0, 8); // Limit to first few

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-[#11111b] w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl border border-white/10 shadow-2xl flex flex-col relative"
                onClick={e => e.stopPropagation()} // Prevent close on modal click
            >
                {/* Header */}
                <div
                    className="h-24 relative overflow-hidden flex items-center px-6 gap-6 shrink-0"
                    style={{ background: `linear-gradient(90deg, ${headerColor}dd 0%, #11111b 100%)` }}
                >
                    {/* Icon */}
                    <div className="w-16 h-16 border-2 shadow-lg relative shrink-0" style={{ borderColor }}>
                        <BungieImage src={definition.displayProperties?.icon} className="w-full h-full object-cover" />
                        {power && <div className="absolute bottom-0 right-0 bg-black/80 text-[#f5dc56] text-xs font-bold px-1">{power}</div>}
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-white shadow-black drop-shadow-md">
                        <h1 className="text-3xl font-bold tracking-tight">{definition.displayProperties.name}</h1>
                        <div className="text-sm opacity-90 font-medium uppercase tracking-widest flex items-center gap-2">
                            {definition.itemTypeDisplayName}
                            {/* Simple Element Icon Placeholder */}
                            {damageTypeHash && <div className="w-4 h-4 rounded-full bg-white/20" />}
                        </div>
                    </div>

                    {/* Close Button */}
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-white" />
                    </button>
                </div>

                {/* Body - Split View */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Left Column: Actions */}
                    <div className="w-64 bg-[#0a0a10] border-r border-white/5 p-4 flex flex-col gap-6 overflow-y-auto">

                        {/* Tags / Lock */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Management</label>

                            <div className="flex gap-2">
                                <button className="flex-1 bg-[#222] hover:bg-[#333] py-2 rounded border border-white/5 flex items-center justify-center gap-2 text-sm text-gray-300 transition-colors">
                                    {isLocked ? <Lock size={14} className="text-[#f5dc56]" /> : <Unlock size={14} />}
                                    {isLocked ? 'Locked' : 'Unlock'}
                                </button>
                                <button className="flex-1 bg-[#222] hover:bg-[#333] py-2 rounded border border-white/5 flex items-center justify-center gap-2 text-sm text-gray-300 transition-colors">
                                    Tag
                                </button>
                            </div>
                        </div>

                        {/* Pull To */}
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <MoveDown size={12} /> Pull to Character
                            </label>

                            <div className="flex flex-col gap-2">
                                {characters.map((char) => {
                                    const hasSpace = checkSpace(char.characterId, targetBucketHash);
                                    const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
                                    const charClass = classNames[char.classType] || 'Guardian';

                                    return (
                                        <button
                                            key={char.characterId}
                                            disabled={!hasSpace}
                                            className={`
                                                flex items-center gap-3 p-2 rounded border transition-all text-left
                                                ${hasSpace
                                                    ? 'bg-[#1a1a1a] hover:bg-[#252525] border-white/5 cursor-pointer'
                                                    : 'bg-[#111] border-red-900/30 opacity-50 cursor-not-allowed'
                                                }
                                            `}
                                        >
                                            <div className="w-8 h-8 rounded bg-gray-800 overflow-hidden relative">
                                                <BungieImage src={char.emblemBackgroundPath} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-bold text-gray-200">{charClass}</div>
                                                <div className="text-[10px] text-gray-500">{hasSpace ? 'Ready' : 'No Space'}</div>
                                            </div>
                                        </button>
                                    );
                                })}

                                <button className="flex items-center gap-3 p-2 rounded border border-white/5 bg-[#1a1a1a] hover:bg-[#252525] text-left transition-colors">
                                    <div className="w-8 h-8 rounded bg-[#111] flex items-center justify-center text-gray-500 font-bold border border-white/5">V</div>
                                    <div className="text-sm font-bold text-gray-200">Vault</div>
                                </button>
                            </div>
                        </div>

                        {/* Equip On (Visual Only) */}
                        <div className="flex flex-col gap-2 opacity-50 pointer-events-none">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                <User size={12} /> Equip (Coming Soon)
                            </label>
                            <div className="flex flex-col gap-2">
                                {/* Placeholders for equip buttons */}
                            </div>
                        </div>

                    </div>

                    {/* Right Column: Details */}
                    <div className="flex-1 p-6 overflow-y-auto">

                        {/* Quote */}
                        {definition.flavorText && (
                            <div className="mb-6 text-sm text-gray-500 italic border-l-2 border-white/10 pl-4 py-1">
                                "{definition.flavorText}"
                            </div>
                        )}

                        {/* Stats Grid */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Stats</h3>
                            <div className="grid grid-cols-1 gap-y-3 gap-x-8">
                                {stats.length > 0 ? stats.map((stat) => (
                                    <div key={stat.hash} className="flex items-center text-xs">
                                        <div className="w-24 text-gray-400 font-medium text-right mr-3">{stat.label}</div>
                                        <div className="flex-1 h-3 bg-white/10 rounded-sm overflow-hidden relative">
                                            <div
                                                className="h-full bg-white transition-all duration-500"
                                                style={{ width: `${Math.min(100, (stat.value / stat.max) * 100)}%` }}
                                            />
                                        </div>
                                        <div className="w-8 text-right font-mono font-bold text-[#f5dc56] ml-3">{stat.value}</div>
                                    </div>
                                )) : (
                                    <div className="text-gray-600 italic">No stats available</div>
                                )}
                            </div>
                        </div>

                        {/* Perks / Sockets */}
                        <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 border-b border-white/10 pb-2">Perks</h3>
                            <div className="flex flex-wrap gap-4">
                                {perks.length > 0 ? perks.map((perk: any, idx: number) => (
                                    <div key={idx} className="flex flex-col items-center gap-2 group">
                                        <div className="w-12 h-12 rounded-full bg-[#222] border border-white/20 p-2 overflow-hidden hover:border-[#f5dc56] transition-colors relative">
                                            <BungieImage src={perk.displayProperties.icon} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="text-[10px] text-gray-400 max-w-[80px] text-center opacity-0 group-hover:opacity-100 transition-opacity absolute mt-14 bg-black/90 p-1 rounded z-10 pointer-events-none">
                                            {perk.displayProperties.name}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="text-gray-600 italic">No perks visible</div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};
