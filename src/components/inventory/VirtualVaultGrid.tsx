import React, { useMemo } from 'react';
import { InventoryItem } from './InventoryItem';
import { groupItemsForDisplay, getSortedTypes, WEAPON_TYPE_ICONS } from '../../lib/destiny/sort-engine';

interface VirtualVaultGridProps {
    items: any[];
    definitions: Record<string, any>;
    className?: string;
    onItemContextMenu?: (e: React.MouseEvent, item: any, definition: any) => void;
    onItemClick?: (item: any, definition: any, event: React.MouseEvent) => void;
}

// Visual Divider Tile (Icon only) - DIM Style "Phantom Item"
const SeparatorTile: React.FC<{ type: string }> = ({ type }) => {
    const iconUrl = WEAPON_TYPE_ICONS[type];

    return (
        <div className="w-[48px] h-[48px] flex items-center justify-center select-none p-[2px]" title={type}>
            {/* Inner box matches item feel but 'empty' - Phantom Style: bg-white/5, NO BORDER */}
            <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-sm">
                {iconUrl ? (
                    <img src={iconUrl} className="w-8 h-8 invert opacity-20" alt={type} />
                ) : (
                    <span className="text-[8px] text-white/10 font-bold uppercase">{type.slice(0, 3)}</span>
                )}
            </div>
        </div>
    );
};

// Main Bucket Section (e.g. "Kinetic Weapons")
const VaultBucket: React.FC<{ title: string, groups: Record<string, any[]>, definitions: Record<string, any>, onItemClick?: (item: any, def: any, event: React.MouseEvent) => void }> = ({ title, groups, definitions, onItemClick }) => {
    const sortedTypes = getSortedTypes(groups);
    if (sortedTypes.length === 0) return null;

    return (
        <div className="mb-4">
            {/* Bucket Header - Minimalist */}
            <div className="text-[10px] font-bold text-[#e2bf36] uppercase tracking-wider mb-1 border-b border-[#e2bf36]/10 pb-1 w-full flex items-center gap-2 opacity-60">
                <span>{title}</span>
                <span className="text-[9px] text-gray-500 font-normal normal-case opacity-50">
                    ({Object.values(groups).reduce((acc, curr) => acc + curr.length, 0)})
                </span>
            </div>

            {/* Continuous Grid - DIM Density (gap-1 = 4px) */}
            <div className="flex flex-wrap gap-1 content-start pl-0">
                {sortedTypes.map(type => (
                    <React.Fragment key={type}>
                        {/* Separator Tile */}
                        <SeparatorTile type={type} />

                        {/* Items for this Type */}
                        {groups[type].map(item => (
                            <div key={item.itemInstanceId || item.itemHash} className="w-[48px] h-[48px] border border-white/5 bg-[#1a1a1a]">
                                <InventoryItem
                                    item={item}
                                    definition={definitions[item.itemHash]}
                                    onClick={(e) => onItemClick && onItemClick(item, definitions[item.itemHash], e)}
                                />
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export const VirtualVaultGrid: React.FC<VirtualVaultGridProps> = ({ items, definitions, className, onItemClick }) => {

    // Group Items using Engine
    const groupedInventory = useMemo(() => {
        return groupItemsForDisplay(items, definitions);
    }, [items, definitions]);

    return (
        <div className={`p-4 ${className} pb-32`}>
            {/* 1. Kinetic Weapons */}
            <VaultBucket title="Kinetic Weapons" groups={groupedInventory.Kinetic} definitions={definitions} onItemClick={onItemClick} />

            {/* 2. Energy Weapons */}
            <VaultBucket title="Energy Weapons" groups={groupedInventory.Energy} definitions={definitions} onItemClick={onItemClick} />

            {/* 3. Power Weapons */}
            <VaultBucket title="Power Weapons" groups={groupedInventory.Power} definitions={definitions} onItemClick={onItemClick} />

            {/* 4. Armor */}
            <VaultBucket title="Armor" groups={groupedInventory.Armor} definitions={definitions} onItemClick={onItemClick} />

            {/* 5. General / Consumables */}
            <VaultBucket title="General" groups={groupedInventory.General} definitions={definitions} onItemClick={onItemClick} />
        </div>
    );
};

