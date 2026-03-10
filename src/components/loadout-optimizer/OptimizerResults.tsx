/**
 * Optimizer Results Component — DIM-Style Inline Layout
 * 
 * Each set is displayed inline with:
 * - Stat summary row (Total + per-stat icons/values + power)
 * - Armor icons row (real Bungie images)
 * - Save/Equip buttons to the right
 */

import { useState } from 'react';
import { useOptimizerStore } from '@/store/optimizerStore';
import { 
    STAT_NAMES, STAT_COLORS, ARMOR_BUCKET_MAP,
    ARMOR_STAT_HASHES, ProcessArmorSet, ArmorBucketHash,
    ArmorStatHash, ProcessItem,
} from '@/lib/loadout-optimizer/types';

const BUNGIE_ROOT = 'https://www.bungie.net';

/** Stat icon paths from Destiny manifest (common stat icons) */
const STAT_ICONS: Partial<Record<ArmorStatHash, string>> = {
    2996146975: '/common/destiny2_content/icons/e26e0e93a9c22dc4f4c764323a1e6a0e.png', // Mobility
    392767087: '/common/destiny2_content/icons/202ecc1c6febeb6b97dafc856e863571.png',  // Resilience
    1943323491: '/common/destiny2_content/icons/128eee4ee7fc127851ab32eac6ca617f.png', // Recovery
    1735777505: '/common/destiny2_content/icons/ca62128071dc254fe75891c120541b30.png', // Discipline
    144602215: '/common/destiny2_content/icons/59732534ce7060dba681d1ba84c055a6.png',  // Intellect
    4244567218: '/common/destiny2_content/icons/c7eefc8abbaa586eeab79e962a79d6ad.png', // Strength
};

export function OptimizerResults({ characterId }: { characterId?: string }) {
    const { result, lastAction } = useOptimizerStore();

    if (!result || result.sets.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <div className="text-4xl mb-2">🔍</div>
                    <p>No sets found matching your criteria</p>
                    <p className="text-xs mt-2 text-gray-600">
                        Try lowering minimum stat requirements or changing exotic selection
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Results Summary Bar */}
            <div className="px-6 py-3 border-b border-void-border bg-black/20 flex items-center justify-between">
                <div>
                    <span className="text-lg font-semibold text-white">
                        {result.sets.length} sets found
                    </span>
                    <span className="text-xs text-gray-500 ml-3">
                        from {result.combos.toLocaleString()} combinations
                    </span>
                </div>
                {result.processInfo && (
                    <div className="text-xs text-gray-500">
                        Skipped: {result.processInfo.skipReasons.doubleExotic} (exotics),{' '}
                        {result.processInfo.skipReasons.insufficientStats} (stats)
                    </div>
                )}
            </div>

            {/* Success feedback */}
            {lastAction && (
                <div className="px-6 py-2 bg-[#7af48b]/10 border-b border-[#7af48b]/30 text-[#7af48b] text-sm flex items-center gap-2">
                    <span>✓</span> {lastAction}
                </div>
            )}

            {/* Inline Set List */}
            <div className="flex-1 overflow-y-auto">
                {result.sets.slice(0, 50).map((set, index) => (
                    <GeneratedSet
                        key={set.id}
                        set={set}
                        rank={index + 1}
                        characterId={characterId}
                    />
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// GeneratedSet — One full set rendered inline (stats + items + buttons)
// =============================================================================

function GeneratedSet({ set, rank, characterId }: { 
    set: ProcessArmorSet; 
    rank: number; 
    characterId?: string;
}) {
    const { createLoadoutFromSet } = useOptimizerStore();
    const [saving, setSaving] = useState(false);

    const handleSave = () => {
        if (!characterId) return;
        setSaving(true);
        createLoadoutFromSet(set, characterId);
        setTimeout(() => setSaving(false), 1500);
    };

    const totalStats = ARMOR_STAT_HASHES.reduce((sum, h) => sum + (set.stats[h] ?? 0), 0);
    const hasAutoMods = set.statMods.length > 0;

    return (
        <div className="border-b border-white/10 px-6 pt-3 pb-4 hover:bg-white/[0.02] transition-colors">
            {/* Row 1: Stat summary */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
                {/* Total */}
                <span className="font-bold text-white text-sm mr-1">
                    Total: {totalStats}
                </span>

                {/* Per-stat values with icons */}
                {ARMOR_STAT_HASHES.map((statHash) => {
                    const value = set.stats[statHash] ?? 0;
                    const armorOnly = set.armorStats?.[statHash] ?? value;
                    const modBonus = value - armorOnly;
                    const color = STAT_COLORS[statHash] || '#aaa';
                    const iconPath = STAT_ICONS[statHash];
                    
                    return (
                        <span 
                            key={statHash}
                            className="flex items-center gap-0.5 text-sm"
                            title={`${STAT_NAMES[statHash]}: ${value}${modBonus > 0 ? ` (${armorOnly} + ${modBonus} from mods)` : ''}`}
                        >
                            {iconPath ? (
                                <img
                                    src={`${BUNGIE_ROOT}${iconPath}`}
                                    alt=""
                                    className="w-4 h-4 opacity-80"
                                />
                            ) : (
                                <span style={{ color }} className="text-xs">●</span>
                            )}
                            <span className="font-bold" style={{ color }}>
                                {value}
                            </span>
                        </span>
                    );
                })}

                {/* Power */}
                <span className="text-[#f5dc56] text-sm ml-1 font-bold">
                    ★{set.power}
                </span>

                {/* Auto mods indicator */}
                {hasAutoMods && (
                    <span className="text-[#7af48b] text-xs ml-1">
                        +{set.statMods.length} mods
                    </span>
                )}
            </div>

            {/* Row 2: Armor items + buttons */}
            <div className="flex items-start gap-4">
                {/* Armor icons */}
                <div className="flex gap-3.5 flex-1">
                    {ARMOR_BUCKET_ORDER.map((bucketHash) => {
                        const item = set.armor[bucketHash] as ProcessItem | undefined;
                        if (!item) return null;
                        return (
                            <GeneratedSetItem
                                key={bucketHash}
                                item={item}
                                bucketHash={bucketHash}
                            />
                        );
                    })}
                </div>

                {/* Action buttons (stacked vertically) */}
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <button
                        onClick={handleSave}
                        disabled={!characterId || saving}
                        className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                            saving
                                ? 'border-[#7af48b]/30 bg-[#7af48b]/10 text-[#7af48b]'
                                : characterId
                                    ? 'border-void-border bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/30'
                                    : 'border-void-border bg-white/5 text-gray-600 cursor-not-allowed'
                        }`}
                    >
                        {saving ? '✓ Saved!' : 'Save Loadout'}
                    </button>
                    <button
                        disabled={!characterId}
                        className={`px-3 py-1.5 text-xs rounded border transition-colors ${
                            characterId
                                ? 'border-void-border bg-white/5 text-gray-300 hover:bg-white/10 hover:border-white/30'
                                : 'border-void-border bg-white/5 text-gray-600 cursor-not-allowed'
                        }`}
                        onClick={handleSave}
                    >
                        Equip
                    </button>
                </div>
            </div>
        </div>
    );
}

// Ordered bucket hashes for display
const ARMOR_BUCKET_ORDER: ArmorBucketHash[] = [
    3448274439, // Helmet
    3551918588, // Gauntlets
    14239492,   // ChestArmor
    20886954,   // LegArmor
    1585787867, // ClassArmor
];

// =============================================================================
// GeneratedSetItem — Single armor piece with icon + mods
// =============================================================================

function GeneratedSetItem({ item, bucketHash }: { 
    item: ProcessItem; 
    bucketHash: ArmorBucketHash 
}) {
    const slotName = ARMOR_BUCKET_MAP[bucketHash] || 'unknown';
    const iconSrc = item.icon ? `${BUNGIE_ROOT}${item.icon}` : null;

    return (
        <div className="flex flex-col items-center gap-1">
            {/* Item icon */}
            <div
                className={`relative w-12 h-12 rounded overflow-hidden ${
                    item.isExotic 
                        ? 'ring-2 ring-[#f5dc56]/70' 
                        : 'ring-1 ring-white/20'
                }`}
                title={`${item.name || slotName} — ${item.power} PL${item.isArtifice ? ' (Artifice)' : ''}`}
            >
                {iconSrc ? (
                    <img
                        src={iconSrc}
                        alt={item.name || slotName}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center text-xs ${
                        item.isExotic ? 'bg-[#f5dc56]/20 text-[#f5dc56]' : 'bg-white/10 text-gray-500'
                    }`}>
                        {item.isExotic ? '✦' : '○'}
                    </div>
                )}

                {/* Exotic diamond overlay */}
                {item.isExotic && (
                    <div className="absolute top-0 right-0 w-3 h-3 bg-[#f5dc56] flex items-center justify-center">
                        <span className="text-black text-[6px] font-bold">E</span>
                    </div>
                )}

                {/* Artifice indicator */}
                {item.isArtifice && (
                    <div className="absolute bottom-0 left-0 px-0.5 bg-[#A371C2]/80 text-white text-[8px] font-bold">
                        A
                    </div>
                )}

                {/* Power badge */}
                <div className="absolute bottom-0 right-0 bg-black/70 text-[9px] text-gray-300 px-0.5">
                    {item.power}
                </div>
            </div>

            {/* Slot label */}
            <span className="text-[9px] text-gray-500 uppercase tracking-wide">
                {slotName}
            </span>
        </div>
    );
}

export default OptimizerResults;
