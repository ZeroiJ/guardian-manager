import React, { useMemo } from 'react';
import { InventoryItem } from '../InventoryItem';

interface VirtualVaultGridProps {
    items: any[];
    definitions: Record<string, any>;
    className?: string;
    onItemContextMenu?: (e: React.MouseEvent, item: any, definition: any) => void;
}

// Helper to group items by sub-category (e.g. "Auto Rifle")
const SubCategorySection: React.FC<{ title: string, items: any[], definitions: Record<string, any> }> = ({ title, items, definitions }) => {
    if (items.length === 0) return null;

    // 1. Group by specific item type (e.g. "Hand Cannon")
    const byType: Record<string, any[]> = {};
    items.forEach(item => {
        const def = definitions[item.itemHash];
        const typeName = def?.itemTypeDisplayName || 'Update';
        if (!byType[typeName]) byType[typeName] = [];
        byType[typeName].push(item);
    });

    // 2. Sort types alphabetically
    const sortedTypes = Object.keys(byType).sort();

    return (
        <div className="mb-6">
            <div className="text-sm font-bold text-[#e8e9ed] uppercase tracking-widest mb-3 pl-1 border-l-4 border-[#f5dc56]">{title}</div>

            <div className="flex flex-col gap-4">
                {sortedTypes.map(type => (
                    <div key={type} className="px-1">
                        <div className="text-[10px] text-[#888] font-bold uppercase mb-1 tracking-wider">{type}</div>
                        <div className="flex flex-wrap gap-[2px] content-start">
                            {byType[type].map((item) => (
                                <div key={item.itemInstanceId || item.itemHash} className="w-[48px] h-[48px] border border-white/5 bg-[#1a1a1a]">
                                    <InventoryItem
                                        item={item}
                                        definition={definitions[item.itemHash]}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const VirtualVaultGrid: React.FC<VirtualVaultGridProps> = ({ items, definitions, className }) => {

    // Group Items
    const groups = useMemo(() => {
        const weapons: any[] = [];
        const armor: any[] = [];
        const general: any[] = [];

        items.forEach(item => {
            const def = definitions[item.itemHash];
            if (!def) return;

            const categoryHashes = def.itemCategoryHashes || [];

            if (categoryHashes.includes(1)) { // Weapon
                weapons.push(item);
            } else if (categoryHashes.includes(20)) { // Armor
                armor.push(item);
            } else {
                general.push(item);
            }
        });

        return { weapons, armor, general };
    }, [items, definitions]);

    return (
        <div className={`p-2 ${className}`}>
            <SubCategorySection title="Weapons" items={groups.weapons} definitions={definitions} />
            <SubCategorySection title="Armor" items={groups.armor} definitions={definitions} />
            <SubCategorySection title="General" items={groups.general} definitions={definitions} />
        </div>
    );
};
