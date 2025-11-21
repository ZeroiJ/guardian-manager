import React from 'react';
import ItemCard from './ItemCard';

const InventoryGrid = ({ items, definitions, bucketName }) => {
    return (
        <div className="mb-6">
            <h3 className="text-gray-400 text-sm font-uppercase tracking-wider mb-2 border-b border-gray-700 pb-1">
                {bucketName}
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {items.map((item, index) => {
                    const def = definitions[item.itemHash];
                    return (
                        <ItemCard
                            key={`${item.itemHash}-${item.itemInstanceId || index}`}
                            item={item}
                            definition={def}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default InventoryGrid;
