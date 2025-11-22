import React from 'react';
import ItemCard from './ItemCard'; // Reuse our existing ItemCard or adapt it

export function WeaponGrid({ title, items }) {
    if (items.length === 0) return null;

    return (
        <div>
            <h2 className="text-xl font-medium mb-4 flex items-center gap-2">
                <span className="w-1 h-6 bg-[#4a9eff] rounded-full" />
                {title}
                <span className="text-sm text-[#9199a8] ml-2">({items.length})</span>
            </h2>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(6rem,1fr))] gap-4">
                {items.map((item) => (
                    <ItemCard
                        key={item.itemInstanceId || item.itemHash}
                        item={item}
                        definition={item.def}
                    />
                ))}
            </div>
        </div>
    );
}
