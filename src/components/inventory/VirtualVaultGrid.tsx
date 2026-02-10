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
            className="w-16 h-16 flex items-center justify-center bg-dim-surface rounded-sm border border-dim-border"
            title={type}
        >
            {iconUrl ? (
                <img src={iconUrl} className="w-8 h-8 invert opacity-50" alt={type} />
            ) : ArmorIcon ? (
                <ArmorIcon className="w-6 h-6 text-white/50" />
            ) : (
                <span className="text-[8px] text-white/40 font-bold uppercase text-center leading-none px-1">{type}</span>
            )}
        </div>
    );
};

const ItemTile: React.FC<{
    item: any;
    definition: any;
    onClick?: (item: any, definition: any, e: React.MouseEvent) => void;
}> = ({ item, definition, onClick }) => {

    return (
        <div className="w-16 h-16">
            <InventoryItem
                item={item}
                definition={definition}
                onClick={(e) => onClick && onClick(item, definition, e)}
            />
        </div>
    );
};

// ============================================================================
// VAULT GROUP - Uses "display: contents" to be invisible to flex layout
// This is the DIM Pattern #4!
// ============================================================================
const VaultGroup: React.FC<{
    typeName: string;
    items: any[];
    definitions: Record<string, any>;
    onItemClick?: (item: any, definition: any, e: React.MouseEvent) => void;
    prefix: string;
}> = ({ typeName, items, definitions, onItemClick, prefix }) => {
    // Sort items by power descending
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => calculatePower(b, definitions) - calculatePower(a, definitions));
    }, [items, definitions]);

    return (
        // 🔥 THE MAGIC: display:contents makes this wrapper "invisible"
        // Children flow directly into the parent flex container
        <div style={{ display: 'contents' }}>
            {/* Separator Icon */}
            <SeparatorTile type={typeName} />

            {/* Items */}
            {sortedItems.map(item => (
                <ItemTile
                    key={`${prefix}${item.itemInstanceId || item.itemHash}`}
                    item={item}
                    definition={definitions[item.itemHash]}
                    onClick={onItemClick}
                />
            ))}
        </div>
    );
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

        const sortedTypes = getSortedTypes(groups);

        return (
            <div className={`p-1 ${className} h-full`}>
                {/* Single flex container - groups use display:contents */}
                <div className="flex flex-wrap gap-2 content-start">
                    {sortedTypes.map(typeName => (
                        <VaultGroup
                            key={`bucket-${typeName}`}
                            typeName={typeName}
                            items={groups[typeName]}
                            definitions={definitions}
                            onItemClick={onItemClick}
                            prefix="bucket-"
                        />
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

        const sortedTypes = getSortedTypes(merged);

        return (
            <div className={`p-1 ${className} h-full`}>
                <div className="flex flex-wrap gap-2 content-start">
                    {sortedTypes.map(typeName => (
                        <VaultGroup
                            key={`weapons-${typeName}`}
                            typeName={typeName}
                            items={merged[typeName]}
                            definitions={definitions}
                            onItemClick={onItemClick}
                            prefix="weapons-"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (category === 'Armor') {
        const sortedTypes = getSortedTypes(groupedInventory.Armor);

        return (
            <div className={`p-1 ${className} h-full`}>
                <div className="flex flex-wrap gap-2 content-start">
                    {sortedTypes.map(typeName => (
                        <VaultGroup
                            key={`armor-${typeName}`}
                            typeName={typeName}
                            items={groupedInventory.Armor[typeName]}
                            definitions={definitions}
                            onItemClick={onItemClick}
                            prefix="armor-"
                        />
                    ))}
                </div>
            </div>
        );
    }

    if (category === 'General') {
        const sortedTypes = getSortedTypes(groupedInventory.General);

        return (
            <div className={`p-1 ${className || ''} h-full`}>
                <div className="flex flex-wrap gap-2 content-start">
                    {sortedTypes.map(typeName => (
                        <VaultGroup
                            key={`general-${typeName}`}
                            typeName={typeName}
                            items={groupedInventory.General[typeName]}
                            definitions={definitions}
                            onItemClick={onItemClick}
                            prefix="general-"
                        />
                    ))}
                </div>
            </div>
        );
    }

    // ========================================================================
    // DEFAULT: FULL VAULT VIEW - Continuous Snake via display:contents
    // ========================================================================
    const mergedWeapons: Record<string, any[]> = {};
    deepMerge(mergedWeapons, groupedInventory.Kinetic);
    deepMerge(mergedWeapons, groupedInventory.Energy);
    deepMerge(mergedWeapons, groupedInventory.Power);

    const weaponTypes = getSortedTypes(mergedWeapons);
    const armorTypes = getSortedTypes(groupedInventory.Armor);
    const generalTypes = getSortedTypes(groupedInventory.General);

    return (
        <div className={`p-2 ${className} pb-32`}>
            {/* SINGLE Continuous Grid - Groups use display:contents for snake flow */}
            <div className="flex flex-wrap gap-2 content-start">
                {/* Weapons */}
                {weaponTypes.map(typeName => (
                    <VaultGroup
                        key={`w-${typeName}`}
                        typeName={typeName}
                        items={mergedWeapons[typeName]}
                        definitions={definitions}
                        onItemClick={onItemClick}
                        prefix="w-"
                    />
                ))}

                {/* Armor */}
                {armorTypes.map(typeName => (
                    <VaultGroup
                        key={`a-${typeName}`}
                        typeName={typeName}
                        items={groupedInventory.Armor[typeName]}
                        definitions={definitions}
                        onItemClick={onItemClick}
                        prefix="a-"
                    />
                ))}

                {/* General */}
                {generalTypes.map(typeName => (
                    <VaultGroup
                        key={`g-${typeName}`}
                        typeName={typeName}
                        items={groupedInventory.General[typeName]}
                        definitions={definitions}
                        onItemClick={onItemClick}
                        prefix="g-"
                    />
                ))}
            </div>
        </div>
    );
};


