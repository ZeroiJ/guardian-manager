import React from 'react';

interface InventoryFloorProps {
    label: string;
    children: React.ReactNode;
}

export const InventoryFloor: React.FC<InventoryFloorProps> = ({ label, children }) => {
    return (
        <div className="flex flex-col">
            {/* Floor Label - Sticky Header Style */}
            <div className="sticky left-0 mb-2 pl-2 border-l-4 border-[#f5dc56]">
                <h3 className="text-xl font-bold uppercase tracking-widest text-[#f5dc56] opacity-90 drop-shadow-md">
                    {label}
                </h3>
            </div>

            {/* The Floor Grid - Align Stretch ensures unified height */}
            <div className="flex gap-2 align-stretch min-h-[100px] overflow-visible">
                {children}
            </div>
        </div>
    );
};
