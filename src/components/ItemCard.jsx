import React from 'react';

const TIER_COLORS = {
    Exotic: 'border-yellow-400 bg-yellow-400/10',
    Legendary: 'border-purple-500 bg-purple-500/10',
    Rare: 'border-blue-500 bg-blue-500/10',
    Common: 'border-green-500 bg-green-500/10',
    Basic: 'border-gray-400 bg-gray-400/10',
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
        <div className="relative group w-20 h-20 cursor-pointer transition-transform transform hover:scale-105">
            {/* Item Icon */}
            <img
                src={iconUrl}
                alt={name}
                className={`w-full h-full object-cover border-2 ${borderClass} rounded-sm`}
            />

            {/* Power Level Overlay */}
            {power && (
                <div className="absolute bottom-0.5 right-0.5 bg-black/80 text-yellow-300 text-[10px] font-bold px-1 rounded-tl-sm">
                    {power}
                </div>
            )}

            {/* Tooltip (Simple Hover) */}
            <div className="absolute z-50 hidden group-hover:block w-48 bg-[#1a1a1a] border border-gray-700 p-2 rounded shadow-xl -top-2 left-full ml-2">
                <div className={`font-bold text-sm ${tier === 'Exotic' ? 'text-yellow-400' : 'text-gray-200'}`}>
                    {name}
                </div>
                <div className="text-xs text-gray-400 mt-1">{definition.itemTypeDisplayName}</div>
                {power && <div className="text-xs text-yellow-300 mt-1">Power: {power}</div>}
            </div>
        </div>
    );
};

export default ItemCard;
