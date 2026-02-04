import React from 'react';
import { RARITY_COLORS } from '../data/constants';
import { BungieImage } from './BungieImage';

interface InventoryItemProps {
    item: any;
    definition: any;
    onClick?: (event: React.MouseEvent) => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, definition, onClick }) => {
    // Get icon from item or definition
    const icon = item?.icon || definition?.displayProperties?.icon;

    // Visual Style: Border based on rarity
    const tierType = definition?.inventory?.tierType || 0;
    const borderColor = RARITY_COLORS[tierType] || RARITY_COLORS[0];

    // Power Level
    const power = item?.instanceData?.primaryStat?.value || item?.primaryStat?.value;

    return (
        <div
            className="relative h-12 w-12 box-border border-2 bg-[#292929] cursor-pointer hover:brightness-110 active:scale-95 transition-all"
            style={{ borderColor: borderColor }}
            onClick={onClick}
        >
            {/* Image - using BungieImage for proper URL handling */}
            <BungieImage
                src={icon}
                alt={definition?.displayProperties?.name || "Item"}
                className="absolute inset-0 w-full h-full"
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
