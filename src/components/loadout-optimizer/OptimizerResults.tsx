/**
 * Optimizer Results Component
 * 
 * Displays optimization results with stat breakdowns.
 */

import React from 'react';
import { useOptimizerStore } from '@/store/optimizerStore';
import { STAT_NAMES, STAT_COLORS, ArmorStatHash, ARMOR_BUCKET_MAP } from '@/lib/loadout-optimizer/types';
import { BungieImage } from '@/components/ui/BungieImage';

export function OptimizerResults() {
    const { result, selectedSet, selectSet } = useOptimizerStore();

    if (!result || result.sets.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <div className="text-4xl mb-2">🔍</div>
                    <p>No sets found matching your criteria</p>
                    <p className="text-xs mt-2 text-gray-600">
                        Try lowering minimum stat requirements
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
                    <SelectedSetDetails set={selectedSet} />
                </div>
            )}
        </div>
    );
}

interface ResultCardProps {
    set: any;
    isSelected: boolean;
    onClick: () => void;
    rank: number;
}

function ResultCard({ set, isSelected, onClick, rank }: ResultCardProps) {
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
                                        item.isExotic ? 'text-[#f5dc56]' : 'text-gray-400'
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
                        {set.enabledStatsTotal} pts
                    </div>
                    <div className="text-xs text-gray-500">
                        {set.power} PL
                    </div>
                </div>
            </div>

            {/* Stat Bar */}
            <div className="mt-2 flex gap-1 h-3">
                {Object.entries(set.stats).map(([statHash, value]) => {
                    const color = STAT_COLORS[Number(statHash) as ArmorStatHash] || '#666';
                    return (
                        <div
                            key={statHash}
                            className="flex-1 rounded-sm transition-all"
                            style={{
                                backgroundColor: color,
                                opacity: value ? 1 : 0.2,
                                minWidth: value ? `${Math.min(100, (value / 100) * 100)}%` : '2px',
                            }}
                            title={`${STAT_NAMES[Number(statHash) as ArmorStatHash]}: ${value}`}
                        />
                    );
                })}
            </div>
        </button>
    );
}

function SelectedSetDetails({ set }: { set: any }) {
    return (
        <div>
            <div className="text-sm font-semibold text-white mb-2">Selected Set</div>
            
            {/* Stat breakdown */}
            <div className="grid grid-cols-6 gap-2 mb-3">
                {Object.entries(set.stats).map(([statHash, value]) => {
                    const name = STAT_NAMES[Number(statHash) as ArmorStatHash] || '?';
                    const color = STAT_COLORS[Number(statHash) as ArmorStatHash] || '#666';
                    return (
                        <div key={statHash} className="text-center">
                            <div
                                className="text-lg font-bold"
                                style={{ color }}
                            >
                                {value}
                            </div>
                            <div className="text-xs text-gray-500 uppercase">
                                {name.slice(0, 3)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Armor pieces */}
            <div className="flex gap-2 flex-wrap">
                {Object.entries(set.armor).map(([bucketHash, item]: [string, any]) => {
                    const slotName = ARMOR_BUCKET_MAP[Number(bucketHash)] || 'unknown';
                    return (
                        <div
                            key={bucketHash}
                            className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded text-xs"
                        >
                            <span className="text-gray-500 uppercase">{slotName}</span>
                            <span className={item.isExotic ? 'text-[#f5dc56]' : 'text-gray-300'}>
                                {item.name || 'Unknown'}
                            </span>
                            {item.isArtifice && <span className="text-[#A371C2]">+3</span>}
                        </div>
                    );
                })}
            </div>

            {/* Equip Button */}
            <button className="mt-3 px-4 py-2 bg-[#7af48b] hover:bg-[#6ae47a] text-black font-medium rounded">
                Equip This Loadout
            </button>
        </div>
    );
}

export default OptimizerResults;
