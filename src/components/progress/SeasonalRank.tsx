import React from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { selectProgressions } from '@/store/useProgressStore';
import { BungieImage } from '@/components/ui/BungieImage';
import { cn } from '@/lib/utils';
import { WellRestedPerk } from './WellRestedPerk';

interface SeasonalRankProps {
    characterId: string;
}

export function SeasonalRank({ characterId }: SeasonalRankProps) {
    const rawProfile = useInventoryStore(state => state.profile);
    const charProgressions = selectProgressions(rawProfile, characterId);

    // TODO: We need to properly identify the CURRENT season's progression hash.
    // This typically requires checking the formatting of the season pass or core settings.
    // For now, we will rely on finding the season pass via the profile's current season hash if avail,
    // or fallback to checking known season hashes if we had them.
    // A robust way used by DIM is checking `DestinySeasonDefinition` for the current season.

    // Let's grab all progressions and find the one that looks like a season pass (long, 100 levels).
    // Or better, stick to the plan: we need the manifest to tell us the current season.
    // Since we don't have effortless access to "Current Season" from CoreSettings yet in our store,
    // we might need to query the manifest for all seasons and find the active one.

    // Simplification for MVP: We will try to find a progression that looks like the season pass
    // if we can't get the definition easily.
    // Actually, `profile.profile.data.seasonHashes` gives us the active season.

    const currentSeasonHash = rawProfile?.profile?.data?.seasonHashes?.[rawProfile.profile.data.seasonHashes.length - 1];

    // Load Definition for the Season
    const { definitions: seasonDefs, loading: seasonLoading } = useDefinitions('DestinySeasonDefinition', currentSeasonHash ? [currentSeasonHash] : []);

    const seasonDef = currentSeasonHash ? seasonDefs?.[currentSeasonHash] : null;

    // If we have the season definition, we can get the season pass hash
    const seasonPassHash = seasonDef?.seasonPassHash;

    // Load Season Pass Definition
    const { definitions: passDefs, loading: passLoading } = useDefinitions('DestinySeasonPassDefinition', seasonPassHash ? [seasonPassHash] : []);
    const seasonPassDef = seasonPassHash ? passDefs?.[seasonPassHash] : null;

    const rewardProgressionHash = seasonPassDef?.rewardProgressionHash;
    const prestigeProgressionHash = seasonPassDef?.prestigeProgressionHash;

    // Now load the actual progression definitions
    const progressionHashes = [];
    if (rewardProgressionHash) progressionHashes.push(rewardProgressionHash);
    if (prestigeProgressionHash) progressionHashes.push(prestigeProgressionHash);

    const { definitions: progDefs, loading: progLoading } = useDefinitions('DestinyProgressionDefinition', progressionHashes);

    if (seasonLoading || passLoading || progLoading || !charProgressions || !rewardProgressionHash) return null;

    const seasonProgression = charProgressions.progressions[rewardProgressionHash];
    const prestigeProgression = prestigeProgressionHash ? charProgressions.progressions[prestigeProgressionHash] : null;

    if (!seasonProgression) return null;

    // Calculate total level
    // Base levels logic from DIM (simplified)
    const progDef = progDefs?.[rewardProgressionHash];
    if (!progDef) return null;

    const baseLevel = seasonProgression.level;
    const isPrestige = baseLevel >= (progDef.steps?.length || 100);

    const displayLevel = isPrestige && prestigeProgression
        ? baseLevel + prestigeProgression.level
        : baseLevel;

    const progressToNext = isPrestige && prestigeProgression
        ? prestigeProgression.progressToNextLevel
        : seasonProgression.progressToNextLevel;

    const nextLevelAt = isPrestige && prestigeProgression
        ? prestigeProgression.nextLevelAt
        : seasonProgression.nextLevelAt;

    const percentage = nextLevelAt > 0 ? (progressToNext / nextLevelAt) * 100 : 0;

    return (
        <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-6 mb-8 relative overflow-hidden group">
            {/* Background Art - if available from Season Def */}
            {seasonDef?.backgroundImagePath && (
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-20 pointer-events-none"
                    style={{ backgroundImage: `url(https://www.bungie.net${seasonDef.backgroundImagePath})` }}
                />
            )}

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Rank Circle */}
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full rotate-[-90deg]" viewBox="0 0 100 100">
                        {/* Track */}
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="6" />
                        {/* Progress */}
                        <circle
                            cx="50" cy="50" r="45" fill="none" stroke="#f5dc56" strokeWidth="6"
                            strokeDasharray="283"
                            strokeDashoffset={283 - (283 * percentage / 100)}
                            className="transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-gray-400 text-xs font-mono uppercase tracking-widest">Rank</span>
                        <span className="text-3xl font-rajdhani font-bold text-white">{displayLevel}</span>
                    </div>
                </div>

                {/* Info Text */}
                <div className="flex-1 text-center md:text-left">
                    <h3 className="text-2xl font-bold text-white mb-1">
                        {seasonDef?.displayProperties?.name || 'Current Season'}
                    </h3>
                    <div className="text-gray-400 font-mono text-sm mb-3">
                        {progressToNext.toLocaleString()} / <span className="text-gray-500">{nextLevelAt.toLocaleString()} XP</span>
                    </div>

                    {/* XP Bar (Horizontal for context) */}
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-[#3b82f6] shadow-[0_0_10px_#3b82f6]"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </div>

                {/* Extras */}
                <div className="flex flex-col gap-2 items-center md:items-end">
                    <WellRestedPerk characterId={characterId} />
                    {/* Could add Claim Rewards button here later */}
                </div>
            </div>
        </div>
    );
}
