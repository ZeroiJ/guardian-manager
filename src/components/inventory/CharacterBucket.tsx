import React from 'react';
import { InventoryItem } from './InventoryItem';
import { BUCKETS } from '../../data/constants';

interface BucketRowProps {
    label: string;
    bucketHash: number;
    equipment: any[];
    inventory: any[];
    definitions: Record<string, any>;
    onItemClick?: (item: any, definition: any, event: React.MouseEvent) => void;
}

const BucketRow: React.FC<BucketRowProps> = ({ label, bucketHash, equipment, inventory, definitions, onItemClick }) => {
    // 1. Strict Filter Logic
    const equippedItem = equipment.find(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);
    const bucketItems = inventory.filter(i => definitions[i.itemHash]?.inventory?.bucketTypeHash === bucketHash);

    // 2. The Loop (9 Slots for Backpack)
    const inventorySlots = [...Array(9)].map((_, idx) => bucketItems[idx] || null);

    return (
        <div className="flex items-start mb-[2px] min-h-[50px]">
            {/* 3. Equipped Item (Left Column) */}
            <div className="flex-shrink-0 mr-[4px]">
                <div className="w-[48px] h-[48px] bg-[#292929] border border-white/10 relative group shadow-lg">
                    {/* Label overlay when empty */}
                    {!equippedItem && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-30 text-[9px] uppercase tracking-widest font-bold text-gray-500">
                            {label}
                        </div>
                    )}

                    {equippedItem && (
                        <InventoryItem
                            item={equippedItem}
                            definition={definitions[equippedItem.itemHash]}
                            onClick={(e) => onItemClick && onItemClick(equippedItem, definitions[equippedItem.itemHash], e)}
                        />
                    )}
                </div>
            </div>

            {/* 4. Inventory Grid (Right Column - 3x3) */}
            <div className="flex-1 flex flex-wrap gap-[2px] content-start w-[148px]">
                {inventorySlots.map((item, idx) => (
                    <div
                        key={idx}
                        className="w-[48px] h-[48px] bg-[#141414] border border-white/5 box-border relative"
                    >
                        {item && (
                            <InventoryItem
                                item={item}
                                definition={definitions[item.itemHash]}
                                onClick={(e) => onItemClick && onItemClick(item, definitions[item.itemHash], e)}
                            />
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

interface CharacterBucketProps {
    category: 'Weapons' | 'Armor' | 'General';
    equipment: any[];
    inventory: any[];
    definitions: Record<string, any>;
    onItemClick?: (item: any, definition: any, event: React.MouseEvent) => void;
}

export const CharacterBucket: React.FC<CharacterBucketProps> = ({ category, equipment, inventory, definitions, onItemClick }) => {

    // Config: Define rows based on Category
    let rows: { label: string, hash: number }[] = [];

    if (category === 'Weapons') {
        rows = [
            { label: 'Kinetic', hash: BUCKETS.Kinetic },
            { label: 'Energy', hash: BUCKETS.Energy },
            { label: 'Power', hash: BUCKETS.Power },
        ];
    } else if (category === 'Armor') {
        rows = [
            { label: 'Helmet', hash: BUCKETS.Helmet },
            { label: 'Arms', hash: BUCKETS.Gauntlets },
            { label: 'Chest', hash: BUCKETS.Chest },
            { label: 'Legs', hash: BUCKETS.Legs },
            { label: 'Class', hash: BUCKETS.Class },
        ];
    } else if (category === 'General') {
        rows = [
            { label: 'Ghost', hash: BUCKETS.Ghost },
            // Add more if needed later (Sparrows, Ships etc need specific queries)
        ];
    }

    return (
        <div className="flex-shrink-0 w-[240px] bg-[#11111b] border-r border-[#333] flex flex-col p-1 gap-[2px]">
            {rows.map(row => (
                <BucketRow
                    key={row.label}
                    label={row.label}
                    bucketHash={row.hash}
                    equipment={equipment}
                    inventory={inventory}
                    definitions={definitions}
                    onItemClick={onItemClick}
                />
            ))}
        </div>
    );
};
