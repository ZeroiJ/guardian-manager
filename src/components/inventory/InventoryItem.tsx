import React, { useState, useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { RARITY_COLORS, MASTERWORK_GOLD } from '../../data/constants';
import { BungieImage, bungieNetPath } from '../ui/BungieImage';
import { useBulkSelectStore } from '../../store/useBulkSelectStore';

/** ItemState bitmask constants from Bungie API */
const ITEM_STATE_CRAFTED = 8;

interface InventoryItemProps {
    item: any;
    definition: any;
    draggable?: boolean;
    onClick?: (event: React.MouseEvent) => void;
}

export const InventoryItem: React.FC<InventoryItemProps> = ({ item, definition, draggable = true, onClick }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Draggable setup
    // We can only drag items that have an instanceId and are not equipped
    const isEquipped = item?.instanceData?.isEquipped;
    const canDrag = draggable && item?.itemInstanceId && !isEquipped;
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: item?.itemInstanceId || `fallback-${item?.itemHash}`,
        data: { item, definition },
        disabled: !canDrag
    });

    // Bulk selection
    const bulkActive = useBulkSelectStore((s) => s.active);
    const isSelected = useBulkSelectStore((s) => item?.itemInstanceId ? s.selectedIds.has(item.itemInstanceId) : false);
    const bulkToggle = useBulkSelectStore((s) => s.toggle);

    const handleClick = (e: React.MouseEvent) => {
        // Ctrl/Cmd+Click or Meta+Click: toggle bulk selection
        if ((e.ctrlKey || e.metaKey) && item?.itemInstanceId) {
            e.stopPropagation();
            bulkToggle(item.itemInstanceId);
            return;
        }
        // If bulk mode is active and user clicks (no modifier), toggle this item
        if (bulkActive && item?.itemInstanceId) {
            e.stopPropagation();
            bulkToggle(item.itemInstanceId);
            return;
        }
        // Normal click: open item popup
        onClick?.(e);
    };

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        // When dragging, we don't want the original to respond to pointers
        pointerEvents: isDragging ? 'none' as const : undefined,
    };

    // Get icon from item or definition
    const icon = item?.icon || definition?.displayProperties?.icon;

    // Visual Style: Border based on rarity (1px per design system)
    const tierType = definition?.inventory?.tierType || 0;
    const borderColor = RARITY_COLORS[tierType] || RARITY_COLORS[0];

    // Masterwork detection: Bungie state bitmask bit 2 (& 4)
    const isMasterwork = (item?.state & 4) !== 0;
    const effectiveBorderColor = isMasterwork ? MASTERWORK_GOLD : borderColor;

    // Crafted detection: state bitmask bit 3 (& 8)
    const isCrafted = Boolean(item?.state & ITEM_STATE_CRAFTED);

    // Deepsight resonance: item has active deepsight (objectives incomplete on the item)
    const hasDeepsight = Boolean(
        item?.objectives?.objectives?.some(
            (o: any) => !o.complete && o.visible !== false
        )
    );

    // Season watermark from definition
    const watermarkIcon = definition?.iconWatermark || definition?.iconWatermarkShelved;

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
            ref={setNodeRef}
            {...(canDrag ? listeners : {})}
            {...(canDrag ? attributes : {})}
            className={`relative w-16 h-16 box-border border cursor-pointer hover:brightness-125 hover:scale-105 hover:z-10 hover:shadow-[0_0_15px_rgba(255,255,255,0.15)] active:scale-95 transition-all duration-200 ${isSelected ? 'ring-2 ring-[#f5dc56] ring-offset-1 ring-offset-black' : ''}`}
            style={{
                ...style,
                borderColor: hasDeepsight ? '#22d3ee' : effectiveBorderColor,
                backgroundColor: isMasterwork ? '#3d3523' : undefined,
                boxShadow: hasDeepsight ? 'inset 0 0 10px rgba(34,211,238,0.25), 0 0 6px rgba(34,211,238,0.15)' : undefined,
            }}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Item icon */}
            <BungieImage
                src={icon}
                alt={definition?.displayProperties?.name || "Item"}
                className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Season watermark overlay */}
            {watermarkIcon && (
                <img
                    src={bungieNetPath(watermarkIcon)}
                    alt=""
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ opacity: 0.7 }}
                    loading="lazy"
                />
            )}

            {/* Masterwork golden hue overlay */}
            {isMasterwork && (
                <div className="absolute inset-0 pointer-events-none z-[1]" style={{ boxShadow: 'inset 0 0 12px rgba(234, 222, 139, 0.25)' }} />
            )}

            {/* Bulk selection checkbox */}
            {(bulkActive || isSelected) && item?.itemInstanceId && (
                <div className="absolute top-0 right-0 z-[3] pointer-events-none">
                    <div className={`w-4 h-4 rounded-bl flex items-center justify-center text-[10px] font-bold ${isSelected ? 'bg-[#f5dc56] text-black' : 'bg-black/60 text-gray-400'}`}>
                        {isSelected ? '\u2713' : ''}
                    </div>
                </div>
            )}

            {/* Crafted badge — top-left corner */}
            {isCrafted && (
                <div
                    className="absolute top-0 left-0 z-[2] pointer-events-none"
                    title="Shaped weapon"
                >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <polygon
                            points="0,0 14,0 0,14"
                            fill="rgba(251,191,36,0.85)"
                        />
                        {/* Small diamond/sparkle in the corner triangle */}
                        <path d="M3.5 2.5L4.2 4L5 4.7L4.2 5.4L3.5 7L2.8 5.4L2 4.7L2.8 4Z" fill="#0d0d0f" />
                    </svg>
                </div>
            )}

            {/* Overlay: Power Level - bottom-right compact badge */}
            {power && (
                <div className={`absolute bottom-0 right-0 px-[2px] leading-[13px] pointer-events-none z-[2] ${isMasterwork ? 'bg-[#eade8b]' : 'bg-black/75'}`}>
                    <span className={`text-[9px] font-bold font-mono font-tabular ${isMasterwork ? 'text-black' : 'text-white'}`}>
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
