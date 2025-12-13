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
    if (!definition) return <div className={`${className} bg-gray-800 animate-pulse`} />;

    const tier = definition.inventory.tierTypeName;
    const iconUrl = `https://www.bungie.net${definition.displayProperties.icon}`;
    const name = definition.displayProperties.name;
    const power = item?.instanceData?.primaryStat?.value;
    const damageTypeHash = item?.instanceData?.damageTypeHash;
    const isMasterwork = (item?.instanceData?.state & 4) !== 0; 
    const isDeepsight = (item?.instanceData?.state & 1) !== 0; // Simplified deepsight check (needs robust plug check usually)

    // Determine border styling
    // DIM Style: Border is usually 1px solid based on rarity.
    const borderClass = TIER_STYLES[tier] || 'border-gray-800';
    
    // Masterwork: Gold Border Overlay
    const masterworkClass = isMasterwork ? 'border-[#eec24e] border-2' : 'border';

    return (
        <div className={`relative group ${className} cursor-pointer select-none bg-[#101010]`}>
            {/* Main Icon container */}
            <div className={`w-full h-full relative overflow-hidden ${borderClass} ${masterworkClass} box-border`}>
                <img
                    src={iconUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    draggable="false"
                />

                {/* Element Overlay Icon (Bottom Left - subtle) */}
                {damageTypeHash && ELEMENT_ICONS[damageTypeHash] && (
                    <div className="absolute left-0.5 bottom-0.5 w-2.5 h-2.5 z-10 opacity-90 drop-shadow-md">
                        <img src={ELEMENT_ICONS[damageTypeHash]} alt="Element" className="w-full h-full" />
                    </div>
                )}
            </div>

            {/* Power Level / Count (Bottom Right - Bold, Yellow/White) */}
            {power && (
                <div className="absolute bottom-[1px] right-[2px] z-20 pointer-events-none">
                    <span
                        className={`text-[9px] font-bold leading-none text-[#eec24e] font-mono`}
                        style={{ textShadow: '1px 1px 0 #000, 0px 0px 2px black' }}
                    >
                        {power}
                    </span>
                </div>
            )}

            {/* Tooltip (Hover) */}
            <div className="absolute z-[100] hidden group-hover:block w-52 bg-[#080808]/95 border border-white/10 p-2 shadow-2xl -top-2 left-full ml-1 pointer-events-none backdrop-blur-sm">
                <div className={`text-sm font-bold leading-tight mb-1 ${tier === 'Exotic' ? 'text-[#ceae33]' : 'text-white'}`}>
                    {name}
                </div>
                <div className="text-[10px] text-gray-400 uppercase tracking-widest mb-1">{definition.itemTypeDisplayName}</div>
                {power && <div className="text-xs text-[#eec24e] font-bold mb-1">⚡ {power}</div>}
            </div>
        </div>
    );
};

export default ItemCard;
