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

    // 2. Inventory Slots (8 slots to fill 3 columns beside equipped)
    const inventorySlots = [...Array(9)].map((_, idx) => bucketItems[idx] || null);

    return (
        // Container: 260px wide (matches StoreHeader)
        // Layout: Equipped (64px) + gap (8px) + Grid (3 cols × 64px + 2 gaps × 8px = 208px) = 280px
        <div className="flex items-start min-h-[72px] flex-shrink-0 w-[260px] bg-dim-surface border-r border-dim-border p-1 gap-2">

            {/* Equipped Item (Left) */}
            <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-dim-bg border border-dim-border relative">
                    {!equippedItem && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-20 text-[8px] uppercase tracking-widest font-semibold text-dim-text-muted">
                            —
                        </div>
                    )}
                    {equippedItem && (
                        <InventoryItem
                            item={equippedItem}
                            definition={definitions[equippedItem.itemHash]}
                            onClick={(e) => onItemClick && onItemClick(equippedItem, definitions[equippedItem.itemHash], e)}
                        />
                    )}
                </div>
            </div>

            {/* Inventory Grid (Right - 3 columns) */}
            <div className="flex-1 grid grid-cols-3 gap-2 content-start">
                {inventorySlots.map((item, idx) => (
                    <div
                        key={idx}
                        className="w-16 h-16 bg-dim-bg border border-dim-border relative"
                    >
                        {item && (
                            <InventoryItem
                                item={item}
                                definition={definitions[item.itemHash]}
                                onClick={(e) => onItemClick && onItemClick(item, definitions[item.itemHash], e)}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

