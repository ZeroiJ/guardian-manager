import { create } from 'zustand';
import { DestinyProfileResponse } from 'bungie-api-ts/destiny2';

interface ProgressState {
    selectedCharacterId: string | null;
    setSelectedCharacterId: (characterId: string) => void;
}

export const useProgressStore = create<ProgressState>((set) => ({
    selectedCharacterId: null,
    setSelectedCharacterId: (characterId) => set({ selectedCharacterId: characterId }),
}));

/**
 * Extracts all character progressions (Ranks, Checklists, Seasonal data).
 * @returns DestinyCharacterProgressionComponent | null
 */
export const selectProgressions = (profile: DestinyProfileResponse | null, characterId: string) => {
    if (!profile) return null;
    return profile.characterProgressions?.data?.[characterId] || null;
};

import { MAJOR_FACTION_PROGRESSIONS } from '@/data/constants';

export const selectChecklists = (profile: DestinyProfileResponse | null, characterId: string) => {
    if (!profile) return null;
    return profile.characterProgressions?.data?.[characterId]?.checklists || null;
}

/**
 * Selects and maps the core playlist reputation ranks.
 * Uses verified hashes from constants.ts (Vanguard, Crucible, Gambit).
 * 
 * Used by FactionRanks.tsx to display the main 3-6 reputation circles.
 */
export const selectFactionProgressions = (profile: DestinyProfileResponse | null, characterId: string) => {
    if (!profile?.characterProgressions?.data?.[characterId]?.progressions) return null;

    const charProgressions = profile.characterProgressions.data[characterId].progressions;

    return {
        vanguard: charProgressions[MAJOR_FACTION_PROGRESSIONS.Vanguard],
        crucible: charProgressions[MAJOR_FACTION_PROGRESSIONS.Crucible],
        gambit: charProgressions[MAJOR_FACTION_PROGRESSIONS.Gambit],
        gunsmith: charProgressions[MAJOR_FACTION_PROGRESSIONS.Gunsmith],
        ironBanner: charProgressions[MAJOR_FACTION_PROGRESSIONS.IronBanner],
        trials: charProgressions[MAJOR_FACTION_PROGRESSIONS.Trials],
    };
};
