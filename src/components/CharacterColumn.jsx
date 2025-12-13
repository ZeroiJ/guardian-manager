import React from 'react';
import ItemCard from './ItemCard';
import { STAT_HASHES, BUCKETS } from '../utils/constants';

// Helper component for a single slot row (e.g. Kinetic Weapons)
const EquipmentRow = ({ label, bucketHash, equipment, inventory, definitions }) => {
    // specific bucket item
    const equippedItem = equipment.find(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);
    const inventoryItems = inventory.filter(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);

    // If no items at all for this bucket, skip (or show empty placeholders if strict)
    // DIM always shows the slots.

    return (
        <div className="flex gap-2 mb-1 h-[52px]">
            {/* Equipped Item (Left) */}
            <div className="w-[52px] h-[52px] flex-shrink-0 bg-[#292929] border border-white/5 rounded-sm relative">
                {equippedItem ? (
                    <ItemCard item={equippedItem} definition={definitions[equippedItem.itemHash]} className="w-full h-full" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20 text-[10px]">{label[0]}</div>
                )}
            </div>

            {/* Inventory Grid (Right) */}
            <div className="flex-1 grid grid-cols-3 gap-1 content-start bg-[#0f0f0f] p-0.5 rounded-sm">
                {[...Array(9)].map((_, idx) => {
                    const item = inventoryItems[idx];
                    return (
                        <div key={idx} className="w-[48px] h-[48px] bg-[#1a1a1a] relative">
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

    return (
        <div className="flex-shrink-0 w-[230px] bg-[#101010] border-r border-[#333] flex flex-col h-full overflow-hidden select-none">
            {/* Header / Emblem - Compact DIM Style */}
            <div
                className="relative h-[48px] bg-cover bg-center flex items-center px-2 justify-between border-b border-white/10"
                style={{ backgroundImage: `url(https://www.bungie.net${emblemBackgroundPath})` }}
            >
                <div className="absolute inset-0 bg-black/40" />
                <div className="relative z-10 flex flex-col leading-tight shadow-md">
                    <span className="font-bold text-lg text-[#e6e6e6] tracking-wide">{classNames[classType]}</span>
                    <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wider">{raceNames[raceType]}</span>
                </div>
                <div className="relative z-10 text-2xl font-bold text-[#f5dc56] drop-shadow-md font-mono">
                    {light}
                </div>
            </div>

            {/* Stats Row - Compact Horizontal */}
            <div className="flex justify-between px-1 py-1 bg-[#181818] border-b border-white/10 text-[#cccccc]">
                {Object.entries(STAT_HASHES).map(([name, hash]) => (
                    <div key={name} className="flex flex-col items-center w-full">
                        {/* Optional Icon here */}
                        <span className="text-[10px] font-bold">{stats[hash] || 0}</span>
                    </div>
                ))}
            </div>

            {/* Content (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-1 scrollbar-thin">

                {/* Weapons Group */}
                <div className="mb-2">
                    <div className="text-[10px] text-[#888] font-bold uppercase mb-0.5 px-1 tracking-wider">Weapons</div>
                    <EquipmentRow label="Kinetic" bucketHash={BUCKETS.Kinetic} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Energy" bucketHash={BUCKETS.Energy} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Power" bucketHash={BUCKETS.Power} equipment={equipment} inventory={inventory} definitions={definitions} />
                </div>

                {/* Armor Group */}
                <div className="mb-2">
                    <div className="text-[10px] text-[#888] font-bold uppercase mb-0.5 px-1 tracking-wider">Armor</div>
                    <EquipmentRow label="Helmet" bucketHash={BUCKETS.Helmet} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Gauntlets" bucketHash={BUCKETS.Gauntlets} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Chest" bucketHash={BUCKETS.Chest} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Legs" bucketHash={BUCKETS.Legs} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Class" bucketHash={BUCKETS.Class} equipment={equipment} inventory={inventory} definitions={definitions} />
                </div>

                {/* General Group */}
                <div className="mb-2">
                    <div className="text-[10px] text-[#888] font-bold uppercase mb-0.5 px-1 tracking-wider">General</div>
                    <EquipmentRow label="Ghost" bucketHash={BUCKETS.Ghost} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Vehicle" bucketHash={BUCKETS.Vehicle} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <EquipmentRow label="Ship" bucketHash={BUCKETS.Ship} equipment={equipment} inventory={inventory} definitions={definitions} />
                </div>

            </div>
        </div>
    );
}
