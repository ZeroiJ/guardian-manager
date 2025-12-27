import React from 'react';
import { DraggableInventoryItem } from './DraggableInventoryItem';
import { STAT_HASHES, BUCKETS } from '../../data/constants';

interface EquipmentRowProps {
    label: string;
    bucketHash: number;
    equipment: any[]; // TODO: BungieItem[]
    inventory: any[]; // TODO: BungieItem[]
    definitions: Record<string, any>; // TODO: Definitions Manifest
    onItemContextMenu?: (e: React.MouseEvent, item: any, definition: any) => void;
}

// Helper component for a single slot row (e.g. Kinetic Weapons)
const EquipmentRow: React.FC<EquipmentRowProps> = ({ label, bucketHash, equipment, inventory, definitions, onItemContextMenu }) => {
    // specific bucket item
    const equippedItem = equipment.find(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);
    const inventoryItems = inventory.filter(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);

    return (
        <div className="flex items-start mb-1 min-h-[50px]">
            {/* Equipped Item (Hero Slot) - Scaled slightly larger if desired, but DIM keeps it uniform usually */}
            <div className="flex-shrink-0 mr-1">
                {/* Equipped items are typically 48px in DIM too, maybe slightly spaced */}
                <div className="w-[48px] h-[48px] bg-[#292929] border border-white/10 relative group shadow-lg">
                    {/* Slot Label Overlay (Only visible if empty) */}
                    {!equippedItem && <div className="absolute inset-0 flex items-center justify-center opacity-20 text-[9px] uppercase tracking-widest">{label}</div>}

                    {equippedItem && (
                        <DraggableInventoryItem 
                            item={equippedItem} 
                            definition={definitions[equippedItem.itemHash]} 
                            onContextMenu={onItemContextMenu}
                        />
                    )}
                </div>
            </div>

            {/* Inventory Grid (Backpack) - 3x3 Grid */}
            <div className="flex-1 flex flex-wrap gap-[2px] content-start">
                {[...Array(9)].map((_, idx) => {
                    const item = inventoryItems[idx];
                    return (
                        <div key={idx} className="w-[48px] h-[48px] bg-[#1a1a1a] relative border border-white/5 box-border">
                            {item && (
                                <DraggableInventoryItem
                                    item={item}
                                    definition={definitions[item.itemHash]}
                                    onContextMenu={onItemContextMenu}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

interface CharacterColumnProps {
    character: any; // TODO: Bungie Character Interface
    equipment: any[];
    inventory: any[];
    definitions: Record<string, any>;
    artifactPower: number;
    onItemContextMenu?: (e: React.MouseEvent, item: any, definition: any) => void;
}

export const CharacterColumn: React.FC<CharacterColumnProps> = ({ character, equipment, inventory, definitions, artifactPower, onItemContextMenu }) => {
    if (!character) return null;

    const { light, raceType, classType, emblemBackgroundPath, stats } = character;
    const raceNames: Record<number, string> = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
    const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
    const classNameText = classNames[classType];

    const basePower = light - artifactPower;

    return (
        <div className="flex-shrink-0 w-[240px] bg-[#11111b] border-r border-[#333] flex flex-col h-full overflow-hidden select-none">
            {/* Header / Emblem - Exact DIM Style */}
            <div
                className="relative h-[48px] w-full bg-cover bg-center flex items-center justify-between px-2 bg-no-repeat"
                style={{ backgroundImage: `url(https://www.bungie.net${emblemBackgroundPath})` }}
            >
                {/* Dark gradient overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

                {/* Left: Class & Race */}
                <div className="relative z-10 flex flex-col leading-none">
                    <span className="font-bold text-lg text-[#f5f5f5] tracking-wide drop-shadow-md">{classNameText}</span>
                    <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wider opacity-80">{raceNames[raceType]}</span>
                </div>

                {/* Right: Power Level Breakdown */}
                <div className="relative z-10 flex flex-col items-end leading-none">
                    <div className="text-xl font-bold text-[#f5dc56] drop-shadow-lg font-mono tracking-tighter shadow-black">
                        {light}
                    </div>
                    <div className="text-[9px] text-[#f5dc56]/80 font-mono">
                        {basePower} <span className="text-[#50c8ce]">+{artifactPower}</span>
                    </div>
                </div>
            </div>

            {/* Stats Row - Compact Horizontal */}
            <div className="flex flex-col bg-[#0a0a10] border-b border-white/5 p-1 gap-0.5">
                {Object.entries(STAT_HASHES).map(([name, hash]) => {
                    const value = stats[hash] || 0;
                    const tier = Math.min(10, Math.floor(value / 10)); // Max tier 10
                    // Tiers > 10 are wasted stats visually, but maybe distinct color?
                    // Tier 10 = 100.
                    
                    return (
                        <div key={name} className="flex items-center gap-2 h-[14px]">
                            {/* Label */}
                            <span className="w-8 text-[9px] text-gray-400 uppercase font-bold text-right">{name.substring(0, 3)}</span>
                            
                            {/* Bar Container */}
                            <div className="flex-1 h-2 bg-[#1a1a1a] relative">
                                {/* Fill */}
                                <div 
                                    className="h-full bg-white/20" 
                                    style={{ width: `${Math.min(100, value)}%` }}
                                >
                                    {/* Tier Segments */}
                                    <div className="absolute inset-0 flex">
                                        {[...Array(10)].map((_, i) => (
                                            <div key={i} className={`flex-1 border-r border-black/50 ${i < tier ? 'bg-[#f5dc56]' : 'opacity-0'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Value */}
                            <span className="w-6 text-[10px] text-right font-mono text-[#f5dc56]">{value}</span>
                        </div>
                    );
                })}
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">

                {/* Weapons Group */}
                <div className="mb-2">
                    <div className="text-[9px] text-[#666] font-bold uppercase mb-0.5 px-0.5 tracking-wider hidden">Weapons</div>
                    <EquipmentRow label="Kinetic" bucketHash={BUCKETS.Kinetic} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                    <EquipmentRow label="Energy" bucketHash={BUCKETS.Energy} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                    <EquipmentRow label="Power" bucketHash={BUCKETS.Power} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                </div>

                {/* Armor Group */}
                <div className="mb-2">
                    <div className="text-[9px] text-[#666] font-bold uppercase mb-0.5 px-0.5 tracking-wider hidden">Armor</div>
                    <EquipmentRow label="Helmet" bucketHash={BUCKETS.Helmet} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                    <EquipmentRow label="Arms" bucketHash={BUCKETS.Gauntlets} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                    <EquipmentRow label="Chest" bucketHash={BUCKETS.Chest} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                    <EquipmentRow label="Legs" bucketHash={BUCKETS.Legs} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                    <EquipmentRow label="Class" bucketHash={BUCKETS.Class} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                </div>

                {/* General Group */}
                <div className="mb-2">
                    <div className="text-[9px] text-[#666] font-bold uppercase mb-0.5 px-0.5 tracking-wider hidden">General</div>
                    <EquipmentRow label="Ghost" bucketHash={BUCKETS.Ghost} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                    <EquipmentRow label="Vehicle" bucketHash={BUCKETS.Vehicle} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                    <EquipmentRow label="Ship" bucketHash={BUCKETS.Ship} equipment={equipment} inventory={inventory} definitions={definitions} onItemContextMenu={onItemContextMenu} />
                </div>

            </div>
        </div>
    );
}
