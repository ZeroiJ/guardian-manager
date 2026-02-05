import React, { useMemo } from 'react';
import { InventoryItem } from '../InventoryItem';
import { groupItemsForDisplay, getSortedTypes, WEAPON_TYPE_ICONS } from '../../lib/destiny/sort-engine';

interface VirtualVaultGridProps {
    items: any[];
    definitions: Record<string, any>;
    className?: string;
    onItemContextMenu?: (e: React.MouseEvent, item: any, definition: any) => void;
    onItemClick?: (item: any, definition: any, event: React.MouseEvent) => void;
}

// Visual Divider between types (e.g. "Auto Rifle")
const TypeGroup: React.FC<{ type: string, items: any[], definitions: Record<string, any>, onItemClick?: (item: any, def: any, event: React.MouseEvent) => void }> = ({ type, items, definitions, onItemClick }) => {
    // Get Icon
    // Ideally we fetch from Category Definitions, but for now use the static map or fallback
    const iconUrl = WEAPON_TYPE_ICONS[type];

    return (
        <div className="mb-4">
            {/* Type Header */}
            <div className="flex items-center gap-2 mb-1 pl-1 opacity-70">
                {iconUrl && (
                    <img src={iconUrl} className="w-5 h-5 invert opacity-80" alt="" />
                )}
                <span className="text-xs font-bold uppercase tracking-widest text-[#e8e9ed]">{type}</span>
                <div className="h-px bg-white/10 flex-grow ml-2" />
            </div>

            {/* Grid */}
            <div className="flex flex-wrap gap-[2px] content-start">
                {items.map((item) => (
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
};

// Main Bucket Section (e.g. "Kinetic Weapons")
const VaultBucket: React.FC<{ title: string, groups: Record<string, any[]>, definitions: Record<string, any>, onItemClick?: (item: any, def: any, event: React.MouseEvent) => void }> = ({ title, groups, definitions, onItemClick }) => {
    const sortedTypes = getSortedTypes(groups);
    if (sortedTypes.length === 0) return null;

    return (
        <div className="mb-8">
            {/* Bucket Header */}
            <div className="text-lg font-bold text-[#e2bf36] uppercase tracking-wider mb-4 border-b border-[#e2bf36]/30 pb-1 w-full">
                {title}
            </div>

            <div className="pl-2">
                {sortedTypes.map(type => (
                    <TypeGroup
                        key={type}
                        type={type}
                        items={groups[type]}
                        definitions={definitions}
                        onItemClick={onItemClick}
                    />
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

