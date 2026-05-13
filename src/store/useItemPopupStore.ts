import { create } from 'zustand';

/**
 * DIM-style global item popup state (`item-popup.ts` + `ItemPopupContainer`).
 * One popup at a time; clicking the same item again toggles closed (matches DIM).
 */

export interface ItemPopupPayload {
    item: any;
    definition: any;
    definitions: Record<string, any>;
    referenceElement: HTMLElement | null;
}

interface ItemPopupState extends ItemPopupPayload {
    show: (payload: ItemPopupPayload) => void;
    hide: () => void;
}

const empty: ItemPopupPayload = {
    item: null,
    definition: null,
    definitions: {},
    referenceElement: null,
};

function samePopupItem(a: any, b: any): boolean {
    if (!a || !b) return false;
    if (a.itemInstanceId && b.itemInstanceId) {
        return a.itemInstanceId === b.itemInstanceId;
    }
    return a.itemHash === b.itemHash && (a.owner ?? '') === (b.owner ?? '');
}

export const useItemPopupStore = create<ItemPopupState>((set, get) => ({
    ...empty,

    show: (payload) => {
        const cur = get().item;
        if (cur && samePopupItem(cur, payload.item)) {
            set({ ...empty });
            return;
        }
        set({
            item: payload.item,
            definition: payload.definition,
            definitions: payload.definitions,
            referenceElement: payload.referenceElement,
        });
    },

    hide: () => set({ ...empty }),
}));
