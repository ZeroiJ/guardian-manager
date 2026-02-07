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

// Helper for sorting
const calculatePower = (item: any, definitions: any) => {
    return (item.primaryStat?.value) || (definitions[item.itemHash]?.investmentStats?.find((s: any) => s.statTypeHash === 1935470627)?.value) || 0;
};


// Visual Divider Tile (Icon only) - DIM Style "Inline Separator"
const SeparatorTile: React.FC<{ type: string }> = ({ type }) => {
    const iconUrl = WEAPON_TYPE_ICONS[type];

    return (
        <div className="w-[48px] h-[48px] flex items-center justify-center select-none p-[2px]" title={type}>
            {/* Inline Separator: bg-white/5 to match DIM's phantom look, no border, centered icon */}
            <div className="w-full h-full flex items-center justify-center bg-white/5 rounded-sm">
                {iconUrl ? (
                    <img src={iconUrl} className="w-8 h-8 invert opacity-30" alt={type} />
                ) : (
                    <span className="text-[8px] text-white/10 font-bold uppercase text-center leading-none">{type}</span>
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
        const bucketItems = items.filter(item => definitions[item.itemHash]?.inventory?.bucketTypeHash === bucketHash);

        // Group by Item Type Display Name (e.g., "Auto Rifle", "Helmet")
        const groups: Record<string, any[]> = {};

        bucketItems.forEach(item => {
            const def = definitions[item.itemHash];
            const typeName = def?.itemTypeDisplayName || 'Unknown';

            if (!groups[typeName]) {
                groups[typeName] = [];
            }
            groups[typeName].push(item);
        });

        // Sort Types Alphabetically
        const sortedTypes = Object.keys(groups).sort((a, b) => a.localeCompare(b));

        return (
            <div className={`p-1 ${className} h-full flex flex-col gap-2`}>
                {sortedTypes.map(type => {
                    // Sort items within group by power (descending)
                    const groupItems = groups[type].sort((a, b) => {
                        const powerA = calculatePower(a, definitions);
                        const powerB = calculatePower(b, definitions);
                        return powerB - powerA;
                    });

                    return (
                        <div key={type} className="flex flex-col">
                            {/* Optional: Type Header? DIM uses icons or just spacing. 
                                For now, spacing is the key differentiator requested. 
                                We can add a tiny label if needed, but let's stick to just the grid first. 
                            */}
                            {/* <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{type}</div> */}

                            <div className="flex flex-wrap gap-[2px] content-start">
                                {groupItems.map(item => (
                                    <div key={item.itemInstanceId || item.itemHash} className="w-[48px] h-[48px] border border-white/5 bg-[#1a1a1a]">
                                        <InventoryItem
                                            item={item}
                                            definition={definitions[item.itemHash]}
                                            onClick={(e) => onItemClick && onItemClick(item, definitions[item.itemHash], e)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
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

