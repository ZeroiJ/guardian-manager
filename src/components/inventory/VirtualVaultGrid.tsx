import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { DraggableInventoryItem } from './DraggableInventoryItem';

interface VirtualVaultGridProps {
    items: any[];
    definitions: Record<string, any>;
    className?: string;
}

export const VirtualVaultGrid: React.FC<VirtualVaultGridProps> = ({ items, definitions, className }) => {
    const parentRef = useRef<HTMLDivElement>(null);
    
    // Constants for 48px tiles + 2px gap
    const ITEM_SIZE = 50; 
    const CONTAINER_WIDTH = 400; // Fixed width from ArsenalPage
    const ITEMS_PER_ROW = Math.floor((CONTAINER_WIDTH - 16) / ITEM_SIZE); // -16 for padding/scroll
    const rowCount = Math.ceil(items.length / ITEMS_PER_ROW);

    const rowVirtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => ITEM_SIZE,
        overscan: 5,
    });

    return (
        <div 
            ref={parentRef} 
            className={`overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent ${className}`}
            style={{ height: '100%', width: '100%' }}
        >
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const startIndex = virtualRow.index * ITEMS_PER_ROW;
                    const rowItems = items.slice(startIndex, startIndex + ITEMS_PER_ROW);

                    return (
                        <div
                            key={virtualRow.index}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                                display: 'flex',
                                gap: '2px',
                                paddingLeft: '8px', // Match ArsenalPage padding
                            }}
                        >
                            {rowItems.map((item) => (
                                <div key={item.itemInstanceId || item.itemHash} className="w-[48px] h-[48px] border border-white/5 bg-[#1a1a1a]">
                                    <DraggableInventoryItem item={item} definition={definitions[item.itemHash]} />
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
