import React from 'react';
import { RARITY_COLORS } from '../data/constants';

interface InventoryItemProps {
    item: any;
    definition: any;
    onClick?: () => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, definition, onClick }) => {
    // URL Fix: Prepend Bungie base URL
    // We check both item.icon and definition.displayProperties.icon just in case
    const iconFragment = item?.icon || definition?.displayProperties?.icon;
    const iconUrl = iconFragment ? `https://www.bungie.net${iconFragment}` : '/missing-icon.png';

    // Visual Style: Border based on rarity
    const tierType = definition?.inventory?.tierType || 0;
    const borderColor = RARITY_COLORS[tierType] || RARITY_COLORS[0];

    // Power Level
    // Check various locations for primary stat value (instanceData or top-level)
    const power = item?.instanceData?.primaryStat?.value || item?.primaryStat?.value;

    return (
        <div
            className="relative h-12 w-12 box-border border-2 bg-[#292929] cursor-pointer hover:brightness-110 active:scale-95 transition-all"
            style={{ borderColor: borderColor }}
            onClick={onClick}
        >
            {/* Image */}
            <img
                src={iconUrl}
                alt={definition?.displayProperties?.name || "Item"}
                className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Overlay: Power Level */}
            {power && (
                <div className="absolute bottom-0 right-0 left-0 bg-black/60 px-1 text-right pointer-events-none">
                    <span className="text-[10px] font-bold text-[#f5dc56] font-mono leading-none">
                        {power}
                    </span>
                </div>
            )}
        </div>
    );
};
