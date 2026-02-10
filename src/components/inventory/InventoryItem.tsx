import React from 'react';
import { RARITY_COLORS } from '../../data/constants';
import { BungieImage } from '../ui/BungieImage';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

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

    // Draggable Logic
    // Only enable drag for items with an instance ID (actual inventory items)
    const isDraggable = !!item?.itemInstanceId;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item?.itemInstanceId || 'placeholder',
        data: {
            // We pass a Ref to the current data so the event handler has access to it
            // Using a ref is better performance-wise but data object works too if memoized.
            // dnd-kit recommends passing data here.
            current: { item, definition }
        },
        disabled: !isDraggable
    });

    const style = {
        // transform: CSS.Translate.toString(transform), // Removed to prevent original item from moving and blocking drop targets
        borderColor: borderColor,
        opacity: isDragging ? 0.3 : 1,
        zIndex: isDragging ? 50 : undefined
    };

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`relative w-16 h-16 box-border border bg-dim-surface cursor-pointer hover:brightness-125 hover:scale-105 hover:z-10 active:scale-95 transition-all duration-150 ${isDragging ? 'brightness-50' : ''}`}
            style={style}
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
    );
};
