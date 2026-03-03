import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { InventoryItem } from './InventoryItem';

interface StoreBucketProps {
    storeId: string;
    bucketHash: number;
    equipment: any[];
    inventory: any[];
    definitions: Record<string, any>;
    onItemClick?: (item: any, definition: any, event: React.MouseEvent) => void;
}

export const StoreBucket: React.FC<StoreBucketProps> = ({ storeId, bucketHash, equipment, inventory, definitions, onItemClick }) => {
    // 1. Strict Filter Logic
    const equippedItem = equipment.find(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);
    const bucketItems = inventory.filter(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);

    // Droppable setup
    const { setNodeRef, isOver } = useDroppable({
        id: `${storeId}-${bucketHash}`,
        data: { storeId, bucketHash }
    });

    return (
        // Container: No fixed width, content-sized
        <div 
            ref={setNodeRef}
            className={`flex items-start min-h-[68px] flex-shrink-0 gap-2 p-1 -m-1 rounded transition-colors ${isOver ? 'bg-white/10 ring-1 ring-white/30' : ''}`}
        >
            {/* Equipped Item (Left) */}
            <div className="flex-shrink-0">
                {equippedItem ? (
                    <InventoryItem
                        item={equippedItem}
                        definition={definitions[equippedItem.itemHash]}
                        onClick={(e) => onItemClick && onItemClick(equippedItem, definitions[equippedItem.itemHash], e)}
                    />
                ) : (
                    <div className="w-16 h-16 bg-dim-bg border border-dim-border flex items-center justify-center">
                        <span className="opacity-20 text-[8px] uppercase tracking-widest font-semibold text-dim-text-muted">—</span>
                    </div>
                )}
            </div>

            {/* Inventory Grid (Right) - 3x3 grid, only actual items */}
            <div className="grid grid-cols-3 gap-2 content-start min-w-[208px]">
                {bucketItems.map((item, idx) => (
                    <InventoryItem
                        key={idx}
                        item={item}
                        definition={definitions[item.itemHash]}
                        onClick={(e) => onItemClick && onItemClick(item, definitions[item.itemHash], e)}
                    />
                ))}
            </div>
        </div>
    );
};
