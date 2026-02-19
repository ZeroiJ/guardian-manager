import React from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { selectFactionProgressions } from '@/store/useProgressStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { BungieImage } from '@/components/ui/BungieImage';
import { cn } from '@/lib/utils';
import { MAJOR_FACTION_PROGRESSIONS } from '@/data/constants';

interface FactionRanksProps {
    characterId: string;
}

export function FactionRanks({ characterId }: FactionRanksProps) {
    const rawProfile = useInventoryStore(state => state.profile);
    const factions = selectFactionProgressions(rawProfile, characterId);

    // We need definitions for all the mapped progressions
    // Extract hashes from our constants
    const factionHashes = Object.values(MAJOR_FACTION_PROGRESSIONS);

    const { definitions, loading } = useDefinitions('DestinyProgressionDefinition', factionHashes);

    if (!factions || loading || !definitions) return null;

    // Helper to render a specific faction row
    const renderFaction = (progression: any, hash: number, colorClass: string) => {
        if (!progression) return null;
        const def = definitions[hash];
        if (!def) return null;

        const { level, progressToNextLevel, nextLevelAt } = progression;
        const step = def.steps?.[Math.min(level, (def.steps?.length || 1) - 1)];
        const stepName = step?.stepName || "";

        // Calculate percentage for the current level
        const percent = nextLevelAt > 0 ? (progressToNextLevel / nextLevelAt) * 100 : 100;

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
                            className={cn("h-full transition-all duration-500 ease-out", colorClass)}
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
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {renderFaction(factions.vanguard, MAJOR_FACTION_PROGRESSIONS.Vanguard, "bg-blue-600")}
            {renderFaction(factions.crucible, MAJOR_FACTION_PROGRESSIONS.Crucible, "bg-red-600")}
            {renderFaction(factions.gambit, MAJOR_FACTION_PROGRESSIONS.Gambit, "bg-emerald-600")}
            {/* Can easily add Gunsmith, Iron Banner, Trials here too */}
        </div>
    );
}
