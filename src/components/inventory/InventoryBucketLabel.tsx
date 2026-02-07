import React from 'react';

export const InventoryBucketLabel: React.FC<{ label: string }> = ({ label }) => {
    return (
        <div className="sticky left-0 mt-4 mb-2 pl-2 border-l-2 border-dim-border-light z-10">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-dim-header">
                {label}
            </h3>
        </div>
    );
};

