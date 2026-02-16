import { create } from 'zustand';
import { useInventoryStore } from './useInventoryStore';
import { DestinyProfileResponse, DestinyCharacterProgressionComponent, DestinyInventoryComponent } from 'bungie-api-ts/destiny2';

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

export const selectChecklists = (profile: DestinyProfileResponse | null, characterId: string) => {
     if (!profile) return null;
     return profile.characterProgressions?.data?.[characterId]?.checklists || null;
}
