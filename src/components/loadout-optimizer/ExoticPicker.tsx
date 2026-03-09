/**
 * Exotic Picker Component
 * 
 * Allows the user to select which exotic to build around.
 * Three modes: No Preference, No Exotic, Any Exotic, or a specific exotic.
 * 
 * Based on DIM's ExoticPicker.tsx
 */

import { useState, useMemo } from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { BucketHashes } from '@/lib/destiny-constants';
import { LOCKED_EXOTIC_NO_EXOTIC, LOCKED_EXOTIC_ANY_EXOTIC } from '@/store/optimizerStore';

interface ExoticInfo {
    hash: number;
    name: string;
    icon: string;
    bucket: number;
    bucketName: string;
}

const ARMOR_BUCKETS: Record<number, string> = {
    [BucketHashes.Helmet]: 'Helmet',
    [BucketHashes.Gauntlets]: 'Gauntlets',
    [BucketHashes.ChestArmor]: 'Chest',
    [BucketHashes.LegArmor]: 'Legs',
    [BucketHashes.ClassArmor]: 'Class',
};

interface ExoticPickerProps {
    classType: number;
    lockedExoticHash: number | undefined;
    onSelect: (hash: number | undefined) => void;
    onClose: () => void;
}

export function ExoticPicker({ classType, lockedExoticHash, onSelect, onClose }: ExoticPickerProps) {
    const [search, setSearch] = useState('');
    const { items, manifest } = useInventoryStore();

    // Find all exotic armor for the selected class
    const exotics = useMemo(() => {
        const seen = new Set<number>();
        const result: ExoticInfo[] = [];

        for (const item of items) {
            if (!item.itemInstanceId) continue;
            const def = manifest[item.itemHash];
            if (!def) continue;

            const tierType = (def as any).inventory?.tierType;
            if (tierType !== 6) continue; // Not exotic

            const bucketHash = item.bucketHash || (def as any).inventory?.bucketTypeHash;
            if (!ARMOR_BUCKETS[bucketHash]) continue; // Not armor

            const classType2 = (def as any).classType;
            if (classType2 !== classType && classType2 !== 3) continue; // Wrong class (3 = any class)

            if (seen.has(item.itemHash)) continue;
            seen.add(item.itemHash);

            result.push({
                hash: item.itemHash,
                name: (def as any).displayProperties?.name || 'Unknown Exotic',
                icon: (def as any).displayProperties?.icon || '',
                bucket: bucketHash,
                bucketName: ARMOR_BUCKETS[bucketHash] || 'Unknown',
            });
        }

        // Sort by bucket then name
        result.sort((a, b) => {
            const bucketOrder = Object.keys(ARMOR_BUCKETS).map(Number);
            const aIdx = bucketOrder.indexOf(a.bucket);
            const bIdx = bucketOrder.indexOf(b.bucket);
            if (aIdx !== bIdx) return aIdx - bIdx;
            return a.name.localeCompare(b.name);
        });

        return result;
    }, [items, manifest, classType]);

    // Filter by search
    const filtered = useMemo(() => {
        if (!search) return exotics;
        const q = search.toLowerCase();
        return exotics.filter(e => e.name.toLowerCase().includes(q));
    }, [exotics, search]);

    // Group by bucket
    const grouped = useMemo(() => {
        const groups: Record<string, ExoticInfo[]> = {};
        for (const exotic of filtered) {
            const key = exotic.bucketName;
            if (!groups[key]) groups[key] = [];
            groups[key].push(exotic);
        }
        return groups;
    }, [filtered]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0d0d14] border border-void-border rounded-lg w-[480px] max-h-[80vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-void-border">
                    <div className="flex items-center justify-between mb-3">
                        <h2 className="text-lg font-semibold text-white">Choose an Exotic</h2>
                        <button 
                            onClick={onClose} 
                            className="text-gray-500 hover:text-white text-lg"
                        >
                            ✕
                        </button>
                    </div>
                    <input
                        type="text"
                        placeholder="Search exotics..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        className="w-full px-3 py-2 bg-black/40 border border-void-border rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#7af48b]/50"
                    />
                </div>

                {/* Special Options */}
                <div className="p-3 border-b border-void-border flex gap-2">
                    <SpecialOption
                        label="No Preference"
                        description="Any combination"
                        icon="🔓"
                        selected={lockedExoticHash === undefined}
                        onClick={() => { onSelect(undefined); onClose(); }}
                    />
                    <SpecialOption
                        label="Any Exotic"
                        description="Require 1 exotic"
                        icon="✦"
                        selected={lockedExoticHash === LOCKED_EXOTIC_ANY_EXOTIC}
                        onClick={() => { onSelect(LOCKED_EXOTIC_ANY_EXOTIC); onClose(); }}
                    />
                    <SpecialOption
                        label="No Exotic"
                        description="Legendaries only"
                        icon="🚫"
                        selected={lockedExoticHash === LOCKED_EXOTIC_NO_EXOTIC}
                        onClick={() => { onSelect(LOCKED_EXOTIC_NO_EXOTIC); onClose(); }}
                    />
                </div>

                {/* Exotic Grid */}
                <div className="flex-1 overflow-y-auto p-3">
                    {Object.entries(grouped).map(([bucketName, exotics]) => (
                        <div key={bucketName} className="mb-4">
                            <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                                {bucketName}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {exotics.map((exotic) => (
                                    <button
                                        key={exotic.hash}
                                        onClick={() => { onSelect(exotic.hash); onClose(); }}
                                        className={`flex items-center gap-2 p-2 rounded border transition-colors text-left ${
                                            lockedExoticHash === exotic.hash
                                                ? 'border-[#f5dc56] bg-[#f5dc56]/10'
                                                : 'border-void-border hover:border-[#f5dc56]/50 bg-white/5'
                                        }`}
                                    >
                                        {exotic.icon ? (
                                            <img
                                                src={`https://www.bungie.net${exotic.icon}`}
                                                alt=""
                                                className="w-10 h-10 rounded"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded bg-[#f5dc56]/20 flex items-center justify-center text-[#f5dc56]">
                                                ✦
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <div className="text-sm text-white truncate">
                                                {exotic.name}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}

                    {filtered.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            No exotics found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SpecialOption({ 
    label, description, icon, selected, onClick 
}: { 
    label: string; description: string; icon: string; selected: boolean; onClick: () => void 
}) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 p-2 rounded border text-center transition-colors ${
                selected
                    ? 'border-[#7af48b] bg-[#7af48b]/10'
                    : 'border-void-border hover:border-white/30 bg-white/5'
            }`}
        >
            <div className="text-lg mb-1">{icon}</div>
            <div className="text-xs font-semibold text-white">{label}</div>
            <div className="text-[10px] text-gray-500">{description}</div>
        </button>
    );
}

export default ExoticPicker;
