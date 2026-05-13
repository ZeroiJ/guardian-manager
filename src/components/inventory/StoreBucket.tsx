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
        // Container: Responsive sizing based on CSS variables
        <div 
            ref={setNodeRef}
            className={`flex items-start flex-shrink-0 p-1 -m-1 rounded transition-colors ${isOver ? 'bg-white/10 ring-1 ring-white/30' : ''}`}
            style={{
                minHeight: 'calc(var(--item-size) + 4px)',
                gap: 'var(--item-gap)',
            }}
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
                    <div 
                        className="bg-dim-bg border border-dim-border flex items-center justify-center"
                        style={{
                            width: 'var(--item-size)',
                            height: 'var(--item-size)',
                        }}
                    >
                        <span 
                            className="opacity-20 uppercase tracking-widest font-semibold text-dim-text-muted"
                            style={{ fontSize: 'calc(var(--item-size) / 8)' }}
                        >
                            —
                        </span>
                    </div>
                )}
            </div>

            {/* Inventory Grid (Right) - 3 columns using CSS variables */}
            <div 
                className="grid grid-cols-3 content-start"
                style={{
                    gap: 'var(--item-gap)',
                    minWidth: 'calc(var(--item-size) * 3 + var(--item-gap) * 2)',
                }}
            >
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
