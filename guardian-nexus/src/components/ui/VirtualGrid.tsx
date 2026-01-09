import React, { useRef, useState, useEffect, useMemo } from 'react';

interface VirtualGridProps<T> {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    itemHeight: number;
    itemWidth: number;
    className?: string;
    gap?: number;
    containerHeight?: number | string; // If explicit height needed
}

export function VirtualGrid<T>({ 
    items, 
    renderItem, 
    itemHeight, 
    itemWidth, 
    className = '', 
    gap = 2,
    containerHeight 
}: VirtualGridProps<T>) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(600); // Default estimate
    const [containerWidth, setContainerWidth] = useState(400); // Default estimate

    // Measure viewport on mount/resize
    useEffect(() => {
        if (!containerRef.current) return;
        
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setViewportHeight(entry.contentRect.height);
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        
        // Initial measure
        setViewportHeight(containerRef.current.clientHeight);
        setContainerWidth(containerRef.current.clientWidth);

        return () => resizeObserver.disconnect();
    }, []);

    // Handle Scroll
    const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
        setScrollTop(e.currentTarget.scrollTop);
    };

    // Calculations
    const effectiveItemWidth = itemWidth + gap;
    const effectiveItemHeight = itemHeight + gap;
    
    // Items per row
    const itemsPerRow = Math.max(1, Math.floor((containerWidth + gap) / effectiveItemWidth));
    
    // Total rows needed
    const totalRows = Math.ceil(items.length / itemsPerRow);
    const totalHeight = totalRows * effectiveItemHeight - gap;

    // Range to render
    const startRow = Math.max(0, Math.floor(scrollTop / effectiveItemHeight) - 2); // Overscan 2 rows
    const endRow = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / effectiveItemHeight) + 2);

    const visibleItems = useMemo(() => {
        const rendered = [];
        const startIndex = startRow * itemsPerRow;
        const endIndex = Math.min(items.length, endRow * itemsPerRow);

        for (let i = startIndex; i < endIndex; i++) {
            rendered.push({
                item: items[i],
                index: i,
                row: Math.floor(i / itemsPerRow),
                col: i % itemsPerRow
            });
        }
        return rendered;
    }, [items, startRow, endRow, itemsPerRow]);

    return (
        <div 
            ref={containerRef} 
            className={`overflow-y-auto ${className} scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent`}
            style={{ height: containerHeight || '100%' }}
            onScroll={onScroll}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                {visibleItems.map(({ item, index, row, col }) => (
                    <div
                        key={index}
                        style={{
                            position: 'absolute',
                            top: row * effectiveItemHeight,
                            left: col * effectiveItemWidth,
                            width: itemWidth,
                            height: itemHeight
                        }}
                    >
                        {renderItem(item)}
                    </div>
                ))}
            </div>
        </div>
    );
}
