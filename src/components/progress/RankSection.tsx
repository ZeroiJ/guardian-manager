import React from 'react';
import { DestinyProgression, DestinyProgressionDefinition } from 'bungie-api-ts/destiny2';
import { RankCard } from './RankCard';
import { FACTION_HASHES } from '@/data/constants';
import { useDefinitions } from '@/hooks/useDefinitions';
import { useProfile } from '@/hooks/useProfile';

interface RankSectionProps {
    characterId: string;
}

export function RankSection({ characterId }: RankSectionProps) {
    const { profile } = useProfile();
    // Assuming profile is the full Bungie response for now, based on useProfile implementation.
    // Wait, useProfile returns a tailored object in some places?
    // Let's check useProfile implementation again.
    // It returns { profile: { characters, items, currencies, artifactPower } }
    // It seems it does NOT return the raw profile directly in the hook return value.
    // The store has `profile` (raw). useProfile selects specific fields.
    
    // I need to access the raw profile or update useProfile to expose characterProgressions.
    // The store has `profile` (raw).
    // Let's use useInventoryStore directly to get the raw profile.
    
    return <RankSectionContent characterId={characterId} />;
}

import { useInventoryStore } from '@/store/useInventoryStore';

function RankSectionContent({ characterId }: { characterId: string }) {
    const rawProfile = useInventoryStore(state => state.profile);
    const progressions = rawProfile?.characterProgressions?.data?.[characterId]?.progressions;

    const { definitions, loading } = useDefinitions('DestinyProgressionDefinition', FACTION_HASHES);

    if (!progressions) return null;
    if (loading) return <div className="animate-pulse h-24 bg-gray-900/50 rounded-lg"></div>;

    // Filter out progressions that don't exist on the character or have no definition
    const activeRanks = FACTION_HASHES.filter(hash => progressions[hash] && definitions[hash]);

    if (activeRanks.length === 0) return null;

    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-rajdhani font-bold text-[#f5dc56] border-b border-white/10 pb-2">
                Reputation Ranks
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activeRanks.map(hash => (
                    <RankCard 
                        key={hash} 
                        progression={progressions[hash]} 
                        definition={definitions[hash]} 
                    />
                ))}
            </div>
        </section>
    );
}
