import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import DestinyItemTile from '../destiny/DestinyItemTile';

interface DraggableInventoryItemProps {
    item: any;
    definition: any;
}

export const DraggableInventoryItem: React.FC<DraggableInventoryItemProps> = ({ item, definition }) => {
    // Generate a unique ID for Drag & Drop
    const id = item.itemInstanceId || `hash-${item.itemHash}`;

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: id,
        data: { item, definition }
    });

    // When dragging, we dim the original item
    const style: React.CSSProperties | undefined = isDragging ? { opacity: 0.3 } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
            <DestinyItemTile item={item} definition={definition} className="w-full h-full" />
        </div>
    );
};
