import React, { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import DestinyItemTile from '../destiny/DestinyItemTile';
import { useWishlistContext } from '../../contexts/WishlistContext';

interface DraggableInventoryItemProps {
    item: any;
    definition: any;
    onContextMenu?: (e: React.MouseEvent, item: any, definition: any) => void;
}

export const DraggableInventoryItem: React.FC<DraggableInventoryItemProps> = ({ item, definition, onContextMenu }) => {
    // Generate a unique ID for Drag & Drop
    const id = item.itemInstanceId || `hash-${item.itemHash}`;

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: id,
        data: { item, definition }
    });

    // Wishlist matching
    const { getItemWishlistRoll } = useWishlistContext();
    const wishlistRoll = useMemo(() => {
        if (!definition) return undefined;
        const categories = definition.itemCategoryHashes || [];
        return getItemWishlistRoll(item, item.itemHash, categories);
    }, [item, definition, getItemWishlistRoll]);

    // When dragging, we dim the original item
    const style: React.CSSProperties | undefined = isDragging ? { opacity: 0.3 } : undefined;

    return (
        <div ref={setNodeRef} style={style} {...listeners} {...attributes} className="touch-none">
            <DestinyItemTile
                item={item}
                definition={definition}
                className="w-full h-full"
                onContextMenu={(e) => onContextMenu?.(e, item, definition)}
                wishlistRoll={wishlistRoll}
            />
        </div>
    );
};
