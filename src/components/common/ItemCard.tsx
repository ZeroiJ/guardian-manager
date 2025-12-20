import React from 'react';
import { DAMAGE_TYPES } from '../../utils/constants';

// Mapped from InventoryItem.m.scss
const RARITY_COLORS: Record<number, string> = {
    6: 'var(--color-exotic)',    // Exotic
    5: 'var(--color-legendary)', // Legendary
    4: 'var(--color-rare)',      // Rare
    3: 'var(--color-uncommon)',  // Uncommon
    2: 'var(--color-common)',    // Common
    0: 'var(--color-common)'     // Basic
};

const ELEMENT_ICONS: Record<number, string> = {
    [DAMAGE_TYPES.Arc]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_092d066688b879c807c3b460afdd61e6.png',
    [DAMAGE_TYPES.Solar]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_2a1773e10968f2d088b97c22b22bba9e.png',
    [DAMAGE_TYPES.Void]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_ceb2f6197dccf3958bb31cc783eb97a0.png',
    [DAMAGE_TYPES.Stasis]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_530c4c474d22329dc3df9f99e324022a.png',
    [DAMAGE_TYPES.Strand]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_b2fe51a94f3533f97079dfa0d27a4096.png',
    [DAMAGE_TYPES.Kinetic]: 'https://www.bungie.net/common/destiny2_content/icons/DestinyDamageTypeDefinition_3385a924fd3ccb936fe904098a655da0.png'
};

interface ItemCardProps {
    item: any; // TODO: Define specific Bungie Item Interface
    definition: any; // TODO: Define specific Bungie Definition Interface
    onClick?: () => void;
    compact?: boolean;
    className?: string;
    isEquipped?: boolean;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, definition, onClick, compact = false, className = '' }) => {
    if (!item || !definition) return <div className={`w-[var(--item-size)] h-[var(--item-size)] bg-[#1a1a1a]`} />;

    const { itemInstanceId, itemHash, state } = item;
    const isMasterwork = (state & 4) !== 0; // Bitmask for Masterwork
    const rarity = definition.inventory.tierType;
    const icon = `https://www.bungie.net${definition.displayProperties.icon}`;

    // Stats
    const power = item.instanceData?.primaryStat?.value;
    const damageTypeHash = item.instanceData?.damageTypeHash || definition.defaultDamageTypeHash;
    const elementIcon = damageTypeHash ? ELEMENT_ICONS[damageTypeHash] : null;

    // Border Logic
    const borderColor = RARITY_COLORS[rarity] || 'var(--color-common)';

    return (
        <div
            className={`
                relative box-border select-none cursor-pointer transition-all duration-200
                w-[var(--item-size)] h-[var(--item-size)]
                border-[length:var(--item-border-width)] border-transparent
                hover:bg-white/10 group
                ${className}
            `}
            style={{
                '--item-border-color': borderColor
            } as React.CSSProperties}
            onClick={onClick}
        >
            {/* The Item Icon (Background) */}
            <div className="absolute inset-0 z-0">
                <img src={icon} alt="" className="w-full h-full object-cover" />
                {/* Masterwork Overlay (Gold Border) */}
                {isMasterwork && rarity === 5 && (
                    <div className="absolute inset-0 border-[2px] border-[#f5dc56] opacity-80 z-10 pointer-events-none" />
                )}
                {/* Rarity Border (Applied via CSS variable to border-color) */}
                <div
                    className="absolute inset-0 z-10 pointer-events-none"
                    style={{ border: `var(--item-border-width) solid ${borderColor}` }}
                />
            </div>

            {/* Top Right: Season / Watermark (Replicated .topRight) */}
            {definition.iconWatermark && (
                <div
                    className="absolute top-[2px] right-[2px] w-[13px] h-[13px] z-20 pointer-events-none bg-contain bg-no-repeat opacity-80"
                    style={{ backgroundImage: `url(https://www.bungie.net${definition.iconWatermark})` }}
                />
            )}

            {/* Icon Tray (Element & Power) - Replicated .icons */}
            <div className="absolute bottom-[2px] left-[2px] right-[2px] flex items-center justify-between z-20 pointer-events-none">
                {/* Element */}
                {elementIcon ? (
                    <img src={elementIcon} className="w-[12px] h-[12px] drop-shadow-md" alt="element" />
                ) : <div />}

                {/* Power Level */}
                {power && (
                    <span className="text-[11px] leading-none font-bold text-[#f5dc56] drop-shadow-md font-mono tracking-tighter">
                        {power}
                    </span>
                )}
            </div>

            {/* Tooltip (Simplified for now) */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none bg-white transition-opacity" />
        </div>
    );
};

export default ItemCard;
