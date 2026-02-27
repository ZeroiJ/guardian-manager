/**
 * LoadoutEditorDrawer — Phase 6b (Expanded)
 *
 * A side-sheet component to edit loadouts.
 * Slides up from bottom (DIM-style).
 * Features:
 * - Fill from Equipped / Unequipped
 * - Add/Remove items via bucket categories
 * - Item picker integration we still getting errors look ""
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Save, Trash2, Plus, Zap, Package, Shield, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ILoadout, ILoadoutItem, useLoadoutStore, CLASS_NAMES } from '@/store/loadoutStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { GuardianItem } from '@/services/profile/types';
import { BucketHashes } from '@/lib/destiny-constants';
import { createPortal } from 'react-dom';
import { ItemPicker } from './ItemPicker';
import { SubclassPlugDrawer } from './SubclassPlugDrawer';

interface LoadoutEditorDrawerProps {
    /** The loadout to edit. If null, drawer won't render. */
    loadout: ILoadout | null;
    /** If true, this is a new empty loadout being created */
    isNew?: boolean;
    onClose: () => void;
}

// Bucket categories for organization
const WEAPON_BUCKETS = [
    BucketHashes.KineticWeapons,
    BucketHashes.EnergyWeapons,
    BucketHashes.PowerWeapons,
];

const ARMOR_BUCKETS: number[] = [
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

export function LoadoutEditorDrawer({ loadout, isNew = false, onClose }: LoadoutEditorDrawerProps) {
    const { renameLoadout, updateItems, saveCurrentLoadout, addLoadout } = useLoadoutStore();
    const manifest = useInventoryStore((s) => s.manifest) ?? {};
    const allItems = useInventoryStore((s) => s.items) ?? [];
    const characters = useInventoryStore((s) => s.characters) ?? {};
    const profile = useInventoryStore((s) => s.profile);

    // Don't render until inventory is loaded (like DIM does)
    if (!profile || Object.keys(characters).length === 0 || allItems.length === 0) {
        return null;
    }

    // Only render if we have a loadout
    if (!loadout) return null;

    const [name, setName] = useState(loadout.name || 'New Loadout');
    const [items, setItems] = useState<ILoadoutItem[]>(loadout.items);
    const [showItemPicker, setShowItemPicker] = useState(false);
    const [pickerTargetBucket, setPickerTargetBucket] = useState<number | null>(null);
    // Subclass plug drawer state
    const [showSubclassDrawer, setShowSubclassDrawer] = useState(false);
    const [selectedSubclass, setSelectedSubclass] = useState<GuardianItem | null>(null);
    const [socketOverrides, setSocketOverrides] = useState<Record<number, number>>({});
    // Dropdown state - which bucket slot has the dropdown open
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);

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

    // Open item picker for specific bucket (opens full drawer)
    const handleOpenPicker = useCallback((bucketHash: number) => {
        setPickerTargetBucket(bucketHash);
        setShowItemPicker(true);
        setOpenDropdown(null); // Close any open dropdown
    }, []);

    // Open dropdown for specific bucket (kept for backward compat, but now just opens picker)
    const handleOpenDropdown = useCallback((bucketHash: number) => {
        handleOpenPicker(bucketHash);
    }, [handleOpenPicker]);

    // Close dropdown
    const handleCloseDropdown = useCallback(() => {
        setOpenDropdown(null);
    }, []);

    // For new loadouts, we need a character to be selected first
    const [selectedCharId, setSelectedCharId] = useState<string | null>(loadout.characterId || null);

    // Get available items for a bucket from all inventory
    const getAvailableItemsForBucket = useCallback((bucketHash: number) => {
        const isArmorBucket = ARMOR_BUCKETS.includes(bucketHash);
        
        // Get the actual class to use - from selected character for new loadouts
        const effectiveCharId = isNew ? selectedCharId : loadout.characterId;
        const character = effectiveCharId ? characters[effectiveCharId] : null;
        const loadoutClass = character?.classType ?? loadout.characterClass;
        
        return allItems.filter((item) => {
            // Must match bucket
            if (item.bucketHash !== bucketHash) return false;
            if (!item.itemInstanceId) return false;
            
            // For armor buckets, filter by class
            if (isArmorBucket) {
                const def = manifest[item.itemHash];
                const itemClassType = def?.classType;
                
                // If loadout has a class, only show matching armor
                // classType: 0=Titan, 1=Hunter, 2=Warlock, -1/3=Any
                if (loadoutClass >= 0 && itemClassType >= 0 && itemClassType !== loadoutClass) {
                    return false;
                }
            }
            
            return true;
        }).sort((a, b) => {
            // Sort by power descending
            const powerA = a.instanceData?.primaryStat?.value || 0;
            const powerB = b.instanceData?.primaryStat?.value || 0;
            return powerB - powerA;
        }).slice(0, 10); // Show top 10
    }, [allItems, manifest, loadout.characterClass, selectedCharId, characters, isNew]);

    // Select item from dropdown
    const handleSelectFromDropdown = useCallback((item: GuardianItem) => {
        handleAddItem(item);
        handleCloseDropdown();
    }, [handleAddItem, handleCloseDropdown]);

    // Get items by bucket
    const itemsByBucket = useMemo(() => {
        const map: Record<number, ILoadoutItem> = {};
        for (const item of items) {
            map[item.bucketHash] = item;
        }
        return map;
    }, [items]);

    const handleSave = useCallback(() => {
        if (isNew) {
            // Create new loadout with the selected character
            const selectedCharId = loadout.characterId || Object.keys(characters)[0];
            const character = characters[selectedCharId];
            
            // Create a new loadout directly
            const newLoadout: ILoadout = {
                id: crypto.randomUUID(),
                name: name.trim() || 'New Loadout',
                characterId: selectedCharId,
                characterClass: character?.classType ?? -1,
                items,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            };
            addLoadout(newLoadout);
        } else {
            renameLoadout(loadout.id, name);
            updateItems(loadout.id, items);
        }
        onClose();
    }, [isNew, loadout, name, items, characters, renameLoadout, updateItems, addLoadout, onClose]);

    const handlePickerSelect = useCallback((item: GuardianItem) => {
        const def = manifest[item.itemHash];
        const itemBucketTypeHash = def?.inventory?.bucketTypeHash;
        const isSubclass = itemBucketTypeHash === BucketHashes.Subclass;
        
        // If selecting a subclass, also open the plug drawer to configure it
        if (isSubclass) {
            setSelectedSubclass(item);
            setSocketOverrides({});
            setShowSubclassDrawer(true);
        }
        
        handleAddItem(item);
        setShowItemPicker(false);
        setPickerTargetBucket(null);
    }, [handleAddItem, manifest]);

    // Handle accepting socket overrides from subclass drawer
    const handleSubclassAccept = useCallback((overrides: Record<number, number>) => {
        setSocketOverrides(overrides);
        // Update the subclass item in loadout with socket overrides
        if (selectedSubclass) {
            setItems((prev) => 
                prev.map((item) => {
                    if (item.bucketHash === BucketHashes.Subclass && item.itemInstanceId === selectedSubclass.itemInstanceId) {
                        return { ...item, socketOverrides: overrides };
                    }
                    return item;
                })
            );
        }
        setShowSubclassDrawer(false);
    }, [selectedSubclass]);

    // Filter for item picker - show items from ALL characters + vault (not just selected)
    const pickerFilter = useCallback((item: GuardianItem) => {
        // If target bucket is set, only show items from that bucket
        if (pickerTargetBucket != null) {   
            const def = manifest[item.itemHash];
            
            // Check both item.bucketHash (where it currently is) and def.inventory.bucketTypeHash (what type of item it is)
            const itemBucketHash = item.bucketHash;
            const itemBucketTypeHash = def?.inventory?.bucketTypeHash;
            
            // Match if either matches - this handles both equipped and inventory items
            const matchesBucket = itemBucketHash === pickerTargetBucket || itemBucketTypeHash === pickerTargetBucket;
            
            if (!matchesBucket) return false;
            
            // Get loadout class
            const effectiveCharId = isNew ? selectedCharId : loadout.characterId;
            const character = effectiveCharId ? characters[effectiveCharId] : null;
            const loadoutClass = character?.classType ?? loadout.characterClass;
            
            // Filter armor by class (like DIM's isItemLoadoutCompatible)
            const isArmorBucket = ARMOR_BUCKETS.includes(itemBucketTypeHash);
            if (isArmorBucket && loadoutClass >= 0) {
                const itemClassType = def?.classType;
                // classType: 0=Titan, 1=Hunter, 2=Warlock, -1/3=Any
                if (itemClassType != null && itemClassType >= 0 && itemClassType !== loadoutClass) {
                    return false;
                }
            }
            
            // Filter subclass by class - only show matching class subclasses
            const isSubclass = itemBucketTypeHash === BucketHashes.Subclass;
            if (isSubclass && loadoutClass >= 0) {
                const itemClassType = def?.classType;
                // classType: 0=Titan, 1=Hunter, 2=Warlock, -1/3=Any
                if (itemClassType != null && itemClassType >= 0 && itemClassType !== loadoutClass) {
                    return false;
                }
            }
            
            return true;
        }
        
        // Show all items from all characters + vault
        return true;
    }, [pickerTargetBucket, selectedCharId, loadout.characterId, loadout.characterClass, characters, manifest, isNew]);

    const getPickerPrompt = useCallback(() => {
        if (pickerTargetBucket != null) {
            const label = BUCKET_LABELS[pickerTargetBucket] || `Bucket ${pickerTargetBucket}`;
            return `Select ${label}`;
        }
        return 'Select an item';
    }, [pickerTargetBucket]);

    const handleCharSelect = useCallback((charId: string) => {
        setSelectedCharId(charId);
    }, []);

    // If new loadout and no character selected, show character picker
    if (isNew && !selectedCharId) {
        const charList = Object.values(characters);
        
        return createPortal(
            <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
                <div className="w-full max-w-lg bg-[#0a0a0a] border-t border-white/10 rounded-t-xl shadow-2xl animate-slide-up">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                        <h2 className="text-lg font-bold font-rajdhani tracking-widest uppercase">
                            Select Character
                        </h2>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-sm">
                            <X size={18} />
                        </button>
                    </div>

                    {/* Character List */}
                    <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
                        {charList.map((char: any) => (
                            <button
                                key={char.characterId}
                                onClick={() => handleCharSelect(char.characterId)}
                                className="w-full flex items-center gap-4 p-3 rounded-sm border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30 transition-all"
                            >
                                <div
                                    className="w-12 h-12 rounded-sm bg-cover bg-center border border-white/10"
                                    style={{ backgroundImage: `url(https://www.bungie.net${char.emblemPath})` }}
                                />
                                <div className="text-left">
                                    <div className="text-sm font-bold font-rajdhani uppercase">
                                        {CLASS_NAMES[char.classType] || 'Unknown'}
                                    </div>
                                    <div className="text-xs text-gray-500 font-mono">
                                        {char.raceName} {char.genderName} • Light {char.light}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // Main editor drawer (slides up from bottom)
    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-2xl bg-[#0a0a0a] border-t border-white/10 rounded-t-xl shadow-2xl flex flex-col max-h-[85vh] animate-slide-up">
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

                    {/* Subclass Section */}
                    <BucketSection
                        title="Subclass"
                        bucketHash={BucketHashes.Subclass}
                        item={itemsByBucket[BucketHashes.Subclass]}
                        manifest={manifest}
                        onAdd={() => handleOpenPicker(BucketHashes.Subclass)}
                        onRemove={() => handleRemoveItem(itemsByBucket[BucketHashes.Subclass]?.itemInstanceId || '')}
                        onConfigure={() => {
                            const subclassItem = itemsByBucket[BucketHashes.Subclass];
                            if (subclassItem) {
                                // Find the actual GuardianItem from allItems
                                const fullItem = allItems.find(i => i.itemInstanceId === subclassItem.itemInstanceId);
                                if (fullItem) {
                                    setSelectedSubclass(fullItem);
                                    setSocketOverrides(subclassItem.socketOverrides || {});
                                    setShowSubclassDrawer(true);
                                }
                            }
                        }}
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
                                    isOpen={openDropdown === bucket}
                                    onAdd={() => handleOpenDropdown(bucket)}
                                    onRemove={() => handleRemoveItem(itemsByBucket[bucket]?.itemInstanceId || '')}
                                    availableItems={getAvailableItemsForBucket(bucket)}
                                    onSelectItem={handleSelectFromDropdown}
                                    onClose={handleCloseDropdown}
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
                                    isOpen={openDropdown === bucket}
                                    onAdd={() => handleOpenDropdown(bucket)}
                                    onRemove={() => handleRemoveItem(itemsByBucket[bucket]?.itemInstanceId || '')}
                                    availableItems={getAvailableItemsForBucket(bucket)}
                                    onSelectItem={handleSelectFromDropdown}
                                    onClose={handleCloseDropdown}
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
                                    isOpen={openDropdown === bucket}
                                    onAdd={() => handleOpenDropdown(bucket)}
                                    onRemove={() => handleRemoveItem(itemsByBucket[bucket]?.itemInstanceId || '')}
                                    availableItems={getAvailableItemsForBucket(bucket)}
                                    onSelectItem={handleSelectFromDropdown}
                                    onClose={handleCloseDropdown}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Items Summary */}
                    <div className="pt-4 border-t border-white/10">
                        <p className="text-[10px] text-gray-600 font-mono text-center">
                            {items.length} items in loadout
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-black flex justify-between gap-3 flex-shrink-0">
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
                        {isNew ? 'Create' : 'Save'}
                    </button>
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
                // No ownerId - show all items from all characters + vault
            />

            {/* Subclass Plug Drawer */}
            {showSubclassDrawer && selectedSubclass && (
                <SubclassPlugDrawer
                    item={selectedSubclass}
                    socketOverrides={socketOverrides}
                    onAccept={handleSubclassAccept}
                    onClose={() => setShowSubclassDrawer(false)}
                />
            )}
        </div>,
        document.body
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
    onConfigure,
}: {
    title: string;
    bucketHash: number;
    item?: ILoadoutItem;
    manifest: Record<number, any>;
    onAdd: () => void;
    onRemove: () => void;
    onConfigure?: () => void;
}) {
    const def = item ? manifest[item.itemHash] : null;
    const icon = def?.displayProperties?.icon;
    const name = def?.displayProperties?.name || 'Empty';
    const isSubclass = bucketHash === BucketHashes.Subclass;

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
                        {isSubclass && onConfigure && (
                            <button
                                onClick={onConfigure}
                                className="px-3 py-1.5 text-[10px] font-bold text-gray-400 border border-white/10 rounded-sm hover:border-white/20 hover:text-white transition-colors font-rajdhani uppercase"
                            >
                                Configure
                            </button>
                        )}
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
    isOpen,
    availableItems,
    onSelectItem,
    onClose,
}: {
    bucketHash: number;
    label: string;
    item?: ILoadoutItem;
    manifest: Record<number, any>;
    compact?: boolean;
    onAdd: () => void;
    onRemove: () => void;
    isOpen?: boolean;
    availableItems?: GuardianItem[];
    onSelectItem?: (item: GuardianItem) => void;
    onClose?: () => void;
}) {
    const def = item ? manifest[item.itemHash] : null;
    const icon = def?.displayProperties?.icon;
    const name = def?.displayProperties?.name || '';

    if (compact) {
        return (
            <div className="relative">
                {item ? (
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
                )}
            </div>
        );
    }

    // Non-compact slot
    return (
        <div className="relative">
            {item ? (
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
            )}
        </div>
    );
}

export default LoadoutEditorDrawer;
