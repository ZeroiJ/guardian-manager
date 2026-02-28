/**
 * ModPicker - Select armor mods for loadout
 * 
 * A drawer to select armor mods grouped by armor slot (Helmet, Gauntlets, etc.)
 * with tabbed navigation. Loads the FULL DestinyInventoryItemDefinition table
 * from ManifestManager to discover all available armor mods.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { X, Check, Zap, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/store/useInventoryStore';
import { BucketHashes } from '@/lib/destiny-constants';
import { ManifestManager } from '@/services/manifest/manager';
import { createPortal } from 'react-dom';

interface ModPickerProps {
    modsByBucket: Record<number, number[]>;
    characterClass: number;
    onAccept: (modsByBucket: Record<number, number[]>) => void;
    onClose: () => void;
}

type ModEntry = {
    hash: number;
    name: string;
    icon?: string;
    energyCost: number;
    description?: string;
    /** Sub-category label within a slot (e.g. "Ammo Finder", "Targeting") */
    subCategory?: string;
};

/**
 * Armor slot tabs for mod categorization.
 * Each slot maps to plugCategoryIdentifier patterns from the Bungie manifest.
 */
const SLOT_TABS = [
    { key: 'helmet', label: 'Helmet', bucketHash: BucketHashes.Helmet, patterns: ['head', 'helmet'] },
    { key: 'gauntlets', label: 'Gauntlets', bucketHash: BucketHashes.Gauntlets, patterns: ['arms', 'gauntlet'] },
    { key: 'chest', label: 'Chest', bucketHash: BucketHashes.ChestArmor, patterns: ['chest'] },
    { key: 'legs', label: 'Legs', bucketHash: BucketHashes.LegArmor, patterns: ['legs', 'leg'] },
    { key: 'class', label: 'Class Item', bucketHash: BucketHashes.ClassArmor, patterns: ['class'] },
    { key: 'general', label: 'General', bucketHash: 0, patterns: ['general'] },
] as const;

type SlotKey = typeof SLOT_TABS[number]['key'];

/**
 * Determine which armor slot a mod belongs to based on its plugCategoryIdentifier.
 */
function getModSlot(plugCategoryIdentifier: string): SlotKey {
    const id = plugCategoryIdentifier.toLowerCase();

    // Check specific slot patterns first
    if (id.includes('head') || id.includes('helmet')) return 'helmet';
    if (id.includes('arms') || id.includes('gauntlet')) return 'gauntlets';
    if (id.includes('chest')) return 'chest';
    if (id.includes('legs') || id.includes('leg.')) return 'legs';
    if (id.includes('class_item') || id.includes('.class')) return 'class';

    // General/universal mods
    if (id.includes('general') || id.includes('universal')) return 'general';

    // Raid/activity/seasonal mods default to general
    if (id.includes('raid') || id.includes('activity') || id.includes('season')) return 'general';

    return 'general';
}

export function ModPicker({
    modsByBucket,
    characterClass,
    onAccept,
    onClose,
}: ModPickerProps) {
    const manifest = useInventoryStore((s) => s.manifest);

    // Full item definition table (loaded async from ManifestManager)
    const [fullTable, setFullTable] = useState<Record<string, any> | null>(null);
    const [tableLoading, setTableLoading] = useState(true);
    const [activeSlot, setActiveSlot] = useState<SlotKey>('helmet');

    // Load the full DestinyInventoryItemDefinition table
    useEffect(() => {
        let isMounted = true;
        async function loadMods() {
            try {
                const table = await ManifestManager.loadTable('DestinyInventoryItemDefinition');
                if (isMounted) {
                    setFullTable(table);
                    setTableLoading(false);
                }
            } catch (err) {
                console.error('[ModPicker] Failed to load item definitions:', err);
                if (isMounted) setTableLoading(false);
            }
        }
        loadMods();
        return () => { isMounted = false; };
    }, []);

    // Flatten all selected mods for tracking
    const [selectedMods, setSelectedMods] = useState<Set<number>>(() => {
        const set = new Set<number>();
        for (const mods of Object.values(modsByBucket)) {
            for (const modHash of mods) {
                set.add(modHash);
            }
        }
        return set;
    });

    // Discover all armor mods grouped by slot
    const modsBySlot = useMemo((): Record<SlotKey, ModEntry[]> => {
        const result: Record<SlotKey, ModEntry[]> = {
            helmet: [], gauntlets: [], chest: [], legs: [], class: [], general: [],
        };

        if (!fullTable) return result;

        for (const [hash, def] of Object.entries(fullTable)) {
            const hashNum = parseInt(hash);
            if (isNaN(hashNum)) continue;

            // Armor mods have itemType === 19 with plugCategoryIdentifier containing "enhancements"
            if (def?.itemType !== 19) continue;
            const plugCategoryId = def?.plug?.plugCategoryIdentifier;
            if (!plugCategoryId || !plugCategoryId.toLowerCase().includes('enhancements')) continue;

            // Skip empty/placeholder entries
            const name = def?.displayProperties?.name;
            if (!name || name === '' || name === 'Empty Mod Socket' || name.toLowerCase().includes('deprecated')) continue;

            // Filter by class if the mod has a class restriction
            if (def.classType != null && def.classType >= 0 && def.classType <= 2 && characterClass >= 0) {
                if (def.classType !== characterClass) continue;
            }

            const slot = getModSlot(plugCategoryId);

            result[slot].push({
                hash: hashNum,
                name,
                icon: def.displayProperties?.icon,
                energyCost: def.plug?.energyCost?.energyCost || 0,
                description: def.displayProperties?.description,
            });
        }

        // Sort mods alphabetically within each slot
        for (const key of Object.keys(result) as SlotKey[]) {
            result[key].sort((a, b) => a.name.localeCompare(b.name));
        }

        return result;
    }, [fullTable, characterClass]);

    // Get counts per slot for the tab badges
    const slotCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const tab of SLOT_TABS) {
            counts[tab.key] = modsBySlot[tab.key].length;
        }
        return counts;
    }, [modsBySlot]);

    // Current slot's mods
    const currentMods = modsBySlot[activeSlot];

    // Calculate total energy used
    const totalEnergy = useMemo(() => {
        let energy = 0;
        const lookupTable: Record<string, any> = (fullTable || manifest) as Record<string, any>;
        for (const modHash of selectedMods) {
            const def = lookupTable[modHash];
            if (def?.plug?.energyCost?.energyCost) {
                energy += def.plug.energyCost.energyCost;
            }
        }
        return energy;
    }, [selectedMods, fullTable, manifest]);

    const handleToggleMod = useCallback((modHash: number) => {
        setSelectedMods((prev) => {
            const next = new Set(prev);
            if (next.has(modHash)) {
                next.delete(modHash);
            } else {
                next.add(modHash);
            }
            return next;
        });
    }, []);

    const handleAccept = useCallback(() => {
        // Group selected mods by their slot bucket
        const newModsByBucket: Record<number, number[]> = {};

        for (const modHash of selectedMods) {
            // Look up mod to determine its slot
            const lookupTable: Record<string, any> = (fullTable || manifest) as Record<string, any>;
            const def = lookupTable[modHash];
            const plugCategoryId = def?.plug?.plugCategoryIdentifier || '';
            const slot = getModSlot(plugCategoryId);
            const tab = SLOT_TABS.find(t => t.key === slot);
            const bucket = tab?.bucketHash || BucketHashes.ChestArmor;

            if (!newModsByBucket[bucket]) newModsByBucket[bucket] = [];
            newModsByBucket[bucket].push(modHash);
        }

        onAccept(newModsByBucket);
        onClose();
    }, [selectedMods, onAccept, onClose, fullTable, manifest]);

    // Count how many selected mods are in each slot
    const selectedPerSlot = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const tab of SLOT_TABS) {
            counts[tab.key] = 0;
        }
        for (const modHash of selectedMods) {
            const lookupTable: Record<string, any> = (fullTable || manifest) as Record<string, any>;
            const def = lookupTable[modHash];
            const plugCategoryId = def?.plug?.plugCategoryIdentifier || '';
            const slot = getModSlot(plugCategoryId);
            counts[slot] = (counts[slot] || 0) + 1;
        }
        return counts;
    }, [selectedMods, fullTable, manifest]);

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div
                className="w-[750px] max-h-[85vh] bg-[#0a0a0a] border border-white/15 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h2 className="text-lg font-bold font-rajdhani tracking-widest uppercase text-white">
                            Select Armor Mods
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            <span className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                                <Zap size={12} className="text-amber-400" />
                                Energy: {totalEnergy}
                            </span>
                            <span className="text-xs text-gray-600 font-mono">
                                {selectedMods.size} mods selected
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Slot Tabs */}
                <div className="flex border-b border-white/10 bg-black/30">
                    {SLOT_TABS.map((tab) => {
                        const isActive = activeSlot === tab.key;
                        const count = slotCounts[tab.key] || 0;
                        const selected = selectedPerSlot[tab.key] || 0;

                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveSlot(tab.key)}
                                className={cn(
                                    'flex-1 py-2.5 px-1 text-[10px] font-bold uppercase tracking-widest font-rajdhani transition-all relative',
                                    isActive
                                        ? 'text-white bg-white/5'
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.02]'
                                )}
                            >
                                {/* Active indicator bar */}
                                {isActive && (
                                    <div className="absolute bottom-0 left-1 right-1 h-[2px] bg-amber-400 rounded-full" />
                                )}

                                <div className="flex flex-col items-center gap-0.5">
                                    <span>{tab.label}</span>
                                    <span className={cn(
                                        'text-[8px] font-mono font-normal',
                                        isActive ? 'text-gray-400' : 'text-gray-700'
                                    )}>
                                        {count > 0 ? `${count} mods` : '—'}
                                        {selected > 0 && (
                                            <span className="ml-1 text-amber-400">• {selected}</span>
                                        )}
                                    </span>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Mod Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {tableLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 size={32} className="text-gray-500 mb-3 animate-spin" />
                            <p className="text-gray-500 font-mono text-sm">Loading mod definitions...</p>
                        </div>
                    ) : currentMods.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Shield size={32} className="text-gray-600 mb-3" />
                            <p className="text-gray-500 font-mono text-sm">
                                No {SLOT_TABS.find(t => t.key === activeSlot)?.label} mods found
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-5 gap-2">
                            {currentMods.map((mod) => {
                                const isSelected = selectedMods.has(mod.hash);

                                return (
                                    <button
                                        key={mod.hash}
                                        onClick={() => handleToggleMod(mod.hash)}
                                        className={cn(
                                            'group relative p-2 rounded-sm border transition-all flex flex-col items-center gap-1',
                                            isSelected
                                                ? 'border-rarity-legendary bg-rarity-legendary/10'
                                                : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                                        )}
                                        title={mod.description || mod.name}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-rarity-legendary rounded-full flex items-center justify-center">
                                                <Check size={10} className="text-white" />
                                            </div>
                                        )}

                                        <div className="w-10 h-10 rounded-sm overflow-hidden bg-black/50">
                                            {mod.icon ? (
                                                <img
                                                    src={`https://www.bungie.net${mod.icon}`}
                                                    alt={mod.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <Shield size={16} />
                                                </div>
                                            )}
                                        </div>

                                        <span className="text-[9px] font-bold font-rajdhani text-center truncate w-full leading-tight">
                                            {mod.name}
                                        </span>

                                        {mod.energyCost > 0 && (
                                            <span className="flex items-center gap-0.5 text-[8px] text-amber-400 font-mono">
                                                <Zap size={8} />
                                                {mod.energyCost}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-between items-center">
                    <p className="text-[10px] text-gray-600 font-mono">
                        Click mods to add/remove
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-rajdhani"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAccept}
                            className="px-6 py-2 rounded-sm text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-gray-200 font-rajdhani flex items-center gap-2"
                        >
                            <Check size={14} />
                            Apply Mods
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default ModPicker;
