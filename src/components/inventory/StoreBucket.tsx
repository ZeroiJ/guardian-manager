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
    // We assume equipment/inventory passed ARE for the correct character.
    const equippedItem = equipment.find(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);
    const bucketItems = inventory.filter(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);

    // 2. The Loop (9 Slots fixed size)
    const inventorySlots = [...Array(9)].map((_, idx) => bucketItems[idx] || null);

    return (
        <div className="flex items-start min-h-[50px] flex-shrink-0 w-[240px] bg-[#11111b] border-r border-[#333] p-1">
            {/* 3. Equipped Item (Left Column) */}
            <div className="flex-shrink-0 mr-[4px]">
                <div className="w-[48px] h-[48px] bg-[#292929] border border-white/10 relative group shadow-lg">
                    {/* Label overlay when empty (optional, maybe not needed if we have row headers) */}
                    {!equippedItem && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-10 text-[9px] uppercase tracking-widest font-bold text-gray-500">
                            Empty
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

            {/* 4. Inventory Grid (Right Column - 3x3) */}
            <div className="flex-1 flex flex-wrap gap-[2px] content-start w-[148px]">
                {inventorySlots.map((item, idx) => (
                    <div
                        key={idx}
                        className="w-[48px] h-[48px] bg-[#141414] border border-white/5 box-border relative"
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
