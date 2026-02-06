import React from 'react';

export const InventoryBucketLabel: React.FC<{ label: string }> = ({ label }) => {
    return (
        <div className="sticky left-0 mt-2 mb-1 pl-2 border-l-4 border-[#f5dc56] z-10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-[#f5dc56] opacity-90 drop-shadow-md">
                {label}
            </h3>
        </div>
    );
};
