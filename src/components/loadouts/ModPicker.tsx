/**
 * ModPicker - Select armor mods for loadout
 * 
 * A drawer to select armor mods grouped by category with energy tracking
 */
import { useState, useMemo, useCallback } from 'react';
import { X, Check, Zap, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/store/useInventoryStore';
import { SocketCategoryHashes, BucketHashes } from '@/lib/destiny-constants';
import { createPortal } from 'react-dom';

interface ModPickerProps {
    modsByBucket: Record<number, number[]>;
    characterClass: number;
    onAccept: (modsByBucket: Record<number, number[]>) => void;
    onClose: () => void;
}

type ModCategory = {
    name: string;
    hash: number;
    mods: Array<{
        hash: number;
        name: string;
        icon?: string;
        energyCost: number;
        description?: string;
    }>;
};

// Categories of armor mods
const MOD_CATEGORIES = [
    { name: 'Combat Mods', hash: 590099826 },       // ArmorMods
    { name: 'Resilience Mods', hash: 4068822581 },
    { name: 'Recovery Mods', hash: 4002513868 },
    { name: 'Discipline Mods', hash: 2614457671 },
    { name: 'Intellect Mods', hash: 4178004944 },
    { name: 'Strength Mods', hash: 1364784175 },
    { name: 'Armor Charge', hash: 3124756063 },
    { name: 'Artifice', hash: 4173924323 },
];

// Bucket to mod category mapping
const BUCKET_MOD_SETS: Record<number, number[]> = {
    [BucketHashes.Helmet]: [590099826, 4068822581, 3124756063],
    [BucketHashes.Gauntlets]: [590099826, 2614457671, 3124756063],
    [BucketHashes.ChestArmor]: [590099826, 4002513868, 3124756063],
    [BucketHashes.LegArmor]: [590099826, 4241085061, 3124756063], // Using another as proxy
    [BucketHashes.ClassArmor]: [590099826, 4173924323],
};

export function ModPicker({
    modsByBucket,
    characterClass,
    onAccept,
    onClose,
}: ModPickerProps) {
    const manifest = useInventoryStore((s) => s.manifest);

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

    const [activeBucket, setActiveBucket] = useState<number>(BucketHashes.ChestArmor);

    // Find available mods from inventory that are unlocked
    const availableMods = useMemo(() => {
        const inventory = useInventoryStore.getState();
        const mods: ModCategory[] = [];

        // For now, get mods from manifest - in a real implementation,
        // we'd filter by what's unlocked on the character
        for (const category of MOD_CATEGORIES) {
            const categoryMods: typeof mods[0]['mods'] = [];

            // Search manifest for mods in this category
            for (const [hash, def] of Object.entries(manifest)) {
                const hashNum = parseInt(hash);
                if (isNaN(hashNum)) continue;

                // Check if this is a valid mod definition
                if (def?.itemType === 19 && def?.plug?.plugCategoryHash === category.hash) {
                    categoryMods.push({
                        hash: hashNum,
                        name: def.displayProperties?.name || 'Unknown',
                        icon: def.displayProperties?.icon,
                        energyCost: def.plug?.energyCost?.energyCost || 0,
                        description: def.displayProperties?.description,
                    });
                }
            }

            if (categoryMods.length > 0) {
                mods.push({
                    name: category.name,
                    hash: category.hash,
                    mods: categoryMods,
                });
            }
        }

        return mods;
    }, [manifest]);

    // Calculate total energy used
    const totalEnergy = useMemo(() => {
        let energy = 0;
        for (const modHash of selectedMods) {
            const def = manifest[modHash];
            if (def?.plug?.energyCost?.energyCost) {
                energy += def.plug.energyCost.energyCost;
            }
        }
        return energy;
    }, [selectedMods, manifest]);

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
                    {availableMods.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Shield size={32} className="text-gray-600 mb-3" />
                            <p className="text-gray-500 font-mono text-sm">No mods found</p>
                            <p className="text-gray-600 font-mono text-xs mt-1">
                                Make sure you've unlocked armor mods
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {availableMods.map((category) => (
                                <div key={category.hash} className="space-y-2">
                                    <h3 className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest">
                                        {category.name}
                                    </h3>
                                    <div className="grid grid-cols-4 gap-2">
                                        {category.mods.map((mod) => {
                                            const isSelected = selectedMods.has(mod.hash);
                                            const def = manifest[mod.hash];
                                            
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
