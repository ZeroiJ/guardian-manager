import React from 'react';
import { InventoryItem } from '../InventoryItem';
import { STAT_HASHES, BUCKETS } from '../../data/constants';
import { bungieNetPath } from '../BungieImage';

interface BucketRowProps {
    label: string;
    bucketHash: number;
    equipment: any[];
    inventory: any[];
    definitions: Record<string, any>;
}

const BucketRow: React.FC<BucketRowProps> = ({ label, bucketHash, equipment, inventory, definitions }) => {
    // 1. Strict Filter Logic
    const equippedItem = equipment.find(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);
    const bucketItems = inventory.filter(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);

    // 2. The Loop (9 Slots for Backpack)
    // We fill the array to exactly 9 items, using null for ghost slots
    const inventorySlots = [...Array(9)].map((_, idx) => bucketItems[idx] || null);

    return (
        <div className="flex items-start mb-[2px] min-h-[50px]">
            {/* 3. Equipped Item (Left Column) */}
            <div className="flex-shrink-0 mr-[4px]">
                <div className="w-[48px] h-[48px] bg-[#292929] border border-white/10 relative group shadow-lg">
                    {/* Label overlay when empty */}
                    {!equippedItem && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-30 text-[9px] uppercase tracking-widest font-bold text-gray-500">
                            {label}
                        </div>
                    )}

                    {equippedItem && (
                        <InventoryItem
                            item={equippedItem}
                            definition={definitions[equippedItem.itemHash]}
                        />
                    )}
                </div>
            </div>

            {/* 4. Inventory Grid (Right Column - 3x3) */}
            <div className="flex-1 flex flex-wrap gap-[2px] content-start w-[148px]">
                {inventorySlots.map((item, idx) => (
                    <div
                        key={idx}
                        className="w-[48px] h-[48px] bg-[#141414] border border-white/5 box-border relative"
                    >
                        {item && (
                            <InventoryItem
                                item={item}
                                definition={definitions[item.itemHash]}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

interface CharacterColumnProps {
    character: any;
    equipment: any[];
    inventory: any[];
    definitions: Record<string, any>;
    artifactPower: number;
    onItemContextMenu?: (e: React.MouseEvent, item: any, definition: any) => void;
}

export const CharacterColumn: React.FC<CharacterColumnProps> = ({ character, equipment, inventory, definitions, artifactPower }) => {
    if (!character) return null;

    const { light, raceType, classType, emblemBackgroundPath, stats } = character;
    const raceNames: Record<number, string> = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
    const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
    const classNameText = classNames[classType];
    const basePower = light - artifactPower;

    return (
        <div className="flex-shrink-0 w-[240px] bg-[#11111b] border-r border-[#333] flex flex-col select-none relative">
            {/* Header / Emblem */}
            <div
                className="relative h-[48px] w-full bg-cover bg-center flex items-center justify-between px-2 bg-no-repeat z-20 shadow-md"
                style={{ backgroundImage: `url(${bungieNetPath(emblemBackgroundPath)})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                <div className="relative z-10 flex flex-col leading-none">
                    <span className="font-bold text-lg text-[#f5f5f5] tracking-wide drop-shadow-md">{classNameText}</span>
                    <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wider opacity-80">{raceNames[raceType]}</span>
                </div>
                <div className="relative z-10 flex flex-col items-end leading-none">
                    <div className="text-xl font-bold text-[#f5dc56] drop-shadow-lg font-mono tracking-tighter shadow-black">
                        {light}
                    </div>
                    <div className="text-[9px] text-[#f5dc56]/80 font-mono">
                        {basePower} <span className="text-[#50c8ce]">+{artifactPower}</span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-col bg-[#0a0a10] border-b border-white/5 p-1 gap-0.5 z-10 relative shadow-sm">
                {Object.entries(STAT_HASHES).map(([name, hash]) => {
                    const value = stats[hash] || 0;
                    const tier = Math.min(10, Math.floor(value / 10));

                    return (
                        <div key={name} className="flex items-center gap-2 h-[14px]">
                            <span className="w-8 text-[9px] text-gray-400 uppercase font-bold text-right">{name.substring(0, 3)}</span>
                            <div className="flex-1 h-2 bg-[#1a1a1a] relative">
                                <div className="h-full bg-white/20" style={{ width: `${Math.min(100, value)}%` }}>
                                    <div className="absolute inset-0 flex">
                                        {[...Array(10)].map((_, i) => (
                                            <div key={i} className={`flex-1 border-r border-black/50 ${i < tier ? 'bg-[#f5dc56]' : 'opacity-0'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <span className="w-6 text-[10px] text-right font-mono text-[#f5dc56]">{value}</span>
                        </div>
                    );
                })}
            </div>

            {/* Content Zones */}
            <div className="flex-1 p-1 z-0 flex flex-col gap-4 mt-2">

                {/* Zone A: Weapons */}
                <div className="flex flex-col gap-[2px]">
                    <BucketRow label="Kinetic" bucketHash={BUCKETS.Kinetic} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <BucketRow label="Energy" bucketHash={BUCKETS.Energy} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <BucketRow label="Power" bucketHash={BUCKETS.Power} equipment={equipment} inventory={inventory} definitions={definitions} />
                </div>

                {/* Divider / Spacer */}
                <div className="h-[1px] bg-white/10 mx-2" />

                {/* Zone B: Armor */}
                <div className="flex flex-col gap-[2px]">
                    <BucketRow label="Helmet" bucketHash={BUCKETS.Helmet} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <BucketRow label="Arms" bucketHash={BUCKETS.Gauntlets} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <BucketRow label="Chest" bucketHash={BUCKETS.Chest} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <BucketRow label="Legs" bucketHash={BUCKETS.Legs} equipment={equipment} inventory={inventory} definitions={definitions} />
                    <BucketRow label="Class" bucketHash={BUCKETS.Class} equipment={equipment} inventory={inventory} definitions={definitions} />
                </div>

                {/* Zone C: General (Optional/Hidden for now or bottom) */}
                <div className="flex flex-col gap-[2px] opacity-70">
                    <BucketRow label="Ghost" bucketHash={BUCKETS.Ghost} equipment={equipment} inventory={inventory} definitions={definitions} />
                </div>

            </div>
        </div>
    );
};
