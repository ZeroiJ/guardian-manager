import React from 'react';
import { DAMAGE_TYPES } from '../../utils/constants';

const TIER_STYLES = {
    Exotic: 'border-[#ceae33] bg-[#ceae33]/20',
    Legendary: 'border-[#522f65] bg-[#522f65]/20',
    Rare: 'border-[#5076a3] bg-[#5076a3]/20',
    Common: 'border-[#366f3c] bg-[#366f3c]/20',
    Basic: 'border-[#c3bcb4] bg-[#c3bcb4]/20',
};

const ELEMENT_ICONS = {
    [DAMAGE_TYPES.Arc]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_092d066688b879c807c3b460afdd61e6.png',
    [DAMAGE_TYPES.Solar]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_2a1773e10968f2d088b97c22b22bba9e.png',
    [DAMAGE_TYPES.Void]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_ceb2f6197dccf3958bb31cc783eb97a0.png',
    [DAMAGE_TYPES.Stasis]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_530c4c474d22329dc3df9f99e324022a.png',
    [DAMAGE_TYPES.Strand]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_b2fe51a94f3533f97079dfa0d27a4096.png',
};

const ItemCard = ({ item, definition, isEquipped, className = "w-[48px] h-[48px]", compact = false }) => {
    if (!definition) return <div className={`${className} bg-gray-800 animate-pulse rounded-sm`} />;

    const tier = definition.inventory.tierTypeName;
    const iconUrl = `https://www.bungie.net${definition.displayProperties.icon}`;
    const name = definition.displayProperties.name;
    const power = item?.instanceData?.primaryStat?.value;
    const damageTypeHash = item?.instanceData?.damageTypeHash;
    const isMasterwork = (item?.instanceData?.state & 4) !== 0; // Bitmask 4 is Masterwork (needs verification, standard is checking state) or state 4? 
    // Actually masterwork is usually checked via energy or sockets, but let's stick to simple state for now or frame.

    // Determine border styling
    const borderClass = TIER_STYLES[tier] || 'border-gray-600';

    return (
        <div className={`relative group ${className} cursor-pointer select-none`}>
            {/* Main Icon container */}
            <div className={`w-full h-full relative overflow-hidden border ${borderClass} ${isMasterwork ? 'border-yellow-400 border-2' : ''}`}>
                <img
                    src={iconUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    draggable="false"
                />

                {/* Element Overlay Icon */}
                {damageTypeHash && ELEMENT_ICONS[damageTypeHash] && (
                    <div className="absolute right-0.5 bottom-0.5 w-3 h-3 z-10 opacity-90 drop-shadow-md">
                        <img src={ELEMENT_ICONS[damageTypeHash]} alt="Element" className="w-full h-full" />
                    </div>
                )}
            </div>

            {/* Power Level / Count */}
            {power && (
                <div className="absolute bottom-0 right-1 z-20 pointer-events-none">
                    <span
                        className={`text-[10px] font-bold leading-none drop-shadow-md text-[#f5f5f5]`}
                        style={{ textShadow: '1px 1px 0 #000' }}
                    >
                        {power}
                    </span>
                </div>
            )}

            {/* Tooltip (Simplified for now) */}
            <div className="absolute z-50 hidden group-hover:block w-48 bg-[#0f0f0f] border border-white/20 p-2 shadow-2xl -top-2 left-full ml-2 pointer-events-none z-[100]">
                <div className={`text-sm font-bold leading-tight mb-1 ${tier === 'Exotic' ? 'text-[#ceae33]' : 'text-white'}`}>
                    {name}
                </div>
                <div className="text-xs text-gray-400">{definition.itemTypeDisplayName}</div>
            </div>
        </div>
    );
};

export default ItemCard;
