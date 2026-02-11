import React from 'react';
import { RARITY_COLORS } from '../../data/constants';
import { BungieImage } from '../ui/BungieImage';
import { DraggableInventoryItem } from './DraggableInventoryItem';

interface InventoryItemProps {
    item: any;
    definition: any;
    onClick?: (event: React.MouseEvent) => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, definition, onClick }) => {
    // Get icon from item or definition
    const icon = item?.icon || definition?.displayProperties?.icon;

    // Visual Style: Border based on rarity (1px per design system)
    const tierType = definition?.inventory?.tierType || 0;
    const borderColor = RARITY_COLORS[tierType] || RARITY_COLORS[0];

    // Power Level
    const power = item?.instanceData?.primaryStat?.value || item?.primaryStat?.value;

    return (
        <DraggableInventoryItem item={item} definition={definition} className="w-16 h-16">
            <div
                className={`relative w-full h-full box-border border bg-dim-surface cursor-pointer hover:brightness-125 hover:scale-105 hover:z-10 active:scale-95 transition-all duration-150`}
                style={{ borderColor }}
                onClick={onClick}
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
            </div>
        </DraggableInventoryItem>
    );
};
