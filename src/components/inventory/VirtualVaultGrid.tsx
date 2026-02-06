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
                    <img src={iconUrl} className="w-8 h-8 invert opacity-30" alt={type} />
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

    // FLATTEN THE LIST: (Separator | Item)[]
    type GridNode = { type: 'separator', label: string, id: string } | { type: 'item', item: any, id: string };
    const flatList: GridNode[] = [];

    sortedTypes.forEach(typeName => {
        // 1. Add Separator
        flatList.push({ type: 'separator', label: typeName, id: `sep-${typeName}` });
        // 2. Add Items
        groups[typeName].forEach(item => {
            flatList.push({ type: 'item', item: item, id: item.itemInstanceId || item.itemHash });
        });
    });

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
                {flatList.map(node => (
                    node.type === 'separator' ? (
                        <SeparatorTile key={node.id} type={node.label} />
                    ) : (
                        <div key={node.id} className="w-[48px] h-[48px] border border-white/5 bg-[#1a1a1a]">
                            <InventoryItem
                                item={node.item}
                                definition={definitions[node.item.itemHash]}
                                onClick={(e) => onItemClick && onItemClick(node.item, definitions[node.item.itemHash], e)}
                            />
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};

export const VirtualVaultGrid: React.FC<VirtualVaultGridProps & { category?: 'Weapons' | 'Armor' | 'General'; bucketHash?: number }> = ({ items, definitions, className, onItemClick, category, bucketHash }) => {

    // Group Items using Engine
    const groupedInventory = useMemo(() => {
        return groupItemsForDisplay(items, definitions);
    }, [items, definitions]);

    // 1. Specific Bucket Mode (Slot-Based)
    if (bucketHash) {
        // Filter items for this specific bucket
        // We can reuse the group logic or just filter raw items?
        // Raw filter is safer as 'groupedInventory' splits by Kinetic/Energy/Power but might not have granular bucket info easily accessible without mapping back.
        // Actually, groupedInventory.Kinetic IS array of items.

        // Let's filter from the raw 'items' list passed in, it's cleaner for strict bucket matching.
        const bucketItems = items.filter(item => definitions[item.itemHash]?.inventory?.bucketTypeHash === bucketHash);

        // We still need to group them by Type (Auto Rifle, etc) for the VaultBucket renderer to work (it expects groups).
        // Sort Engine `groupItemsForDisplay` returns huge object.
        // Let's make a mini-grouper or reuse logic?
        // We can just call `groupItemsForDisplay` on the filtered subset!

        // Wait, `groupItemsForDisplay` returns { Kinetic: [], Energy: [], ... }
        // If we pass ONLY Kinetic items, it will return { Kinetic: [...], Energy: [], ... }
        // So we can just grab the values.

        const subGroups = groupItemsForDisplay(bucketItems, definitions);
        // Merge all categories (likely only one will be populated, e.g. Kinetic)
        // But what if we ask for "Consumables"? They might end up in 'General'.

        // General Merging Strategy:
        const merged: Record<string, any[]> = {};
        const deepMerge = (target: Record<string, any[]>, source: Record<string, any[]>) => {
            Object.keys(source).forEach(key => {
                if (target[key]) {
                    target[key] = [...target[key], ...source[key]];
                } else {
                    target[key] = source[key];
                }
            });
        };
        deepMerge(merged, subGroups.Kinetic);
        deepMerge(merged, subGroups.Energy);
        deepMerge(merged, subGroups.Power);
        deepMerge(merged, subGroups.Armor);
        deepMerge(merged, subGroups.General);

        return (
            <div className={`p-1 ${className} h-full`}>
                <VaultBucket title="" groups={merged} definitions={definitions} onItemClick={onItemClick} />
            </div>
        );
    }

    // Render Logic: If category provided, render ONLY that category (Merged if needed)
    if (category === 'Weapons') {
        // Merge Kinetic, Energy, Power
        const deepMerge = (target: Record<string, any[]>, source: Record<string, any[]>) => {
            Object.keys(source).forEach(key => {
                if (target[key]) {
                    target[key] = [...target[key], ...source[key]];
                } else {
                    target[key] = source[key];
                }
            });
            return target;
        };

        const merged: Record<string, any[]> = {};
        deepMerge(merged, groupedInventory.Kinetic);
        deepMerge(merged, groupedInventory.Energy);
        deepMerge(merged, groupedInventory.Power);

        return (
            <div className={`p-1 ${className} h-full`}>
                <VaultBucket title="" groups={merged} definitions={definitions} onItemClick={onItemClick} />
            </div>
        );
    }

    if (category === 'Armor') {
        return (
            <div className={`p-1 ${className} h-full`}>
                <VaultBucket title="" groups={groupedInventory.Armor} definitions={definitions} onItemClick={onItemClick} />
            </div>
        );
    }

    if (category === 'General') {
        return (
            <div className={`p-1 ${className || ''} h-full`}>
                <VaultBucket title="" groups={groupedInventory.General} definitions={definitions} onItemClick={onItemClick} />
            </div>
        );
    }

    // Default: Render All (Fallback for other views if any)
    return (
        <div className={`p-4 ${className} pb-32`}>
            <VaultBucket title="Kinetic Weapons" groups={groupedInventory.Kinetic} definitions={definitions} onItemClick={onItemClick} />
            <VaultBucket title="Energy Weapons" groups={groupedInventory.Energy} definitions={definitions} onItemClick={onItemClick} />
            <VaultBucket title="Power Weapons" groups={groupedInventory.Power} definitions={definitions} onItemClick={onItemClick} />
            <VaultBucket title="Armor" groups={groupedInventory.Armor} definitions={definitions} onItemClick={onItemClick} />
            <VaultBucket title="General" groups={groupedInventory.General} definitions={definitions} onItemClick={onItemClick} />
        </div>
    );
};

