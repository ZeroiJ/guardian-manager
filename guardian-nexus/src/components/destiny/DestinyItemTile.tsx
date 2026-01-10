import React from 'react';
import { DAMAGE_TYPES, RARITY_COLORS, MASTERWORK_GOLD } from '../../data/constants';
import { Lock, Star, Ban, StickyNote } from 'lucide-react';
import { BungieImage } from '../ui/BungieImage';

const ELEMENT_ICONS: Record<number, string> = {
    [DAMAGE_TYPES.Arc]: 'https://www.bungie.net/common/destiny2_content/icons/092d066688b879c807c3b460afdd61e6.png',
    [DAMAGE_TYPES.Solar]: 'https://www.bungie.net/common/destiny2_content/icons/2a1773e10968f2d088b97c22b22bba9e.png',
    [DAMAGE_TYPES.Void]: 'https://www.bungie.net/common/destiny2_content/icons/ceb2f6197dccf3958bb31cc783eb97a0.png',
    [DAMAGE_TYPES.Stasis]: 'https://www.bungie.net/common/destiny2_content/icons/530c4c474d22329dc3df9f99e324022a.png',
    [DAMAGE_TYPES.Strand]: 'https://www.bungie.net/common/destiny2_content/icons/b2fe51a94f3533f97079dfa0d27a4096.png',
    [DAMAGE_TYPES.Kinetic]: 'https://www.bungie.net/common/destiny2_content/icons/3385a924fd3ccb936fe904098a655da0.png'
};

interface DestinyItemTileProps {
    item: any; // TODO: Define specific Bungie Item Interface
    definition: any; // TODO: Define specific Bungie Definition Interface
    onClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    className?: string;
    isNew?: boolean; // New prop for "New Item" glow
}

export const DestinyItemTile: React.FC<DestinyItemTileProps> = ({ item, definition, onClick, onContextMenu, className = '', isNew = false }) => {
    if (!item || !definition) return <div className={`w-[48px] h-[48px] bg-[#1a1a1a]`} />;

    const { state } = item;
    const isMasterwork = (state & 4) !== 0; // Bitmask for Masterwork
    const isLocked = (state & 1) !== 0; // Bitmask for Locked
    const icon = definition.displayProperties?.icon;

    // DEBUG: Trace icon Data
    // if (!icon) console.warn('[DestinyItemTile] Missing Icon for:', definition.displayProperties?.name);

    // Stats
    const power = item.instanceData?.primaryStat?.value;
    const damageTypeHash = item.instanceData?.damageTypeHash || definition.defaultDamageTypeHash;
    const elementIcon = damageTypeHash ? ELEMENT_ICONS[damageTypeHash] : null;

    // Border Logic: Masterwork overrides Rarity
    const borderColor = isMasterwork ? MASTERWORK_GOLD : (RARITY_COLORS[definition.inventory?.tierType] || RARITY_COLORS[0]);

    // Tags
    const tag = item.userTag; // 'favorite' | 'keep' | 'junk' | 'archive'
    const note = item.userNote;

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
            onContextMenu={onContextMenu}
        >
            {/* The Item Icon (Background) */}
            <div className="absolute inset-0 z-0 bg-[#222]">
                <BungieImage
                    src={icon}
                    className="w-full h-full object-cover"
                />

                {/* Masterwork Overlay (Texture) */}
                {isMasterwork && (
                    <div className="absolute inset-0 border border-[#f5dc56]/30 z-10 pointer-events-none mix-blend-overlay" />
                )}

                {/* New Item Glow (Pulse) */}
                {isNew && (
                    <div className="absolute inset-0 border-2 border-[#50c8ce] shadow-[0_0_8px_#50c8ce] opacity-80 animate-pulse z-20 pointer-events-none" />
                )}
            </div>

            {/* Top Right: Season / Watermark */}
            {definition.iconWatermark && (
                <div
                    className="absolute top-[1px] right-[1px] w-[12px] h-[12px] z-20 pointer-events-none bg-contain bg-no-repeat opacity-90 drop-shadow-md"
                    style={{ backgroundImage: `url(https://www.bungie.net${definition.iconWatermark})` }}
                />
            )}

            {/* Top Left: Tags / Lock */}
            <div className="absolute top-0 left-0 p-[2px] flex flex-col gap-0.5 z-30 pointer-events-none">
                {isLocked && <Lock size={10} className="text-[#f5f5f5] drop-shadow-md" strokeWidth={3} />}
                {tag === 'favorite' && <Star size={10} className="text-[#f5dc56] fill-[#f5dc56] drop-shadow-md" />}
                {tag === 'junk' && <Ban size={10} className="text-red-500 drop-shadow-md" strokeWidth={3} />}
                {note && <StickyNote size={10} className="text-blue-400 drop-shadow-md" strokeWidth={3} />}
            </div>

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

            {/* Hover Tooltip (Rich) */}
            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-3 hidden group-hover:block min-w-[200px] w-max max-w-[260px] bg-[#0f0f0f]/95 border border-white/20 p-3 z-50 rounded-lg shadow-2xl pointer-events-none backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0">
                {/* Header: Name & Rarity Color */}
                <div className="text-base font-bold text-white mb-0.5" style={{ color: definition.inventory?.tierType === 6 ? '#ceae33' : definition.inventory?.tierType === 5 ? '#a38cbe' : 'white' }}>
                    {definition.displayProperties.name}
                </div>

                {/* Subheader: Type & Power */}
                <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                    <div className="text-xs text-stone-300 font-medium tracking-wide uppercase">{definition.itemTypeDisplayName}</div>
                    {power && <div className="text-xs text-[#f5dc56] font-bold">⚡ {power}</div>}
                </div>

                {/* Description (Italic flavor text basically) */}
                {/* Only show flavor text if no note, to save space? Or always? Let's show note if exists */}
                {note ? (
                    <div className="bg-[#1a1a1a] p-2 rounded border border-white/5 relative">
                        <StickyNote size={12} className="absolute top-2 left-2 text-blue-400" />
                        <div className="text-xs text-blue-200 italic pl-5 break-words">"{note}"</div>
                    </div>
                ) : (
                    definition.flavorText && <div className="text-[10px] text-gray-500 italic leading-snug">{definition.flavorText}</div>
                )}
            </div>
        </div>
    );
};

export default DestinyItemTile;
