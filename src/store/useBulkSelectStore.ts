import { create } from 'zustand';

/**
 * Bulk Selection Store
 *
 * Manages multi-item selection for bulk operations (lock/unlock, move, tag).
 * Separate from useInventoryStore to keep concerns isolated.
 *
 * Selection modes:
 * - Click: toggle single item
 * - Shift+Click: range select (requires tracking last-clicked item)
 * - Ctrl/Cmd+Click: add to selection without clearing
 */

interface BulkSelectState {
    /** Set of selected itemInstanceIds */
    selectedIds: Set<string>;
    /** Whether bulk selection mode is active */
    active: boolean;
    /** The last item clicked (for shift-range selection) */
    lastClickedId: string | null;

    // Actions
    toggle: (itemInstanceId: string) => void;
    select: (itemInstanceId: string) => void;
    deselect: (itemInstanceId: string) => void;
    selectMany: (itemInstanceIds: string[]) => void;
    clear: () => void;
    /** Enter bulk selection mode */
    activate: () => void;
    /** Exit bulk selection mode and clear all selections */
    deactivate: () => void;
    isSelected: (itemInstanceId: string) => boolean;
}

export const useBulkSelectStore = create<BulkSelectState>((set, get) => ({
    selectedIds: new Set(),
    active: false,
    lastClickedId: null,

    toggle: (itemInstanceId) => {
        const current = new Set(get().selectedIds);
        if (current.has(itemInstanceId)) {
            current.delete(itemInstanceId);
        } else {
            current.add(itemInstanceId);
        }
        set({
            selectedIds: current,
            active: current.size > 0,
            lastClickedId: itemInstanceId,
        });
    },

    select: (itemInstanceId) => {
        const current = new Set(get().selectedIds);
        current.add(itemInstanceId);
        set({
            selectedIds: current,
            active: true,
            lastClickedId: itemInstanceId,
        });
    },

    deselect: (itemInstanceId) => {
        const current = new Set(get().selectedIds);
        current.delete(itemInstanceId);
        set({
            selectedIds: current,
            active: current.size > 0,
        });
    },

    selectMany: (itemInstanceIds) => {
        const current = new Set(get().selectedIds);
        for (const id of itemInstanceIds) {
            current.add(id);
        }
        set({
            selectedIds: current,
            active: current.size > 0,
            lastClickedId: itemInstanceIds[itemInstanceIds.length - 1] || null,
        });
    },

    clear: () => {
        set({ selectedIds: new Set(), lastClickedId: null, active: false });
    },

    activate: () => {
        set({ active: true });
    },

    deactivate: () => {
        set({ selectedIds: new Set(), active: false, lastClickedId: null });
    },

    isSelected: (itemInstanceId) => {
        return get().selectedIds.has(itemInstanceId);
    },
}));
