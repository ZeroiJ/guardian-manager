/**
 * LoadoutEditorDrawer — Phase 6b (Expanded)
 *
 * A side-sheet component to edit loadouts.
 * Features:
 * - Fill from Equipped / Unequipped
 * - Add/Remove items via bucket categories
 * - Item picker integration
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save, Trash2, Plus, Zap, Package, Shield, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ILoadout, ILoadoutItem, useLoadoutStore } from '@/store/loadoutStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { GuardianItem } from '@/services/profile/types';
import { BucketHashes } from '@/lib/destiny-constants';
import { createPortal } from 'react-dom';
import { ItemPicker } from './ItemPicker';

interface LoadoutEditorDrawerProps {
    loadout: ILoadout | null;
    onClose: () => void;
}

// Bucket categories for organization
const WEAPON_BUCKETS = [
    BucketHashes.KineticWeapons,
    BucketHashes.EnergyWeapons,
    BucketHashes.PowerWeapons,
];

const ARMOR_BUCKETS = [
    BucketHashes.Helmet,
    BucketHashes.Gauntlets,
    BucketHashes.ChestArmor,
    BucketHashes.LegArmor,
    BucketHashes.ClassArmor,
];

const GENERAL_BUCKETS = [
    BucketHashes.Ghost,
    BucketHashes.Subclass,
];

const BUCKET_LABELS: Record<number, string> = {
    [BucketHashes.KineticWeapons]: 'Kinetic',
    [BucketHashes.EnergyWeapons]: 'Energy',
    [BucketHashes.PowerWeapons]: 'Power',
    [BucketHashes.Helmet]: 'Helmet',
    [BucketHashes.Gauntlets]: 'Arms',
    [BucketHashes.ChestArmor]: 'Chest',
    [BucketHashes.LegArmor]: 'Legs',
    [BucketHashes.ClassArmor]: 'Class',
    [BucketHashes.Ghost]: 'Ghost',
    [BucketHashes.Subclass]: 'Subclass',
};

export function LoadoutEditorDrawer({ loadout, onClose }: LoadoutEditorDrawerProps) {
    const { renameLoadout, updateItems, saveCurrentLoadout } = useLoadoutStore();
    const manifest = useInventoryStore((s) => s.manifest);
    const allItems = useInventoryStore((s) => s.items);
    const characters = useInventoryStore((s) => s.characters);

    const [name, setName] = useState('');
    const [items, setItems] = useState<ILoadoutItem[]>([]);
    const [showItemPicker, setShowItemPicker] = useState(false);
    const [pickerTargetBucket, setPickerTargetBucket] = useState<number | null>(null);

    // Load initial state
    useEffect(() => {
        if (loadout) {
            setName(loadout.name);
            setItems(loadout.items);
        }
    }, [loadout]);

    if (!loadout) return null;

    // Get character for this loadout
    const character = characters[loadout.characterId];

    // Helper: convert GuardianItem to ILoadoutItem
    const convertToLoadoutItem = useCallback((item: GuardianItem): ILoadoutItem => {
        const def = manifest[item.itemHash];
        return {
            itemInstanceId: item.itemInstanceId!,
            itemHash: item.itemHash,
            bucketHash: item.bucketHash,
            label: def?.displayProperties?.name,
            power: item.instanceData?.primaryStat?.value,
            socketOverrides: undefined,
        };
    }, [manifest]);

    // Helper: add item to loadout (replaces existing in same bucket)
    const handleAddItem = useCallback((item: GuardianItem) => {
        setItems((prev) => {
            // Remove any existing item in the same bucket
            const filtered = prev.filter((i) => i.bucketHash !== item.bucketHash);
            // Add new item
            return [...filtered, convertToLoadoutItem(item)];
        });
    }, [convertToLoadoutItem]);

    // Helper: remove item
    const handleRemoveItem = useCallback((itemInstanceId: string) => {
        setItems((prev) => prev.filter((i) => i.itemInstanceId !== itemInstanceId));
    }, []);

    // Fill from Equipped - snapshot current equipped gear
    const handleFillFromEquipped = useCallback(() => {
        const equippedItems = allItems.filter(
            (item) =>
                item.owner === loadout.characterId &&
                item.instanceData?.isEquipped === true &&
                item.itemInstanceId != null
        );

        const newItems: ILoadoutItem[] = equippedItems.map((item) => convertToLoadoutItem(item));
        setItems(newItems);
    }, [allItems, loadout.characterId, convertToLoadoutItem]);

    // Fill from Unequipped - all items on character
    const handleFillFromUnequipped = useCallback(() => {
        const characterItems = allItems.filter(
            (item) =>
                item.owner === loadout.characterId &&
                item.itemInstanceId != null
        );

        // For each bucket, pick the highest power item
        const newItems: ILoadoutItem[] = [];
        const seenBuckets = new Set<number>();

        // Sort by power descending
        const sorted = [...characterItems].sort((a, b) => {
            const powerA = a.instanceData?.primaryStat?.value || 0;
            const powerB = b.instanceData?.primaryStat?.value || 0;
            return powerB - powerA;
        });

        for (const item of sorted) {
            if (!seenBuckets.has(item.bucketHash)) {
                seenBuckets.add(item.bucketHash);
                newItems.push(convertToLoadoutItem(item));
            }
        }

        setItems(newItems);
    }, [allItems, loadout.characterId, convertToLoadoutItem]);

    // Open item picker for specific bucket
    const handleOpenPicker = useCallback((bucketHash: number) => {
        setPickerTargetBucket(bucketHash);
        setShowItemPicker(true);
    }, []);

    // Get items by bucket
    const itemsByBucket = useMemo(() => {
        const map: Record<number, ILoadoutItem> = {};
        for (const item of items) {
            map[item.bucketHash] = item;
        }
        return map;
    }, [items]);

    const handleSave = () => {
        renameLoadout(loadout.id, name);
        updateItems(loadout.id, items);
        onClose();
    };

    const handlePickerSelect = useCallback((item: GuardianItem) => {
        handleAddItem(item);
        setShowItemPicker(false);
        setPickerTargetBucket(null);
    }, [handleAddItem]);

    // Filter for item picker - only show items from the loadout's character
    const pickerFilter = useCallback((item: GuardianItem) => {
        // Only show items from the same character
        if (item.owner !== loadout.characterId) return false;
        
        // If target bucket is set, only show items from that bucket
        if (pickerTargetBucket != null) {
            return item.bucketHash === pickerTargetBucket;
        }
        
        // Show all items from character
        return true;
    }, [loadout.characterId, pickerTargetBucket]);

    const getPickerPrompt = useCallback(() => {
        if (pickerTargetBucket != null) {
            const label = BUCKET_LABELS[pickerTargetBucket] || `Bucket ${pickerTargetBucket}`;
            return `Select ${label}`;
        }
        return 'Select an item';
    }, [pickerTargetBucket]);

    return (
        <>
            <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm transition-opacity">
                <div className="w-[480px] h-full bg-[#0a0a0a] border-l border-white/10 shadow-2xl flex flex-col transform transition-transform">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold font-rajdhani tracking-widest uppercase">Edit Loadout</h2>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-sm">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Name Edit */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest">
                                Loadout Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-void-surface border border-white/15 rounded-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 font-rajdhani tracking-wide"
                            />
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={handleFillFromEquipped}
                                className={cn(
                                    'flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider font-rajdhani',
                                    'border border-white/10 text-gray-400 bg-white/[0.02]',
                                    'hover:border-white/25 hover:text-white hover:bg-white/[0.05]'
                                )}
                            >
                                <Zap size={12} />
                                Fill Equipped
                            </button>
                            <button
                                onClick={handleFillFromUnequipped}
                                className={cn(
                                    'flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-[10px] font-bold uppercase tracking-wider font-rajdhani',
                                    'border border-white/10 text-gray-400 bg-white/[0.02]',
                                    'hover:border-white/25 hover:text-white hover:bg-white/[0.05]'
                                )}
                            >
                                <RefreshCw size={12} />
                                Fill Best
                            </button>
                        </div>

                        {/* Subclass Section */}
                        <BucketSection
                            title="Subclass"
                            bucketHash={BucketHashes.Subclass}
                            item={itemsByBucket[BucketHashes.Subclass]}
                            manifest={manifest}
                            onAdd={() => handleOpenPicker(BucketHashes.Subclass)}
                            onRemove={() => handleRemoveItem(itemsByBucket[BucketHashes.Subclass]?.itemInstanceId || '')}
                        />

                        {/* Weapons Section */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest">
                                Weapons
                            </h3>
                            <div className="grid grid-cols-3 gap-2">
                                {WEAPON_BUCKETS.map((bucket) => (
                                    <BucketSlot
                                        key={bucket}
                                        bucketHash={bucket}
                                        label={BUCKET_LABELS[bucket]}
                                        item={itemsByBucket[bucket]}
                                        manifest={manifest}
                                        onAdd={() => handleOpenPicker(bucket)}
                                        onRemove={() => handleRemoveItem(itemsByBucket[bucket]?.itemInstanceId || '')}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Armor Section */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest">
                                Armor
                            </h3>
                            <div className="grid grid-cols-5 gap-1">
                                {ARMOR_BUCKETS.map((bucket) => (
                                    <BucketSlot
                                        key={bucket}
                                        bucketHash={bucket}
                                        label={BUCKET_LABELS[bucket]}
                                        item={itemsByBucket[bucket]}
                                        manifest={manifest}
                                        compact
                                        onAdd={() => handleOpenPicker(bucket)}
                                        onRemove={() => handleRemoveItem(itemsByBucket[bucket]?.itemInstanceId || '')}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* General Section */}
                        <div className="space-y-2">
                            <h3 className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest">
                                General
                            </h3>
                            <div className="grid grid-cols-2 gap-2">
                                {GENERAL_BUCKETS.filter(b => b !== BucketHashes.Subclass).map((bucket) => (
                                    <BucketSlot
                                        key={bucket}
                                        bucketHash={bucket}
                                        label={BUCKET_LABELS[bucket]}
                                        item={itemsByBucket[bucket]}
                                        manifest={manifest}
                                        onAdd={() => handleOpenPicker(bucket)}
                                        onRemove={() => handleRemoveItem(itemsByBucket[bucket]?.itemInstanceId || '')}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Items List Summary */}
                        <div className="pt-4 border-t border-white/10">
                            <p className="text-[10px] text-gray-600 font-mono text-center">
                                {items.length} items in loadout
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-white/10 bg-black flex justify-between gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-rajdhani flex-1"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-gray-200 font-rajdhani flex-1 flex items-center justify-center gap-2"
                        >
                            <Save size={14} />
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

            {/* Item Picker Modal */}
            <ItemPicker
                isOpen={showItemPicker}
                onClose={() => {
                    setShowItemPicker(false);
                    setPickerTargetBucket(null);
                }}
                onItemSelected={handlePickerSelect}
                filter={pickerFilter}
                prompt={getPickerPrompt()}
                ownerId={loadout.characterId}
            />
        </>
    );
}

// Bucket Section Component
function BucketSection({
    title,
    bucketHash,
    item,
    manifest,
    onAdd,
    onRemove,
}: {
    title: string;
    bucketHash: number;
    item?: ILoadoutItem;
    manifest: Record<number, any>;
    onAdd: () => void;
    onRemove: () => void;
}) {
    const def = item ? manifest[item.itemHash] : null;
    const icon = def?.displayProperties?.icon;
    const name = def?.displayProperties?.name || 'Empty';

    return (
        <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest">
                {title}
            </h3>
            <div className="flex items-center gap-3 p-2 rounded-sm border border-white/5 bg-white/[0.02]">
                {item ? (
                    <>
                        <div className="w-12 h-12 rounded-sm border border-rarity-legendary/30 overflow-hidden bg-black/50 flex-shrink-0">
                            {icon ? (
                                <img src={`https://www.bungie.net${icon}`} alt={name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                    <Package size={20} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold font-rajdhani truncate">{name}</p>
                            {item.power && <p className="text-[10px] text-gray-500 font-mono">Power: {item.power}</p>}
                        </div>
                        <button
                            onClick={onRemove}
                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                            title="Remove"
                        >
                            <Trash2 size={14} />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={onAdd}
                        className="flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold text-gray-500 border border-dashed border-white/10 rounded-sm hover:border-white/20 hover:text-white transition-colors font-rajdhani uppercase tracking-wider"
                    >
                        <Plus size={12} />
                        Add {title}
                    </button>
                )}
            </div>
        </div>
    );
}

// Bucket Slot Component (compact for weapons/armor)
function BucketSlot({
    bucketHash,
    label,
    item,
    manifest,
    compact,
    onAdd,
    onRemove,
}: {
    bucketHash: number;
    label: string;
    item?: ILoadoutItem;
    manifest: Record<number, any>;
    compact?: boolean;
    onAdd: () => void;
    onRemove: () => void;
}) {
    const def = item ? manifest[item.itemHash] : null;
    const icon = def?.displayProperties?.icon;
    const name = def?.displayProperties?.name || '';

    if (compact) {
        return item ? (
            <div className="group relative">
                <div className="w-full aspect-square rounded-sm border border-rarity-legendary/30 overflow-hidden bg-black/50">
                    {icon ? (
                        <img src={`https://www.bungie.net${icon}`} alt={name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Package size={16} />
                        </div>
                    )}
                </div>
                <button
                    onClick={onRemove}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X size={8} className="text-white" />
                </button>
                <p className="text-[6px] text-center text-gray-500 font-mono mt-0.5 truncate">{label}</p>
            </div>
        ) : (
            <button
                onClick={onAdd}
                className="w-full aspect-square rounded-sm border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center gap-1 hover:border-white/20 hover:bg-white/[0.05] transition-colors group"
            >
                <Plus size={12} className="text-gray-600 group-hover:text-white" />
                <span className="text-[6px] text-gray-600 font-mono uppercase">{label}</span>
            </button>
        );
    }

    // Non-compact slot
    return item ? (
        <div className="flex items-center gap-2 p-2 rounded-sm border border-white/5 bg-white/[0.02]">
            <div className="w-10 h-10 rounded-sm border border-rarity-legendary/30 overflow-hidden bg-black/50 flex-shrink-0">
                {icon ? (
                    <img src={`https://www.bungie.net${icon}`} alt={name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Package size={16} />
                    </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold font-rajdhani truncate">{label}</p>
                <p className="text-[8px] text-gray-500 font-mono truncate">{name}</p>
            </div>
            <button
                onClick={onRemove}
                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            >
                <Trash2 size={12} />
            </button>
        </div>
    ) : (
        <button
            onClick={onAdd}
            className="flex items-center gap-2 p-2 rounded-sm border border-dashed border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.05] transition-colors"
        >
            <div className="w-10 h-10 rounded-sm border border-white/10 bg-white/[0.02] flex items-center justify-center">
                <Plus size={14} className="text-gray-600" />
            </div>
            <span className="text-[10px] font-bold font-rajdhani text-gray-500 uppercase">+ {label}</span>
        </button>
    );
}

export default LoadoutEditorDrawer;
