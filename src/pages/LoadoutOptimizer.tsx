/**
 * Loadout Optimizer Page
 * 
 * Armor optimization tool for finding the best stat distributions.
 */

import { useState, useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { useOptimizerStore, LOCKED_EXOTIC_NO_EXOTIC, LOCKED_EXOTIC_ANY_EXOTIC } from '@/store/optimizerStore';
import { useArmorFilter } from '@/hooks/useArmorFilter';
import { useInventoryStore } from '@/store/useInventoryStore';
import { CLASS_NAMES, ClassIcon } from '@/components/ui/DestinyIcons';
import { StatConstraintEditor } from '@/components/loadout-optimizer/StatConstraintEditor';
import { OptimizerResults } from '@/components/loadout-optimizer/OptimizerResults';
import { ExoticPicker } from '@/components/loadout-optimizer/ExoticPicker';

export function LoadoutOptimizer() {
    const [selectedClass, setSelectedClass] = useState(0);
    const [showExoticPicker, setShowExoticPicker] = useState(false);
    
    const {
        isRunning,
        progress,
        result,
        error,
        lockedExoticHash,
        runOptimization,
        cancelOptimization,
        setClassType,
        setLockedExotic,
    } = useOptimizerStore();

    // Get the characterId for loadout creation
    const characters = useInventoryStore(state => state.characters);
    const characterId = useMemo(() => {
        // Find a character matching the selected class
        for (const [charId, char] of Object.entries(characters)) {
            if ((char as any).classType === selectedClass) return charId;
        }
        return Object.keys(characters)[0] || '';
    }, [characters, selectedClass]);

    // Get filtered armor items with exotic locking applied
    const { items, totalCount } = useArmorFilter({
        classType: selectedClass,
        maxItemsPerSlot: 30,
        lockedExoticHash,
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

    // Get exotic label for the picker button
    const manifest = useInventoryStore(state => state.manifest);
    const exoticLabel = useMemo(() => {
        if (lockedExoticHash === undefined) return 'No Preference';
        if (lockedExoticHash === LOCKED_EXOTIC_NO_EXOTIC) return 'No Exotic';
        if (lockedExoticHash === LOCKED_EXOTIC_ANY_EXOTIC) return 'Any Exotic';
        // Specific exotic — look up name
        const def = manifest[lockedExoticHash];
        return (def as any)?.displayProperties?.name || `Exotic #${lockedExoticHash}`;
    }, [lockedExoticHash, manifest]);

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

                    {/* Exotic Picker Button */}
                    <div className="p-4 border-b border-void-border">
                        <label className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
                            Exotic Armor
                        </label>
                        <button
                            onClick={() => setShowExoticPicker(true)}
                            className={`w-full mt-2 p-2 rounded border text-left flex items-center gap-2 transition-colors ${
                                lockedExoticHash !== undefined && lockedExoticHash > 0
                                    ? 'border-[#f5dc56]/50 bg-[#f5dc56]/10 text-[#f5dc56]'
                                    : 'border-void-border bg-white/5 text-gray-300 hover:border-white/30'
                            }`}
                        >
                            <span className="text-lg">
                                {lockedExoticHash === LOCKED_EXOTIC_NO_EXOTIC ? '🚫' : 
                                 lockedExoticHash === LOCKED_EXOTIC_ANY_EXOTIC ? '✦' :
                                 lockedExoticHash !== undefined && lockedExoticHash > 0 ? '✦' : '🔓'}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="text-sm truncate">{exoticLabel}</div>
                            </div>
                            <span className="text-gray-500 text-xs">Change</span>
                        </button>
                    </div>

                    {/* Armor Count */}
                    <div className="px-4 py-2 bg-black/20 text-xs text-gray-500">
                        {totalCount} armor pieces ({hasItems ? 'ready' : 'loading...'})
                    </div>

                    {/* Stat Constraints */}
                    <div className="flex-1 overflow-y-auto p-4">
                        <StatConstraintEditor />
                    </div>

                    {/* Optimize Button */}
                    <div className="p-4 border-t border-void-border space-y-3">
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
                            <div>
                                <div className="text-xs text-gray-500 text-center mb-1">
                                    Processing... {Math.round((progress.completed / Math.max(progress.total, 1)) * 100)}%
                                </div>
                                <div className="w-full h-1 bg-white/10 rounded overflow-hidden">
                                    <div 
                                        className="h-full bg-[#7af48b] transition-all duration-300"
                                        style={{ width: `${Math.round((progress.completed / Math.max(progress.total, 1)) * 100)}%` }}
                                    />
                                </div>
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
                        <OptimizerResults characterId={characterId} />
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

            {/* Exotic Picker Modal */}
            {showExoticPicker && (
                <ExoticPicker
                    classType={selectedClass}
                    lockedExoticHash={lockedExoticHash}
                    onSelect={setLockedExotic}
                    onClose={() => setShowExoticPicker(false)}
                />
            )}
        </div>
    );
}

export default LoadoutOptimizer;
