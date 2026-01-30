import { BungieImage, bungieNetPath } from '../BungieImage';

// ... (existing imports)

// ...

// DEBUG: Titan Icon Verification
if (classType === 0) { // 0 is Titan
    console.log('[Titan Debug] Emblem Background Path:', bungieNetPath(emblemBackgroundPath));
}

const raceNames: Record<number, string> = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
const classNameText = classNames[classType];

const basePower = light - artifactPower;

return (
    <div className="flex-shrink-0 w-[240px] bg-[#11111b] border-r border-[#333] flex flex-col h-full overflow-hidden select-none relative">
        {/* Header / Emblem - Exact DIM Style */}
        <div
            className="relative h-[48px] w-full bg-cover bg-center flex items-center justify-between px-2 bg-no-repeat z-20 shadow-md"
            style={{ backgroundImage: `url(${bungieNetPath(emblemBackgroundPath)})` }}
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
        <div className="flex flex-col bg-[#0a0a10] border-b border-white/5 p-1 gap-0.5 z-10 relative shadow-sm">
            {Object.entries(STAT_HASHES).map(([name, hash]) => {
                const value = stats[hash] || 0;
                const tier = Math.min(10, Math.floor(value / 10)); // Max tier 10

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
        <div className="flex-1 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent z-0">

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
