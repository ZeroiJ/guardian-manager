import React, { useMemo } from 'react';
import { InventoryItem } from './InventoryItem';
import { groupItemsForDisplay, getSortedTypes, WEAPON_TYPE_ICONS } from '../../lib/destiny/sort-engine';

import { Shield, Shirt, Footprints, Component, Ghost, User } from 'lucide-react';

interface VirtualVaultGridProps {
    items: any[];
    definitions: Record<string, any>;
    className?: string;
    onItemContextMenu?: (e: React.MouseEvent, item: any, definition: any) => void;
    onItemClick?: (item: any, definition: any, event: React.MouseEvent) => void;
}

const ARMOR_ICONS: Record<string, React.FC<any>> = {
    'Helmet': Shield,
    'Gauntlets': Component,
    'Chest Armor': Shirt,
    'Leg Armor': Footprints,
    'Class Item': User,
    'Ghost': Ghost,
};

// Helper for sorting by power
const calculatePower = (item: any, definitions: any) => {
    return (item.primaryStat?.value) || (definitions[item.itemHash]?.investmentStats?.find((s: any) => s.statTypeHash === 1935470627)?.value) || 0;
};

// ============================================================================
// SEPARATOR TILE - 48x48 Inline Icon (Same size as items)
// ============================================================================
const SeparatorTile: React.FC<{ type: string }> = ({ type }) => {
    const iconUrl = WEAPON_TYPE_ICONS[type];
    const ArmorIcon = ARMOR_ICONS[type];

    return (
        <div
            className="w-[48px] h-[48px] flex items-center justify-center bg-white/5 rounded-sm"
            title={type}
        >
            {iconUrl ? (
                <img src={iconUrl} className="w-8 h-8 invert opacity-30" alt={type} />
            ) : ArmorIcon ? (
                <ArmorIcon className="w-6 h-6 text-white/30" />
            ) : (
                <span className="text-[8px] text-white/20 font-bold uppercase text-center leading-none px-1">{type}</span>
            )}
        </div>
    );
};

// ============================================================================
// GRID NODE TYPE - Union of Separator and Item
// ============================================================================
type GridNode =
    | { type: 'separator'; label: string; id: string }
    | { type: 'item'; item: any; id: string };

// ============================================================================
// FLATTEN GROUPS - Create a single mixed array with injected separators
// ============================================================================
const flattenGroupsWithSeparators = (
    groups: Record<string, any[]>,
    definitions: Record<string, any>,
    prefix: string = ''
): GridNode[] => {
    const sortedTypes = getSortedTypes(groups);
    const flatList: GridNode[] = [];

    sortedTypes.forEach(typeName => {
        // Sort items within type by power (descending)
        const sortedItems = [...groups[typeName]].sort((a, b) => {
            return calculatePower(b, definitions) - calculatePower(a, definitions);
        });

        // Inject Separator Tile
        flatList.push({ type: 'separator', label: typeName, id: `${prefix}sep-${typeName}` });

        // Then push all items of this type
        sortedItems.forEach(item => {
            flatList.push({
                type: 'item',
                item: item,
                id: `${prefix}${item.itemInstanceId || item.itemHash}`
            });
        });
    });

    return flatList;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const VirtualVaultGrid: React.FC<VirtualVaultGridProps & { category?: 'Weapons' | 'Armor' | 'General'; bucketHash?: number }> = ({
    items,
    definitions,
    className,
    onItemClick,
    category,
    bucketHash
}) => {

    // Group Items using Engine
    const groupedInventory = useMemo(() => {
        return groupItemsForDisplay(items, definitions);
    }, [items, definitions]);

    // ========================================================================
    // SPECIFIC BUCKET MODE (Slot-Based View)
    // ========================================================================
    if (bucketHash) {
        const bucketItems = items.filter(item =>
            definitions[item.itemHash]?.inventory?.bucketTypeHash === bucketHash
        );

        // Group by Item Type Display Name
        const groups: Record<string, any[]> = {};
        bucketItems.forEach(item => {
            const def = definitions[item.itemHash];
            const typeName = def?.itemTypeDisplayName || 'Unknown';
            if (!groups[typeName]) groups[typeName] = [];
            groups[typeName].push(item);
        });

        const flatList = flattenGroupsWithSeparators(groups, definitions, 'bucket-');

        return (
            <div className={`p-1 ${className} h-full`}>
                <div className="flex flex-wrap gap-1 content-start">
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
    }

    // ========================================================================
    // CATEGORY MODE (Weapons / Armor / General)
    // ========================================================================
    const deepMerge = (target: Record<string, any[]>, source: Record<string, any[]>) => {
        Object.keys(source).forEach(key => {
            if (target[key]) target[key] = [...target[key], ...source[key]];
            else target[key] = source[key];
        });
        return target;
    };

    if (category === 'Weapons') {
        const merged: Record<string, any[]> = {};
        deepMerge(merged, groupedInventory.Kinetic);
        deepMerge(merged, groupedInventory.Energy);
        deepMerge(merged, groupedInventory.Power);

        const flatList = flattenGroupsWithSeparators(merged, definitions, 'weapons-');

        return (
            <div className={`p-1 ${className} h-full`}>
                <div className="flex flex-wrap gap-1 content-start">
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
    }

    if (category === 'Armor') {
        const flatList = flattenGroupsWithSeparators(groupedInventory.Armor, definitions, 'armor-');

        return (
            <div className={`p-1 ${className} h-full`}>
                <div className="flex flex-wrap gap-1 content-start">
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
    }

    if (category === 'General') {
        const flatList = flattenGroupsWithSeparators(groupedInventory.General, definitions, 'general-');

        return (
            <div className={`p-1 ${className || ''} h-full`}>
                <div className="flex flex-wrap gap-1 content-start">
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
    }

    // ========================================================================
    // DEFAULT: FULL VAULT VIEW - One Continuous Snake Flow
    // ========================================================================
    // Merge all weapons into unified groups
    const mergedWeapons: Record<string, any[]> = {};
    deepMerge(mergedWeapons, groupedInventory.Kinetic);
    deepMerge(mergedWeapons, groupedInventory.Energy);
    deepMerge(mergedWeapons, groupedInventory.Power);

    // Create ONE continuous flat list: Weapons → Armor → General
    const fullFlatList: GridNode[] = [
        ...flattenGroupsWithSeparators(mergedWeapons, definitions, 'w-'),
        ...flattenGroupsWithSeparators(groupedInventory.Armor, definitions, 'a-'),
        ...flattenGroupsWithSeparators(groupedInventory.General, definitions, 'g-'),
    ];

    return (
        <div className={`p-2 ${className} pb-32`}>
            {/* SINGLE Continuous Grid - The "Snake Flow" */}
            <div className="flex flex-wrap gap-1 content-start">
                {fullFlatList.map(node => (
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

