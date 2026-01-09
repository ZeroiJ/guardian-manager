import React from 'react';
import ItemCard from './ItemCard'; // Reuse our existing ItemCard or adapt it

export function WeaponGrid({ title, items }) {
    if (items.length === 0) return null;

    // Filter items by location
    const equippedItem = items.find(i => i.instanceData?.location === 'equipped');
    const inHandItems = items.filter(i => i.instanceData?.location === 'inHand');
    const vaultItems = items.filter(i => i.instanceData?.location === 'vault');

    return (
        <div className="mb-12">
            <div className="flex items-center gap-4 mb-6 border-b border-white/20 pb-2">
                <div className="w-2 h-2 bg-solar animate-pulse" />
                <h2 className="text-xl font-serif text-white tracking-wide">
                    {title}
                </h2>
                <div className="flex-1 h-px bg-white/10" />
                <span className="font-mono text-xs text-gray-500">SECTION_ID: {title.toUpperCase().replace(/\s/g, '_')}</span>
            </div>

            <div className="flex gap-8 items-start w-full">
                {/* Column 1: Equipped Slot */}
                <div className="flex-shrink-0 w-24">
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Equipped</div>
                    {equippedItem ? (
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-void to-arc opacity-0 group-hover:opacity-50 blur transition-opacity" />
                            <ItemCard
                                item={equippedItem}
                                definition={equippedItem.def}
                                isEquipped={true}
                                className="relative z-10 border border-white/20 shadow-neo"
                            />
                        </div>
                    ) : (
                        <div className="w-24 h-24 bg-black border border-dashed border-gray-700 flex items-center justify-center text-gray-600 text-xs font-mono">
                            EMPTY
                        </div>
                    )}
                </div>

                {/* Column 2: In-Hand Grid (3x3) */}
                <div className="flex-shrink-0 w-[152px]">
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">In Hand</div>
                    <div className="grid grid-cols-3 gap-1 p-1 bg-surface border border-white/10 shadow-neo">
                        {[...Array(9)].map((_, index) => {
                            const item = inHandItems[index];
                            return (
                                <div key={index} className="w-12 h-12 bg-black border border-white/5 relative group">
                                    {item && (
                                        <ItemCard
                                            item={item}
                                            definition={item.def}
                                            className="w-full h-full"
                                            compact={true}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Column 3: Vault / Inventory */}
                <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gray-500 mb-2 uppercase tracking-wider">Vault Storage</div>
                    <div className="flex flex-wrap gap-1 bg-black/50 p-4 border border-white/10 min-h-[150px] shadow-inner">
                        {vaultItems.map((item) => (
                            <div key={item.itemInstanceId || item.itemHash} className="w-12 h-12 hover:scale-105 transition-transform duration-150 cursor-pointer border border-transparent hover:border-white/50">
                                <ItemCard
                                    item={item}
                                    definition={item.def}
                                    className="w-full h-full"
                                    compact={true}
                                />
                            </div>
                        ))}
                        {vaultItems.length === 0 && (
                            <div className="w-full flex items-center justify-center text-gray-600 text-sm font-mono h-full">
                                // NO_ITEMS_FOUND
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
