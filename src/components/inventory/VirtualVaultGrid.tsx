import React from 'react';
import { InventoryItem } from '../InventoryItem';

interface VirtualVaultGridProps {
    items: any[];
    definitions: Record<string, any>;
    className?: string;
    onItemContextMenu?: (e: React.MouseEvent, item: any, definition: any) => void;
}

export const VirtualVaultGrid: React.FC<VirtualVaultGridProps> = ({ items, definitions, className }) => {
    return (
        <div
            className={`overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent ${className}`}
            style={{ height: '100%', width: '100%' }}
        >
            <div className="flex flex-wrap gap-[2px] content-start p-2">
                {items.map((item) => (
                    <div key={item.itemInstanceId || item.itemHash} className="w-[48px] h-[48px] border border-white/5 bg-[#1a1a1a]">
                        <InventoryItem
                            item={item}
                            definition={definitions[item.itemHash]}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};
