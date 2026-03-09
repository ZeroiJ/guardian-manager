/**
 * Optimizer Results Component
 * 
 * Displays optimization results with stat breakdowns and equip button.
 */

import { useState } from 'react';
import { useOptimizerStore } from '@/store/optimizerStore';
import { 
    STAT_NAMES, STAT_COLORS, ARMOR_BUCKET_MAP,
    ARMOR_STAT_HASHES, ProcessArmorSet, ArmorBucketHash,
} from '@/lib/loadout-optimizer/types';

export function OptimizerResults({ characterId }: { characterId?: string }) {
    const { result, selectedSet, selectSet, lastAction } = useOptimizerStore();

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
            {/* Results Summary */}
            <div className="p-4 border-b border-void-border bg-black/20">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-lg font-semibold text-white">
                            {result.sets.length} sets found
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
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
            </div>

            {/* Success feedback */}
            {lastAction && (
                <div className="px-4 py-2 bg-[#7af48b]/10 border-b border-[#7af48b]/30 text-[#7af48b] text-sm flex items-center gap-2">
                    <span>✓</span> {lastAction}
                </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid gap-3">
                    {result.sets.slice(0, 50).map((set, index) => (
                        <ResultCard
                            key={set.id}
                            set={set}
                            isSelected={selectedSet?.id === set.id}
                            onClick={() => selectSet(set)}
                            rank={index + 1}
                        />
                    ))}
                </div>
            </div>

            {/* Selected Set Details */}
            {selectedSet && (
                <div className="p-4 border-t border-void-border bg-black/30">
                    <SelectedSetDetails 
                        set={selectedSet} 
                        characterId={characterId}
                    />
                </div>
            )}
        </div>
    );
}

interface ResultCardProps {
    set: ProcessArmorSet;
    isSelected: boolean;
    onClick: () => void;
    rank: number;
}

function ResultCard({ set, isSelected, onClick, rank }: ResultCardProps) {
    const hasAutoMods = set.statMods.length > 0;

    return (
        <button
            onClick={onClick}
            className={`w-full p-3 rounded border text-left transition-colors ${
                isSelected
                    ? 'border-[#7af48b] bg-[#7af48b]/10'
                    : 'border-void-border hover:border-white/30 bg-white/5'
            }`}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${rank <= 3 ? 'text-[#f5dc56]' : 'text-gray-500'}`}>
                        #{rank}
                    </span>
                    <div>
                        <div className="flex gap-1">
                            {Object.values(set.armor).map((item: any, idx: number) => (
                                <div
                                    key={idx}
                                    className={`w-8 h-8 rounded bg-black/40 flex items-center justify-center text-xs ${
                                        item.isExotic ? 'text-[#f5dc56] border border-[#f5dc56]/30' : 'text-gray-400'
                                    }`}
                                    title={item.name}
                                >
                                    {item.isExotic ? '✦' : '○'}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="text-sm font-bold text-white">
                        T{Math.floor(set.enabledStatsTotal / 10)}
                        <span className="text-xs text-gray-500 ml-1">({set.enabledStatsTotal})</span>
                    </div>
                    <div className="text-xs text-gray-500">
                        {set.power} PL
                        {hasAutoMods && (
                            <span className="text-[#7af48b] ml-1">+{set.statMods.length} mods</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Stat Bar */}
            <div className="mt-2 flex gap-1 h-3">
                {ARMOR_STAT_HASHES.map((statHash) => {
                    const value = set.stats[statHash] ?? 0;
                    const armorOnly = set.armorStats?.[statHash] ?? value;
                    const color = STAT_COLORS[statHash] || '#666';
                    const hasMod = value > armorOnly;
                    return (
                        <div
                            key={statHash}
                            className="flex-1 rounded-sm relative overflow-hidden"
                            title={`${STAT_NAMES[statHash]}: ${value}${hasMod ? ` (armor: ${armorOnly}, +${value - armorOnly} from mods)` : ''}`}
                        >
                            {/* Base bar */}
                            <div
                                className="absolute inset-0 rounded-sm"
                                style={{
                                    backgroundColor: color,
                                    opacity: 0.3,
                                }}
                            />
                            {/* Filled portion */}
                            <div
                                className="absolute top-0 left-0 h-full rounded-sm"
                                style={{
                                    backgroundColor: color,
                                    width: `${Math.min(100, (value / 100) * 100)}%`,
                                    opacity: value ? 1 : 0.2,
                                }}
                            />
                        </div>
                    );
                })}
            </div>
        </button>
    );
}

function SelectedSetDetails({ set, characterId }: { set: ProcessArmorSet; characterId?: string }) {
    const { createLoadoutFromSet } = useOptimizerStore();
    const [saving, setSaving] = useState(false);

    const handleEquip = () => {
        if (!characterId) return;
        setSaving(true);
        createLoadoutFromSet(set, characterId);
        setTimeout(() => setSaving(false), 1000);
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-white">
                    Selected Set — T{Math.floor(set.enabledStatsTotal / 10)}
                </div>
                <div className="text-xs text-gray-500">
                    {set.power} Power
                </div>
            </div>
            
            {/* Stat breakdown with armor-only vs total */}
            <div className="grid grid-cols-6 gap-2 mb-3">
                {ARMOR_STAT_HASHES.map((statHash) => {
                    const total = set.stats[statHash] ?? 0;
                    const armorOnly = set.armorStats?.[statHash] ?? total;
                    const modBonus = total - armorOnly;
                    const name = STAT_NAMES[statHash] || '?';
                    const color = STAT_COLORS[statHash] || '#666';
                    return (
                        <div key={statHash} className="text-center">
                            <div
                                className="text-lg font-bold"
                                style={{ color }}
                            >
                                {total}
                            </div>
                            {modBonus > 0 && (
                                <div className="text-[10px] text-[#7af48b]">
                                    +{modBonus}
                                </div>
                            )}
                            <div className="text-xs text-gray-500 uppercase">
                                {name.slice(0, 3)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Auto stat mods indicator */}
            {set.statMods.length > 0 && (
                <div className="mb-3 flex items-center gap-2 px-2 py-1 bg-[#7af48b]/10 rounded text-xs text-[#7af48b]">
                    <span>⚡</span>
                    <span>{set.statMods.length} stat mod{set.statMods.length > 1 ? 's' : ''} auto-assigned</span>
                </div>
            )}

            {/* Armor pieces */}
            <div className="flex gap-2 flex-wrap">
                {Object.entries(set.armor).map(([bucketHash, item]: [string, any]) => {
                    const slotName = ARMOR_BUCKET_MAP[Number(bucketHash) as ArmorBucketHash] || 'unknown';
                    return (
                        <div
                            key={bucketHash}
                            className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded text-xs"
                        >
                            <span className="text-gray-500 uppercase">{slotName}</span>
                            <span className={item.isExotic ? 'text-[#f5dc56]' : 'text-gray-300'}>
                                {item.name || 'Unknown'}
                            </span>
                            {item.isArtifice && <span className="text-[#A371C2]">◆</span>}
                        </div>
                    );
                })}
            </div>

            {/* Equip Button */}
            <button 
                onClick={handleEquip}
                disabled={!characterId || saving}
                className={`mt-3 w-full px-4 py-2 font-medium rounded transition-colors ${
                    saving 
                        ? 'bg-[#7af48b]/50 text-black/50 cursor-wait' 
                        : characterId 
                            ? 'bg-[#7af48b] hover:bg-[#6ae47a] text-black' 
                            : 'bg-white/10 text-gray-500 cursor-not-allowed'
                }`}
            >
                {saving ? '✓ Loadout Saved!' : 'Save as Loadout'}
            </button>
        </div>
    );
}

export default OptimizerResults;
