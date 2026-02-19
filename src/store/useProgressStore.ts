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

// Selectors to extract data from the main InventoryStore
export const selectProgressions = (profile: DestinyProfileResponse | null, characterId: string) => {
    if (!profile) return null;
    return profile.characterProgressions?.data?.[characterId] || null;
};

import { MAJOR_FACTION_PROGRESSIONS } from '@/data/constants';

export const selectChecklists = (profile: DestinyProfileResponse | null, characterId: string) => {
    if (!profile) return null;
    return profile.characterProgressions?.data?.[characterId]?.checklists || null;
}

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
