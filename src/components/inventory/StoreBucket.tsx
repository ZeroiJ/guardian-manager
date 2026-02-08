import React from 'react';
import { InventoryItem } from './InventoryItem';

interface StoreBucketProps {
    bucketHash: number;
    equipment: any[];
    inventory: any[];
    definitions: Record<string, any>;
    onItemClick?: (item: any, definition: any, event: React.MouseEvent) => void;
}

export const StoreBucket: React.FC<StoreBucketProps> = ({ bucketHash, equipment, inventory, definitions, onItemClick }) => {

    // 1. Strict Filter Logic
    const equippedItem = equipment.find(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);
    const bucketItems = inventory.filter(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);

    // 2. Inventory Slots (9 slots to fill 3x3 grid)
    const inventorySlots = [...Array(9)].map((_, idx) => bucketItems[idx] || null);

    return (
        // Container: 280px wide = Equipped (64px) + gap (8px) + Grid (3×64 + 2×8 = 208px)
        <div className="flex items-start min-h-[72px] flex-shrink-0 bg-dim-surface border-r border-dim-border p-1 gap-2">

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

            {/* Inventory Grid (Right - 3x3) */}
            <div className="grid grid-cols-3 gap-1 content-start">
                {inventorySlots.map((item, idx) => (
                    item ? (
                        <InventoryItem
                            key={idx}
                            item={item}
                            definition={definitions[item.itemHash]}
                            onClick={(e) => onItemClick && onItemClick(item, definitions[item.itemHash], e)}
                        />
                    ) : (
                        <div
                            key={idx}
                            className="w-16 h-16 bg-dim-bg border border-dim-border"
                        />
                    )
                ))}
            </div>
        </div>
    );
};
