import React from 'react';

const TIER_COLORS = {
    Exotic: 'border-[#f4c430] bg-[#f4c430]/10',
    Legendary: 'border-[#a359ff] bg-[#a359ff]/10',
    Rare: 'border-[#4a9eff] bg-[#4a9eff]/10',
    Common: 'border-[#28a745] bg-[#28a745]/10',
    Basic: 'border-[#e8e9ed] bg-[#e8e9ed]/10',
};

const ItemCard = ({ item, definition }) => {
    if (!definition) return <div className="w-16 h-16 bg-gray-800 animate-pulse rounded" />;

    const tier = definition.inventory.tierTypeName; // e.g., "Exotic"
    const iconUrl = `https://www.bungie.net${definition.displayProperties.icon}`;
    const name = definition.displayProperties.name;
    const power = item?.instanceData?.primaryStat?.value;

    // Determine border color
    const borderClass = TIER_COLORS[tier] || 'border-gray-600';

    return (
        <div className="relative group w-24 h-24 cursor-pointer transition-all duration-300 hover:scale-105 hover:z-10">
            {/* Item Icon */}
            <div className={`w-full h-full rounded-sm overflow-hidden border-2 ${borderClass} relative shadow-lg group-hover:shadow-[0_0_15px_rgba(74,158,255,0.3)]`}>
                <img
                    src={iconUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />

                {/* Gradient Overlay for Text Readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />
            </div>

            {/* Power Level Overlay */}
            {power && (
                <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-[#0a0e14]/90 backdrop-blur-sm border border-[#252a38] px-1.5 py-0.5 rounded-sm z-20">
                    <span className="text-[10px] text-[#f4c430]">✦</span>
                    <span className="text-xs font-bold text-[#e8e9ed] leading-none">{power}</span>
                </div>
            )}

            {/* Tooltip (Enhanced) */}
            <div className="absolute z-50 hidden group-hover:block w-64 bg-[#0a0e14]/95 backdrop-blur-xl border border-[#252a38] p-3 rounded-lg shadow-2xl -top-4 left-full ml-4">
                <div className={`font-bold text-base mb-1 ${tier === 'Exotic' ? 'text-[#f4c430]' : 'text-[#e8e9ed]'}`}>
                    {name}
                </div>
                <div className="flex items-center justify-between text-xs text-[#9199a8] border-b border-[#252a38] pb-2 mb-2">
                    <span>{definition.itemTypeDisplayName}</span>
                    <span className={tier === 'Exotic' ? 'text-[#f4c430]' : tier === 'Legendary' ? 'text-[#a359ff]' : 'text-[#4a9eff]'}>
                        {tier}
                    </span>
                </div>
                {power && (
                    <div className="text-sm font-medium text-[#e8e9ed] flex items-center gap-2">
                        <span className="text-[#f4c430]">✦ {power}</span>
                        <span className="text-[#9199a8]">Power</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemCard;
