import React from 'react';
import ItemCard from './ItemCard'; // Reuse our existing ItemCard or adapt it

export function WeaponGrid({ title, items }) {
    if (items.length === 0) return null;

    // Filter items by location
    const equippedItem = items.find(i => i.instanceData?.location === 'equipped');
    const inHandItems = items.filter(i => i.instanceData?.location === 'inHand');
    const vaultItems = items.filter(i => i.instanceData?.location === 'vault');

    return (
        <div className="mb-8">
            <h2 className="text-sm font-bold text-[#9199a8] uppercase tracking-wider mb-2 border-b border-[#252a38] pb-1">
                {title}
            </h2>

            <div className="flex gap-6 items-start w-full">
                {/* Column 1: Equipped Slot */}
                <div className="flex-shrink-0 w-24">
                    <div className="text-xs text-[#9199a8] mb-1 uppercase tracking-wider">Equipped</div>
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

                {/* Column 2: In-Hand Grid (3x3) */}
                <div className="flex-shrink-0 w-[152px]"> {/* 3 * 48px + 2 * 4px gap = 144 + 8 = 152px */}
                    <div className="text-xs text-[#9199a8] mb-1 uppercase tracking-wider">In Hand</div>
                    <div className="grid grid-cols-3 gap-1">
                        {/* Render exactly 9 slots */}
                        {[...Array(9)].map((_, index) => {
                            const item = inHandItems[index];
                            return (
                                <div key={index} className="w-12 h-12 bg-[#1a1f2e] border border-[#252a38] rounded-sm relative">
                                    {item && (
                                        <ItemCard
                                            item={item}
                                            definition={item.def}
                                            className="w-full h-full" // Force smaller size
                                            compact={true} // Pass compact flag for styling adjustments
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Column 3: Vault / Inventory */}
                <div className="flex-1 min-w-0">
                    <div className="text-xs text-[#9199a8] mb-1 uppercase tracking-wider">Vault</div>
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1 bg-[#101419]/50 p-2 rounded-lg border border-[#252a38]/50 min-h-[150px]">
                        {vaultItems.map((item) => (
                            <div key={item.itemInstanceId || item.itemHash} className="w-12 h-12">
                                <ItemCard
                                    item={item}
                                    definition={item.def}
                                    className="w-full h-full"
                                    compact={true}
                                />
                            </div>
                        ))}
                        {vaultItems.length === 0 && (
                            <div className="col-span-full flex items-center justify-center text-[#9199a8] text-sm italic h-full">
                                No items in Vault
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
