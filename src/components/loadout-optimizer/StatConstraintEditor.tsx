/**
 * Stat Constraint Editor Component
 * 
 * UI for setting minimum and maximum stat thresholds for optimization.
 */

import React from 'react';
import { useOptimizerStore } from '@/store/optimizerStore';
import { STAT_NAMES, STAT_COLORS, ArmorStatHash } from '@/lib/loadout-optimizer/types';

export function StatConstraintEditor() {
    const { constraints, updateConstraint, toggleConstraintIgnored } = useOptimizerStore();

    const handleMinChange = (statHash: number, value: number) => {
        updateConstraint(statHash, { min: value });
    };

    const handleMaxChange = (statHash: number, value: number) => {
        updateConstraint(statHash, { max: value });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    Stat Requirements
                </label>
                <span className="text-xs text-gray-600">Min → Max</span>
            </div>

            <div className="space-y-3">
                {constraints.map((constraint) => {
                    const statName = STAT_NAMES[constraint.statHash as ArmorStatHash] || 'Unknown';
                    const color = STAT_COLORS[constraint.statHash as ArmorStatHash] || '#fff';
                    const isIgnored = constraint.ignored;

                    return (
                        <div
                            key={constraint.statHash}
                            className={`transition-opacity ${isIgnored ? 'opacity-40' : ''}`}
                        >
                            <div className="flex items-center justify-between mb-1">
                                <button
                                    onClick={() => toggleConstraintIgnored(constraint.statHash)}
                                    className="flex items-center gap-2 text-sm font-medium hover:opacity-80"
                                    style={{ color }}
                                    title={isIgnored ? 'Click to enable' : 'Click to ignore'}
                                >
                                    <span className={`w-2 h-2 rounded-full ${isIgnored ? 'bg-gray-600' : ''}`}
                                        style={{ backgroundColor: isIgnored ? undefined : color }}
                                    />
                                    {statName}
                                </button>
                                <div className="text-xs text-gray-500 font-mono">
                                    {constraint.min}{!isIgnored && ` → ${constraint.max}`}
                                </div>
                            </div>

                            {!isIgnored && (
                                <div className="space-y-1">
                                    {/* Min slider */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600 w-8">Min</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={constraint.min}
                                            onChange={(e) => handleMinChange(constraint.statHash, Number(e.target.value))}
                                            className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                            style={{ accentColor: color }}
                                        />
                                        <span className="text-xs text-gray-500 w-6 text-right">{constraint.min}</span>
                                    </div>

                                    {/* Max slider */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-600 w-8">Max</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={constraint.max}
                                            onChange={(e) => handleMaxChange(constraint.statHash, Number(e.target.value))}
                                            className="flex-1 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                                            style={{ accentColor: color }}
                                        />
                                        <span className="text-xs text-gray-500 w-6 text-right">{constraint.max}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Quick Presets */}
            <div className="pt-4 border-t border-void-border">
                <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2 block">
                    Quick Presets
                </label>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => {
                            const store = useOptimizerStore.getState();
                            store.setConstraints(
                                store.constraints.map(c => ({
                                    ...c,
                                    min: c.statHash === 392767087 || c.statHash === 1943323491 ? 100 : 0,
                                    max: 100,
                                    ignored: false,
                                }))
                            );
                        }}
                        className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-gray-300"
                    >
                        100/100
                    </button>
                    <button
                        onClick={() => {
                            const store = useOptimizerStore.getState();
                            store.setConstraints(
                                store.constraints.map(c => ({
                                    ...c,
                                    min: c.statHash === 1943323491 ? 100 : 30,
                                    max: 100,
                                    ignored: false,
                                }))
                            );
                        }}
                        className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-gray-300"
                    >
                        Rec 100
                    </button>
                    <button
                        onClick={() => {
                            const store = useOptimizerStore.getState();
                            store.setConstraints(
                                store.constraints.map(c => ({
                                    ...c,
                                    min: c.statHash === 392767087 ? 100 : 0,
                                    max: 100,
                                    ignored: false,
                                }))
                            );
                        }}
                        className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-gray-300"
                    >
                        Res 100
                    </button>
                    <button
                        onClick={() => {
                            const store = useOptimizerStore.getState();
                            store.setConstraints(
                                store.constraints.map(c => ({
                                    ...c,
                                    min: 30,
                                    max: 100,
                                    ignored: false,
                                }))
                            );
                        }}
                        className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-gray-300"
                    >
                        30+ All
                    </button>
                </div>
            </div>
        </div>
    );
}

export default StatConstraintEditor;
