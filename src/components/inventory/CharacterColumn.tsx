import React from 'react';
import { InventoryItem } from '../InventoryItem';
import { BUCKETS } from '../../data/constants';
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
    postmaster: any[];
    maxPower: number;
    definitions: Record<string, any>;
    artifactPower: number;
    onItemContextMenu?: (e: React.MouseEvent, item: any, definition: any) => void;
}

export const CharacterColumn: React.FC<CharacterColumnProps> = ({ character, equipment, inventory, postmaster, maxPower, definitions, artifactPower }) => {
    if (!character) return null;

    const { light, raceType, classType, emblemBackgroundPath, stats } = character;
    const raceNames: Record<number, string> = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
    const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
    const classNameText = classNames[classType];
    const basePower = light - artifactPower;

    // Max Power Display Logic
    // E.g. 1800.125 -> 1800.1
    const potentialPower = maxPower ? maxPower.toFixed(1) : '---';

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
                    {/* Max Power Display */}
                    <div className="text-[9px] text-[#f5dc56]/80 font-mono flex items-center gap-1">
                        <span>{basePower}</span>
                        <span className="text-[#50c8ce]">+{artifactPower}</span>
                        <span className="text-gray-500">/</span>
                        <span className="text-[#ceae33] font-bold" title="Max Power (Base)">{potentialPower}</span>
                    </div>
                </div>
            </div>

            {/* Stats Row - Armor 3.0 Style */}
            <div className="flex flex-col bg-[#0a0a10] border-b border-white/5 p-1 gap-0.5 z-10 relative shadow-sm">
                {[
                    { label: 'Health', hash: 392767087, color: 'text-white' }, // Resilience
                    { label: 'Melee', hash: 4244567218, color: 'text-white' }, // Strength
                    { label: 'Grenade', hash: 1735777505, color: 'text-white' }, // Discipline
                    { label: 'Super', hash: 144602215, color: 'text-white' }, // Intellect
                    { label: 'Class', hash: 1943323491, color: 'text-white' }, // Recovery
                    { label: 'Weapons', hash: 2996146975, color: 'text-white' }, // Mobility
                ].map((statConfig) => {
                    const value = stats[statConfig.hash] || 0;
                    // Tiers are 0-10 based on value / 10
                    const isTierMax = value >= 100;

                    return (
                        <div key={statConfig.label} className="flex items-center h-[14px]">
                            {/* Label */}
                            <span className="w-12 text-[9px] text-gray-400 font-bold uppercase tracking-wider text-right mr-2">{statConfig.label}</span>

                            {/* Value (Hero) */}
                            <span className={`w-6 text-[11px] font-bold font-mono text-right mr-2 ${isTierMax ? 'text-[#f5dc56]' : 'text-white'}`}>
                                {value}
                            </span>

                            {/* Visual Bar (Secondary) */}
                            <div className="flex-1 h-1.5 bg-[#1a1a1a] relative rounded-sm overflow-hidden opacity-80">
                                <div
                                    className={`h-full ${isTierMax ? 'bg-[#f5dc56]' : 'bg-white/40'}`}
                                    style={{ width: `${Math.min(100, value)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Content Zones */}
            <div className="flex-1 p-1 z-0 flex flex-col gap-4 mt-2">

                {/* Postmaster Row */}
                {postmaster && postmaster.length > 0 && (
                    <div className="flex flex-col gap-[2px]">
                        <div className="text-[9px] text-[#666] font-bold uppercase mb-0.5 px-0.5 tracking-wider">Postmaster</div>
                        <div className="flex flex-wrap gap-[2px]">
                            {postmaster.map((item) => (
                                <div key={item.itemInstanceId || item.itemHash} className="w-[32px] h-[32px] border border-white/10 bg-[#1a1a1a]">
                                    <InventoryItem
                                        item={item}
                                        definition={definitions[item.itemHash]}
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="h-[1px] bg-white/5 mx-2 my-1" />
                    </div>
                )}

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
