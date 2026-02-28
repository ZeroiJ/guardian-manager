/**
 * ModPicker - Select armor mods for loadout
 * 
 * A drawer to select armor mods grouped by category with energy tracking.
 * Loads the FULL DestinyInventoryItemDefinition table from ManifestManager
 * to discover all available armor mods (not just currently equipped ones).
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
};

type ModCategory = {
    name: string;
    identifier: string;
    mods: ModEntry[];
};

/**
 * Map plugCategoryIdentifier patterns to human-readable names.
 * The Bungie API uses "enhancements.v2.*" identifiers for armor mods.
 * We match partial strings to group mods into categories.
 */
const CATEGORY_DISPLAY: Array<{ match: string; name: string; priority: number }> = [
    { match: 'enhancements.v2.head', name: 'Helmet Mods', priority: 1 },
    { match: 'enhancements.v2.arms', name: 'Gauntlet Mods', priority: 2 },
    { match: 'enhancements.v2.chest', name: 'Chest Mods', priority: 3 },
    { match: 'enhancements.v2.legs', name: 'Leg Mods', priority: 4 },
    { match: 'enhancements.v2.class', name: 'Class Item Mods', priority: 5 },
    { match: 'enhancements.v2.general', name: 'General Mods', priority: 6 },
    { match: 'enhancements.raid', name: 'Raid Mods', priority: 7 },
    { match: 'enhancements.activity', name: 'Activity Mods', priority: 8 },
    { match: 'enhancements.season_', name: 'Seasonal Mods', priority: 9 },
    { match: 'enhancements.v2', name: 'Armor Mods', priority: 10 },
    { match: 'enhancements', name: 'Other Mods', priority: 99 },
];

function getCategoryName(plugCategoryIdentifier: string): { name: string; priority: number } {
    const id = plugCategoryIdentifier.toLowerCase();
    for (const cat of CATEGORY_DISPLAY) {
        if (id.includes(cat.match)) {
            return { name: cat.name, priority: cat.priority };
        }
    }
    return { name: 'Other Mods', priority: 99 };
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

    // Discover all armor mods from the full manifest table
    const modCategories = useMemo((): ModCategory[] => {
        if (!fullTable) return [];

        const categoryMap = new Map<string, { name: string; priority: number; mods: ModEntry[] }>();

        for (const [hash, def] of Object.entries(fullTable)) {
            const hashNum = parseInt(hash);
            if (isNaN(hashNum)) continue;

            // Armor mods have itemType === 19 and a plugCategoryIdentifier containing "enhancements"
            if (def?.itemType !== 19) continue;
            const plugCategoryId = def?.plug?.plugCategoryIdentifier;
            if (!plugCategoryId || !plugCategoryId.toLowerCase().includes('enhancements')) continue;

            // Skip empty/placeholder entries
            const name = def?.displayProperties?.name;
            if (!name || name === '' || name === 'Empty Mod Socket' || name.toLowerCase().includes('deprecated')) continue;

            // Filter by class if the mod has a class restriction
            // classType: 0=Titan, 1=Hunter, 2=Warlock, 3=Unknown/Any
            if (def.classType != null && def.classType >= 0 && def.classType <= 2 && characterClass >= 0) {
                if (def.classType !== characterClass) continue;
            }

            const { name: catName, priority } = getCategoryName(plugCategoryId);
            const catKey = catName;

            if (!categoryMap.has(catKey)) {
                categoryMap.set(catKey, { name: catName, priority, mods: [] });
            }

            categoryMap.get(catKey)!.mods.push({
                hash: hashNum,
                name,
                icon: def.displayProperties?.icon,
                energyCost: def.plug?.energyCost?.energyCost || 0,
                description: def.displayProperties?.description,
            });
        }

        // Sort categories by priority, mods alphabetically within each
        return Array.from(categoryMap.values())
            .sort((a, b) => a.priority - b.priority)
            .map(cat => ({
                ...cat,
                identifier: cat.name,
                mods: cat.mods.sort((a, b) => a.name.localeCompare(b.name)),
            }));
    }, [fullTable, characterClass]);

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
        // Group selected mods by bucket
        const newModsByBucket: Record<number, number[]> = {};

        // For simplicity, assign all mods to chest armor bucket
        // In a full implementation, we'd let user choose which bucket gets which mod
        newModsByBucket[BucketHashes.ChestArmor] = Array.from(selectedMods);

        onAccept(newModsByBucket);
        onClose();
    }, [selectedMods, onAccept, onClose]);

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div
                className="w-[700px] max-h-[80vh] bg-[#0a0a0a] border border-white/15 rounded-lg shadow-2xl flex flex-col overflow-hidden"
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

                {/* Mod Categories */}
                <div className="flex-1 overflow-y-auto p-4">
                    {tableLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 size={32} className="text-gray-500 mb-3 animate-spin" />
                            <p className="text-gray-500 font-mono text-sm">Loading mod definitions...</p>
                        </div>
                    ) : modCategories.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Shield size={32} className="text-gray-600 mb-3" />
                            <p className="text-gray-500 font-mono text-sm">No mods found</p>
                            <p className="text-gray-600 font-mono text-xs mt-1">
                                Make sure you've unlocked armor mods
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {modCategories.map((category) => (
                                <div key={category.identifier} className="space-y-2">
                                    <h3 className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest">
                                        {category.name}
                                        <span className="ml-2 text-gray-700 font-mono font-normal">
                                            ({category.mods.length})
                                        </span>
                                    </h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {category.mods.map((mod) => {
                                            const isSelected = selectedMods.has(mod.hash);

                                            return (
                                                <button
                                                    key={mod.hash}
                                                    onClick={() => handleToggleMod(mod.hash)}
                                                    className={cn(
                                                        'group relative p-2 rounded-sm border transition-all flex flex-col items-center gap-1',
                                                        isSelected
                                                            ? 'border-rarity-legendary bg-rarity-legendary/10'
                                                            : 'border-white/10 bg-white/[0.02] hover:border-white/20'
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

                                                    <span className="text-[9px] font-bold font-rajdhani text-center truncate w-full">
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
                                </div>
                            ))}
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
