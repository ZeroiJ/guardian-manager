/**
 * Loadout Optimizer Page
 * 
 * Armor optimization tool for finding the best stat distributions.
 */

import React, { useEffect, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useOptimizerStore } from '@/store/optimizerStore';
import { useArmorFilter } from '@/hooks/useArmorFilter';
import { CLASS_NAMES, ClassIcon } from '@/components/ui/DestinyIcons';
import { StatConstraintEditor } from '@/components/loadout-optimizer/StatConstraintEditor';
import { OptimizerResults } from '@/components/loadout-optimizer/OptimizerResults';
import { BucketHashes } from '@/lib/destiny-constants';

export function LoadoutOptimizer() {
    const [selectedClass, setSelectedClass] = useState(0);
    
    const {
        isRunning,
        progress,
        result,
        error,
        selectedSet,
        runOptimization,
        cancelOptimization,
        setClassType,
        anyExotic,
        setAnyExotic,
    } = useOptimizerStore();

    // Get filtered armor items
    const { items, totalCount } = useArmorFilter({
        classType: selectedClass,
        maxItemsPerSlot: 30,
    });

    // Check if we have items to optimize
    const hasItems = Object.values(items).some(arr => arr.length > 0);

    const handleClassChange = (classType: number) => {
        setSelectedClass(classType);
        setClassType(classType);
    };

    const handleOptimize = () => {
        if (hasItems) {
            runOptimization(items);
        }
    };

    return (
        <div className="min-h-screen bg-void-bg text-white">
            <Navigation />
            
            <div className="flex h-[calc(100vh-65px)]">
                {/* Sidebar - Settings */}
                <aside className="w-80 border-r border-void-border flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-void-border">
                        <h1 className="text-xl font-rajdhani font-semibold text-white">
                            Loadout Optimizer
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Find the best armor combinations
                        </p>
                    </div>

                    {/* Class Selector */}
                    <div className="p-4 border-b border-void-border">
                        <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                            Character Class
                        </label>
                        <div className="flex gap-2 mt-2">
                            {[0, 1, 2].map((classType) => (
                                <button
                                    key={classType}
                                    onClick={() => handleClassChange(classType)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded transition-colors ${
                                        selectedClass === classType
                                            ? 'bg-white/10 text-white'
                                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                >
                                    <ClassIcon classType={classType} size={18} />
                                    <span className="text-sm">{CLASS_NAMES[classType]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Armor Count */}
                    <div className="px-4 py-2 bg-black/20 text-xs text-gray-500">
                        {totalCount} armor pieces ({hasItems ? 'ready' : 'loading...'})
                    </div>

                    {/* Stat Constraints */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <StatConstraintEditor />
                    </div>

                    {/* Options */}
                    <div className="p-4 border-t border-void-border space-y-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={anyExotic}
                                onChange={(e) => setAnyExotic(e.target.checked)}
                                className="w-4 h-4 rounded bg-white/10 border-white/20"
                            />
                            <span className="text-sm text-gray-300">
                                Allow multiple exotics
                            </span>
                        </label>

                        <button
                            onClick={isRunning ? cancelOptimization : handleOptimize}
                            disabled={!hasItems && !isRunning}
                            className={`w-full py-2 px-4 rounded font-medium transition-colors ${
                                isRunning
                                    ? 'bg-red-600 hover:bg-red-700 text-white'
                                    : hasItems
                                        ? 'bg-[#7af48b] hover:bg-[#6ae47a] text-black'
                                        : 'bg-white/10 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {isRunning ? 'Cancel' : 'Find Sets'}
                        </button>

                        {isRunning && progress && (
                            <div className="text-xs text-gray-500 text-center">
                                Processing... {Math.round((progress.completed / Math.max(progress.total, 1)) * 100)}%
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main Content - Results */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {error && (
                        <div className="p-4 bg-red-900/30 border-b border-red-800 text-red-400">
                            Error: {error}
                        </div>
                    )}

                    {result ? (
                        <OptimizerResults />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <div className="text-4xl mb-2">⚙️</div>
                                <p>Click "Find Sets" to start optimization</p>
                                <p className="text-xs mt-2 text-gray-600">
                                    {hasItems 
                                        ? `Found ${totalCount} armor pieces`
                                        : 'No armor found for selected class'}
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default LoadoutOptimizer;
