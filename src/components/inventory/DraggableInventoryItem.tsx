import React, { useEffect } from 'react';
import { useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

// Drag Type
export const DRAG_TYPE = 'INVENTORY_ITEM';

interface DraggableInventoryItemProps {
    item: any;
    definition: any;
    children: React.ReactNode;
    className?: string;
}

export const DraggableInventoryItem: React.FC<DraggableInventoryItemProps> = ({ item, definition, children, className }) => {
    // Only items with instanceId can be moved (instanced items)
    const canDrag = !!item?.itemInstanceId;

    const [{ isDragging }, drag, preview] = useDrag(() => ({
        type: DRAG_TYPE,
        item: {
            item,
            definition,
            // We pass this data so the drop target knows what it's receiving
            id: item.itemInstanceId,
            hash: item.itemHash,
            owner: item.owner
        },
        canDrag: canDrag,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [item, definition, canDrag]);

    // Hide the default HTML5 drag preview 
    // We will render a custom drag layer instead
    useEffect(() => {
        preview(getEmptyImage(), { captureDraggingState: true });
    }, [preview]);

    if (!canDrag) {
        return <div className={className}>{children}</div>;
    }

    return (
        <div
            ref={drag}
            className={`${className} ${isDragging ? 'opacity-30' : 'opacity-100'} cursor-grab active:cursor-grabbing`}
            style={{ touchAction: 'none' }} // Prevention for touch devices if we ever support touch backend
        >
            {children}
        </div>
    );
};
