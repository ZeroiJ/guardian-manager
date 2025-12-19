import React from 'react';
import ItemCard from '../common/ItemCard';
import { STAT_HASHES, BUCKETS } from '../../utils/constants';

// Helper component for a single slot row (e.g. Kinetic Weapons)
const EquipmentRow = ({ label, bucketHash, equipment, inventory, definitions }) => {
    // specific bucket item
    const equippedItem = equipment.find(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);
    const inventoryItems = inventory.filter(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);

    return (
        <div className="flex items-start mb-1 min-h-[56px]">
            {/* Equipped Item (Hero Slot) - Scaled Up + Gutter */}
            <div className="flex-shrink-0 mr-3">
                <div className="w-[54px] h-[54px] bg-[#292929] border border-white/10 relative group shadow-lg">
                    {/* Slot Label Overlay (Only visible if empty) */}
                    {!equippedItem && <div className="absolute inset-0 flex items-center justify-center opacity-20 text-[9px] uppercase tracking-widest">{label}</div>}

                    {equippedItem && (
                        <ItemCard item={equippedItem} definition={definitions[equippedItem.itemHash]} className="w-full h-full" />
                    )}
                </div>
            </div>

            {/* Inventory Grid (Backpack) */}
            <div className="flex-1 grid grid-cols-3 gap-[2px] content-start mt-[3px]">
                {[...Array(9)].map((_, idx) => {
                    const item = inventoryItems[idx];
                    return (
                        <div key={idx} className="w-[48px] h-[48px] bg-[#1a1a1a] relative border border-white/5">
                            {item && (
                                <ItemCard
                                    item={item}
                                    definition={definitions[item.itemHash]}
                                    className="w-full h-full"
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export function CharacterColumn({ character, equipment, inventory, definitions }) {
    if (!character) return null;

    const { light, raceType, classType, emblemBackgroundPath, stats } = character;
    const raceNames = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
    const classNames = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
    const classNameText = classNames[classType];

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

                {/* Right: Light Level */}
                <div className="relative z-10 text-2xl font-bold text-[#f5dc56] drop-shadow-lg font-mono tracking-tighter shadow-black">
                    {light}
                </div>
            </div>

            {/* Stats Row - Compact Horizontal */}
            <div className="flex justify-between px-2 py-1 bg-[#0a0a10] border-b border-white/5 text-[#cccccc]">
                {Object.entries(STAT_HASHES).map(([name, hash]) => (
                    <div key={name} className="flex flex-col items-center w-full group cursor-help">
                        {/* Value */}
                        <span className="text-[11px] font-bold text-gray-300 group-hover:text-white transition-colors">{stats[hash] || 0}</span>
                        {/* Label (Icon placeholder) */}
                        <span className="text-[8px] text-gray-500 uppercase">{name.substring(0, 3)}</span>
                    </div>
                ))}
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">

                {/* Weapons Group */}
                <div className="mb-2">
                    <div className="text-[9px] text-[#666] font-bold uppercase mb-0.5 px-0.5 tracking-wider hidden">Weapons</div>
                    <EquipmentRow label="Kinetic" bucketHash={BUCKETS.Kinetic} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Energy" bucketHash={BUCKETS.Energy} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Power" bucketHash={BUCKETS.Power} equipment={equipment} inventory={inventory} definitions={definitions} />
                </div>

                {/* Armor Group */}
                <div className="mb-2">
                    <div className="text-[9px] text-[#666] font-bold uppercase mb-0.5 px-0.5 tracking-wider hidden">Armor</div>
                    <EquipmentRow label="Helmet" bucketHash={BUCKETS.Helmet} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Arms" bucketHash={BUCKETS.Gauntlets} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Chest" bucketHash={BUCKETS.Chest} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Legs" bucketHash={BUCKETS.Legs} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Class" bucketHash={BUCKETS.Class} equipment={equipment} inventory={inventory} definitions={definitions} />
                </div>

                {/* General Group */}
                <div className="mb-2">
                    <div className="text-[9px] text-[#666] font-bold uppercase mb-0.5 px-0.5 tracking-wider hidden">General</div>
                    <EquipmentRow label="Ghost" bucketHash={BUCKETS.Ghost} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Vehicle" bucketHash={BUCKETS.Vehicle} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Ship" bucketHash={BUCKETS.Ship} equipment={equipment} inventory={inventory} definitions={definitions} />
                </div>

            </div>
        </div>
    );
}
