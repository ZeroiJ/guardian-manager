import React from 'react';
import { useDragLayer } from 'react-dnd';
import { DRAG_TYPE } from './DraggableInventoryItem';
import DestinyItemTile from '../destiny/DestinyItemTile';

const layerStyles: React.CSSProperties = {
    position: 'fixed',
    pointerEvents: 'none',
    zIndex: 9999, // Ensure it's above everything
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
};

function getItemStyles(initialOffset: { x: number, y: number } | null, currentOffset: { x: number, y: number } | null) {
    if (!initialOffset || !currentOffset) {
        return {
            display: 'none',
        };
    }

    const { x, y } = currentOffset;
    const transform = `translate(${x}px, ${y}px)`;

    return {
        transform,
        WebkitTransform: transform,
    };
}

export const InventoryDragLayer: React.FC = () => {
    const {
        itemType,
        isDragging,
        item,
        initialOffset,
        currentOffset,
    } = useDragLayer((monitor) => ({
        item: monitor.getItem(),
        itemType: monitor.getItemType(),
        initialOffset: monitor.getInitialSourceClientOffset(),
        currentOffset: monitor.getSourceClientOffset(),
        isDragging: monitor.isDragging(),
    }));

    if (!isDragging || itemType !== DRAG_TYPE) {
        return null;
    }

    return (
        <div style={layerStyles}>
            <div style={getItemStyles(initialOffset, currentOffset)}>
                <div className="w-[48px] h-[48px] shadow-2xl scale-110 pointer-events-none" style={{ transform: 'rotate(5deg)' }}>
                    <DestinyItemTile
                        item={item.item}
                        definition={item.definition}
                        className="border-[#f5dc56] shadow-[0_0_15px_rgba(245,220,86,0.5)]"
                    />
                </div>
            </div>
        </div>
    );
};
