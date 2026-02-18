import React from 'react';
import { useDefinitions } from '@/hooks/useDefinitions';
import { BungieImage } from '@/components/ui/BungieImage';
import { WELL_RESTED_PERK_HASH } from '@/data/constants';
import { useInventoryStore } from '@/store/useInventoryStore';
import { selectProgressions } from '@/store/useProgressStore';
import { DestinyCharacterProgressionComponent } from 'bungie-api-ts/destiny2';

interface WellRestedPerkProps {
    characterId: string;
}

export function WellRestedPerk({ characterId }: WellRestedPerkProps) {
    const { definitions } = useDefinitions('DestinySandboxPerkDefinition', [WELL_RESTED_PERK_HASH]);

    // We need to check if the character has the "well rested" bonus.
    // In DIM this logic checks if the character has the perk active or similar.
    // Simplifying: we'll check the current progression for the season.
    // Actually, DIM checks `profileInfo` and `defs` to compute `useIsWellRested`.
    // For now, let's just render the icon if the definition exists, assuming we'll add logic later.
    // Wait, let's look at how we can get the weekly progress.

    const rawProfile = useInventoryStore(state => state.profile);
    const charProgressions = selectProgressions(rawProfile, characterId);

    // TODO: Implement actual "is active" logic.
    // For now, we will just start with the component structure.

    const perkDef = definitions?.[WELL_RESTED_PERK_HASH];

    if (!perkDef) return null;

    return (
        <div className="flex items-center gap-2 text-gray-400 text-sm bg-gray-900/50 px-2 py-1 rounded border border-gray-800" title={perkDef.displayProperties?.description}>
            <div className="w-5 h-5">
                <BungieImage src={perkDef.displayProperties?.icon} className="w-full h-full object-contain" />
            </div>
            <span className="font-rajdhani font-bold text-[#f5dc56]">Well Rested</span>
        </div>
    );
}
