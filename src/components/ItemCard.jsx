import React from 'react';

const TIER_COLORS = {
    Exotic: 'border-[#f4c430] bg-[#f4c430]/10',
    Legendary: 'border-[#a359ff] bg-[#a359ff]/10',
    Rare: 'border-[#4a9eff] bg-[#4a9eff]/10',
    Common: 'border-[#28a745] bg-[#28a745]/10',
    Basic: 'border-[#e8e9ed] bg-[#e8e9ed]/10',
};

const ItemCard = ({ item, definition, isEquipped, className = "w-24 h-24", compact = false }) => {
    if (!definition) return <div className={`${className} bg-gray-800 animate-pulse rounded`} />;

    const tier = definition.inventory.tierTypeName; // e.g., "Exotic"
    const iconUrl = `https://www.bungie.net${definition.displayProperties.icon}`;
    const name = definition.displayProperties.name;
    const power = item?.instanceData?.primaryStat?.value;

    // Determine border color
    const borderClass = TIER_COLORS[tier] || 'border-gray-600';

    return (
        <div className={`relative group ${className} cursor-pointer transition-all duration-200 ${isEquipped ? 'ring-1 ring-white ring-offset-2 ring-offset-black' : ''}`}>
            {/* Item Icon */}
            <div className={`w-full h-full border ${borderClass} relative shadow-sm group-hover:shadow-neo transition-all`}>
                <img
                    src={iconUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-40 group-hover:opacity-20 transition-opacity" />
            </div>

            {/* Power Level Overlay */}
            {power && !compact && (
                <div className="absolute bottom-0 right-0 bg-black border-t border-l border-white/20 px-1 py-0.5 z-20">
                    <span className="text-[10px] font-mono font-bold text-solar leading-none">{power}</span>
                </div>
            )}

            {/* Tooltip (Neo-Brutalist) */}
            <div className="absolute z-50 hidden group-hover:block w-64 bg-surface border border-white/20 p-0 shadow-neo -top-4 left-full ml-4 pointer-events-none">
                {/* Tooltip Header */}
                <div className="bg-white/5 p-3 border-b border-white/10">
                    <div className={`font-serif text-lg leading-tight mb-1 ${tier === 'Exotic' ? 'text-[#f4c430]' : 'text-white'}`}>
                        {name}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                        <span>{definition.itemTypeDisplayName}</span>
                        <span className={tier === 'Exotic' ? 'text-[#f4c430]' : tier === 'Legendary' ? 'text-void' : 'text-arc'}>
                            {tier}
                        </span>
                    </div>
                </div>

                {/* Tooltip Body */}
                <div className="p-3 bg-black/50">
                    {power && (
                        <div className="text-sm font-mono text-white flex items-center gap-2">
                            <span className="text-solar">⚡ {power}</span>
                            <span className="text-gray-500">// POWER_LEVEL</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ItemCard;
