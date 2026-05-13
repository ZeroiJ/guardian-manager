import React, { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
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

const calculatePower = (item: any, definitions: any) => {
    return (item.primaryStat?.value) || (definitions[item.itemHash]?.investmentStats?.find((s: any) => s.statTypeHash === 1935470627)?.value) || 0;
};

const SeparatorTile: React.FC<{ type: string }> = ({ type }) => {
    const iconUrl = WEAPON_TYPE_ICONS[type];
    const ArmorIcon = ARMOR_ICONS[type];

    return (
        <div
            className="flex items-center justify-center bg-dim-surface rounded-sm border border-dim-border"
            title={type}
            style={{
                width: 'var(--item-size)',
                height: 'var(--item-size)',
            }}
        >
            {iconUrl ? (
                <img 
                    src={iconUrl} 
                    className="invert opacity-50" 
                    alt={type}
                    style={{
                        width: 'calc(var(--item-size) * 0.5)',
                        height: 'calc(var(--item-size) * 0.5)',
                    }}
                />
            ) : ArmorIcon ? (
                <ArmorIcon 
                    className="text-white/50"
                    style={{
                        width: 'calc(var(--item-size) * 0.375)',
                        height: 'calc(var(--item-size) * 0.375)',
                    }}
                />
            ) : (
                <span 
                    className="text-white/40 font-bold uppercase text-center leading-none px-1"
                    style={{ fontSize: 'calc(var(--item-size) / 8)' }}
                >
                    {type}
                </span>
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
        <div style={{ width: 'var(--item-size)', height: 'var(--item-size)' }}>
            <InventoryItem
                item={item}
                definition={definition}
                onClick={(e) => onClick && onClick(item, definition, e)}
            />
        </div>
    );
};

const VaultGroup: React.FC<{
    typeName: string;
    items: any[];
    definitions: Record<string, any>;
    onItemClick?: (item: any, definition: any, e: React.MouseEvent) => void;
    prefix: string;
}> = ({ typeName, items, definitions, onItemClick, prefix }) => {
    const sortedItems = useMemo(() => {
        return [...items].sort((a, b) => calculatePower(b, definitions) - calculatePower(a, definitions));
    }, [items, definitions]);

    return (
        <div style={{ display: 'contents' }}>
            <SeparatorTile type={typeName} />
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

export const VirtualVaultGrid: React.FC<VirtualVaultGridProps & { category?: 'Weapons' | 'Armor' | 'General'; bucketHash?: number }> = ({
    items,
    definitions,
    className,
    onItemClick,
    category,
    bucketHash
}) => {
    const groupedInventory = useMemo(() => groupItemsForDisplay(items, definitions), [items, definitions]);

    // Droppable for vault (bucket specific)
    const { setNodeRef, isOver } = useDroppable({
        id: bucketHash ? `vault-${bucketHash}` : 'vault-general',
        data: { storeId: 'vault', bucketHash }
    });

    if (bucketHash) {
        const bucketItems = items.filter(item => definitions[item.itemHash]?.inventory?.bucketTypeHash === bucketHash);
        const groups: Record<string, any[]> = {};
        bucketItems.forEach(item => {
            const def = definitions[item.itemHash];
            const typeName = def?.itemTypeDisplayName || 'Unknown';
            if (!groups[typeName]) groups[typeName] = [];
            groups[typeName].push(item);
        });

        const sortedTypes = getSortedTypes(groups);

        return (
            <div 
                ref={setNodeRef}
                className={`p-1 ${className || ''} h-full min-h-[68px] rounded transition-colors ${isOver ? 'bg-white/10 ring-1 ring-white/30' : ''}`}
            >
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

    // Keep the other modes unchanged (Weapons / Armor / General / Full)
    // ... just returning the wrapper for completeness ...
    
    // (Rest of component is not strictly droppable in this simple implementation, or can map to `vault-general`)
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
            <div className={`p-1 ${className || ''} h-full`}>
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
            <div className={`p-1 ${className || ''} h-full`}>
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

    const mergedWeapons: Record<string, any[]> = {};
    deepMerge(mergedWeapons, groupedInventory.Kinetic);
    deepMerge(mergedWeapons, groupedInventory.Energy);
    deepMerge(mergedWeapons, groupedInventory.Power);

    const weaponTypes = getSortedTypes(mergedWeapons);
    const armorTypes = getSortedTypes(groupedInventory.Armor);
    const generalTypes = getSortedTypes(groupedInventory.General);

    return (
        <div className={`p-2 ${className || ''} pb-32`}>
            <div className="flex flex-wrap gap-2 content-start">
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
