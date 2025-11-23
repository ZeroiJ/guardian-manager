import React from 'react';
import ItemCard from './ItemCard'; // Reuse our existing ItemCard or adapt it

export function WeaponGrid({ title, items }) {
    if (items.length === 0) return null;

    // Separate Equipped vs Inventory (Non-Transferable/Equipped)
    // Note: The API returns 'isEquipped' on the item instance.
    // We need to ensure we are passing that data down.
    const equippedItem = items.find(i => i.instanceData?.isEquipped);
    const inventoryItems = items.filter(i => !i.instanceData?.isEquipped);

    return (
        <div className="mb-8">
            <h2 className="text-sm font-bold text-[#9199a8] uppercase tracking-wider mb-2 border-b border-[#252a38] pb-1">
                {title}
            </h2>

            <div className="flex gap-4">
                {/* Equipped Slot */}
                <div className="flex-shrink-0">
                    {equippedItem ? (
                        <ItemCard
                            item={equippedItem}
                            definition={equippedItem.def}
                            isEquipped={true}
                        />
                    ) : (
                        <div className="w-24 h-24 bg-[#1a1f2e] border border-[#252a38] rounded-sm flex items-center justify-center text-[#9199a8] text-xs">
                            Empty
                        </div>
                    )}
                </div>

                {/* Inventory Grid (Up to 9 items usually) */}
                <div className="flex-1">
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-2">
                        {inventoryItems.map((item) => (
                            <ItemCard
                                key={item.itemInstanceId || item.itemHash}
                                item={item}
                                definition={item.def}
                            />
                        ))}
                        {/* Fill empty slots if needed to look like a grid? Optional. */}
                    </div>
                </div>
            </div>
        </div>
    );
}
