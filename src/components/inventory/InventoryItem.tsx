import React, { useState, useRef } from 'react';
import { RARITY_COLORS } from '../../data/constants';
import { BungieImage } from '../ui/BungieImage';

interface InventoryItemProps {
    item: any;
    definition: any;
    onClick?: (event: React.MouseEvent) => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, definition, onClick }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Get icon from item or definition
    const icon = item?.icon || definition?.displayProperties?.icon;

    // Visual Style: Border based on rarity (1px per design system)
    const tierType = definition?.inventory?.tierType || 0;
    const borderColor = RARITY_COLORS[tierType] || RARITY_COLORS[0];

    // Power Level
    const power = item?.instanceData?.primaryStat?.value || item?.primaryStat?.value;

    const handleMouseEnter = () => {
        timerRef.current = setTimeout(() => {
            setShowTooltip(true);
        }, 6000); // 6 seconds delay
    };

    const handleMouseLeave = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setShowTooltip(false);
    };

    return (
        <div
            className={`relative w-16 h-16 box-border border bg-dim-surface cursor-pointer hover:brightness-125 hover:scale-105 hover:z-10 hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-95 transition-all duration-200`}
            style={{ borderColor }}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Image - using BungieImage for proper URL handling */}
            <BungieImage
                src={icon}
                alt={definition?.displayProperties?.name || "Item"}
                className="absolute inset-0 w-full h-full"
            />

            {/* Wishlist Indicator - Top Right */}

            {/* Overlay: Power Level - white text per design audit */}
            {power && (
                <div className="absolute bottom-0 right-0 left-0 bg-black/75 px-0.5 text-right pointer-events-none">
                    <span className="text-[11px] font-medium text-dim-text font-mono leading-none font-tabular">
                        {power}
                    </span>
                </div>
            )}

            {/* Delayed Tooltip */}
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[100] w-max max-w-[200px] pointer-events-none">
                    <div className="bg-[#0f0f0f] border border-gray-700 rounded px-2 py-1 shadow-xl text-xs">
                        <div className="font-bold text-white whitespace-nowrap">
                            {definition?.displayProperties?.name}
                        </div>
                        <div className="text-gray-400 whitespace-nowrap">
                            {definition?.itemTypeDisplayName}
                        </div>
                    </div>
                    {/* Arrow */}
                    <div className="w-2 h-2 bg-[#0f0f0f] border-r border-b border-gray-700 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
                </div>
            )}
        </div>
    );
};
