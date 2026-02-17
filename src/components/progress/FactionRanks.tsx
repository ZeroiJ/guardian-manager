import React from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { BungieImage } from '@/components/ui/BungieImage';
import { cn } from '@/lib/utils';

const FACTION_HASHES = {
    Crucible: 2083746873,
    Gambit: 2755675426,
    Vanguard: 457612306
};

const TARGET_HASHES = Object.values(FACTION_HASHES);

interface FactionRanksProps {
    characterId: string;
}

export function FactionRanks({ characterId }: FactionRanksProps) {
    const rawProfile = useInventoryStore(state => state.profile);
    const progressions = rawProfile?.characterProgressions?.data?.[characterId]?.progressions;
    
    const { definitions, loading } = useDefinitions('DestinyProgressionDefinition', TARGET_HASHES);

    if (!progressions || loading || !definitions) return null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {TARGET_HASHES.map(hash => {
                const progression = progressions[hash];
                const def = definitions[hash];
                
                if (!progression || !def) return null;

                const { currentProgress, level, progressToNextLevel, nextLevelAt } = progression;
                const step = def.steps?.[Math.min(level, (def.steps?.length || 1) - 1)];
                const stepName = step?.stepName || "";
                
                // Calculate percentage for the current level
                const percent = nextLevelAt > 0 ? (progressToNextLevel / nextLevelAt) * 100 : 100;

                // Color based on faction (hardcoded or from def)
                // Crucible: Red, Gambit: Green/Cyan, Vanguard: Blue/Orange
                let barColor = "bg-gray-500";
                if (hash === FACTION_HASHES.Crucible) barColor = "bg-red-600";
                if (hash === FACTION_HASHES.Gambit) barColor = "bg-emerald-500";
                if (hash === FACTION_HASHES.Vanguard) barColor = "bg-blue-500";

                return (
                    <div key={hash} className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 flex items-center gap-4 shadow-sm hover:border-gray-700 transition-colors">
                        {/* Icon */}
                        <div className="w-12 h-12 shrink-0">
                            <BungieImage 
                                src={def.displayProperties?.icon} 
                                className="w-full h-full object-contain" 
                            />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-end mb-1">
                                <span className="font-rajdhani font-bold text-lg text-gray-200 leading-none">
                                    {def.displayProperties?.name}
                                </span>
                                <span className="text-[#f5dc56] font-bold text-sm leading-none">
                                    {stepName}
                                </span>
                            </div>
                            
                            {/* Progress Bar Container */}
                            <div className="h-2 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                                <div 
                                    className={cn("h-full transition-all duration-500 ease-out", barColor)}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>

                            <div className="flex justify-between mt-1 text-xs text-gray-500 font-mono">
                                <span>Level {level}</span>
                                <span>{progressToNextLevel.toLocaleString()} / {nextLevelAt.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
