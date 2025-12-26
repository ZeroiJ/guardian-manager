import React from 'react';
import { DAMAGE_TYPES } from '../../data/constants';

// DIM-matched Colors
const RARITY_COLORS: Record<number, string> = {
    6: '#ceae33',    // Exotic (DIM Gold)
    5: '#522f65',    // Legendary (DIM Purple)
    4: '#5076a3',    // Rare
    3: '#366f42',    // Uncommon
    2: '#c3bcb4',    // Common
    0: '#c3bcb4'     // Basic
};

const MASTERWORK_GOLD = '#eade8b'; // DIM Masterwork Border

const ELEMENT_ICONS: Record<number, string> = {
    [DAMAGE_TYPES.Arc]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_092d066688b879c807c3b460afdd61e6.png',
    [DAMAGE_TYPES.Solar]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_2a1773e10968f2d088b97c22b22bba9e.png',
    [DAMAGE_TYPES.Void]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_ceb2f6197dccf3958bb31cc783eb97a0.png',
    [DAMAGE_TYPES.Stasis]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_530c4c474d22329dc3df9f99e324022a.png',
    [DAMAGE_TYPES.Strand]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_b2fe51a94f3533f97079dfa0d27a4096.png',
    [DAMAGE_TYPES.Kinetic]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_3385a924fd3ccb936fe904098a655da0.png'
};

interface DestinyItemTileProps {
    item: any; // TODO: Define specific Bungie Item Interface
    definition: any; // TODO: Define specific Bungie Definition Interface
    onClick?: () => void;
    className?: string;
}

export const DestinyItemTile: React.FC<DestinyItemTileProps> = ({ item, definition, onClick, className = '' }) => {
    if (!item || !definition) return <div className={`w-[48px] h-[48px] bg-[#1a1a1a]`} />;

    const { state } = item;
    const isMasterwork = (state & 4) !== 0; // Bitmask for Masterwork
    const rarity = definition.inventory.tierType;
    const icon = `https://www.bungie.net${definition.displayProperties.icon}`;

    // Stats
    const power = item.instanceData?.primaryStat?.value;
    const damageTypeHash = item.instanceData?.damageTypeHash || definition.defaultDamageTypeHash;
    const elementIcon = damageTypeHash ? ELEMENT_ICONS[damageTypeHash] : null;

    // Border Logic: Masterwork overrides Rarity
    const borderColor = isMasterwork ? MASTERWORK_GOLD : (RARITY_COLORS[rarity] || RARITY_COLORS[0]);

    return (
        <div
            className={`
                relative box-border select-none cursor-pointer transition-all duration-75
                w-[48px] h-[48px]
                border-[2px]
                hover:brightness-110 group
                ${className}
            `}
            style={{
                borderColor: borderColor
            }}
            onClick={onClick}
        >
            {/* The Item Icon (Background) */}
            <div className="absolute inset-0 z-0">
                <img src={icon} alt="" className="w-full h-full object-cover" />
                
                {/* Masterwork Overlay (Texture) - TODO: Add actual texture if available */}
                {isMasterwork && (
                    <div className="absolute inset-0 border border-[#f5dc56]/30 z-10 pointer-events-none" />
                )}
            </div>

            {/* Top Right: Season / Watermark */}
            {definition.iconWatermark && (
                <div
                    className="absolute top-[1px] right-[1px] w-[12px] h-[12px] z-20 pointer-events-none bg-contain bg-no-repeat opacity-90 drop-shadow-md"
                    style={{ backgroundImage: `url(https://www.bungie.net${definition.iconWatermark})` }}
                />
            )}

            {/* Icon Tray (Element & Power) - DIM Style Bottom Bar */}
            {(elementIcon || power) && (
                <div className="absolute bottom-0 left-0 right-0 h-[14px] bg-gradient-to-t from-black/90 to-black/40 flex items-center px-[2px] justify-between z-20 pointer-events-none">
                    {/* Element */}
                    {elementIcon ? (
                        <img src={elementIcon} className="w-[11px] h-[11px] drop-shadow-sm filter brightness-125" alt="element" />
                    ) : <div />}

                    {/* Power Level */}
                    {power && (
                        <span className="text-[10px] leading-none font-bold text-[#f5dc56] drop-shadow-md font-mono tracking-tighter ml-auto">
                            {power}
                        </span>
                    )}
                </div>
            )}

            {/* Hover Tooltip (Simple) */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 bg-[#0f0f0f] border border-white/20 p-2 z-50 rounded shadow-xl pointer-events-none backdrop-blur-md">
                <div className="text-sm font-bold text-white mb-1">{definition.displayProperties.name}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wider">{definition.itemTypeDisplayName}</div>
                {item.userNote && (
                    <div className="mt-2 text-xs text-yellow-400 italic">"{item.userNote}"</div>
                )}
            </div>
        </div>
    );
};

export default DestinyItemTile;
