/**
 * Item Feed Store — Tracks newly acquired items
 *
 * Compares inventory snapshots on each profile refresh to detect
 * new item acquisitions. Maintains a chronological feed of the
 * most recent items, similar to DIM's "New Items" feature.
 */
import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

/** A single feed entry representing a newly acquired item. */
export interface FeedItem {
    /** Unique instance ID of the item. */
    itemInstanceId: string;
    /** Item definition hash for manifest lookup. */
    itemHash: number;
    /** Bucket hash (weapon slot, armor slot, etc.). */
    bucketHash: number;
    /** Owner (characterId or 'vault'). */
    owner: string;
    /** Timestamp when the item was first detected. */
    acquiredAt: number;
    /** Whether the user has dismissed/acknowledged this item. */
    dismissed: boolean;
}

/** Maximum number of feed items to retain. */
const MAX_FEED_SIZE = 100;

// ============================================================================
// STORE
// ============================================================================

interface ItemFeedState {
    /** Chronological list of newly acquired items (newest first). */
    feed: FeedItem[];
    /** Set of known item instance IDs from the previous snapshot. */
    knownInstanceIds: Set<string>;
    /** Whether the feed has been initialized with a baseline snapshot. */
    initialized: boolean;
    /**
     * Process a new inventory snapshot. Compares against known IDs
     * and adds any new items to the feed.
     */
    processSnapshot: (items: Array<{
        itemInstanceId?: string;
        itemHash: number;
        bucketHash: number;
        owner: string;
    }>) => void;
    /** Dismiss a single item from the feed. */
    dismissItem: (itemInstanceId: string) => void;
    /** Dismiss all items in the feed. */
    dismissAll: () => void;
    /** Get undismissed items count. */
    undismissedCount: () => number;
}

/**
 * Item Feed store.
 * 
 * Usage: Call `processSnapshot(items)` after each profile refresh.
 * On first call, it sets a baseline (no notifications). On subsequent
 * calls, any items with instance IDs not in the baseline are added to the feed.
 */
export const useItemFeedStore = create<ItemFeedState>((set, get) => ({
    feed: [],
    knownInstanceIds: new Set(),
    initialized: false,

    processSnapshot: (items) => {
        const state = get();
        const currentIds = new Set<string>();

        // Build current snapshot of instance IDs
        for (const item of items) {
            if (item.itemInstanceId) {
                currentIds.add(item.itemInstanceId);
            }
        }

        if (!state.initialized) {
            // First snapshot — set baseline, no feed items generated
            set({ knownInstanceIds: currentIds, initialized: true });
            return;
        }

        // Find new items (in current but not in known)
        const newFeedItems: FeedItem[] = [];
        for (const item of items) {
            if (
                item.itemInstanceId &&
                !state.knownInstanceIds.has(item.itemInstanceId) &&
                // Skip items that are already in the feed
                !state.feed.some(f => f.itemInstanceId === item.itemInstanceId)
            ) {
                newFeedItems.push({
                    itemInstanceId: item.itemInstanceId,
                    itemHash: item.itemHash,
                    bucketHash: item.bucketHash,
                    owner: item.owner,
                    acquiredAt: Date.now(),
                    dismissed: false,
                });
            }
        }

        if (newFeedItems.length > 0) {
            const updatedFeed = [...newFeedItems, ...state.feed].slice(0, MAX_FEED_SIZE);
            set({
                feed: updatedFeed,
                knownInstanceIds: currentIds,
            });
        } else {
            // Still update known IDs (items may have been deleted/transferred)
            set({ knownInstanceIds: currentIds });
        }
    },

    dismissItem: (itemInstanceId) => {
        set((state) => ({
            feed: state.feed.map((f) =>
                f.itemInstanceId === itemInstanceId ? { ...f, dismissed: true } : f
            ),
        }));
    },

    dismissAll: () => {
        set((state) => ({
            feed: state.feed.map((f) => ({ ...f, dismissed: true })),
        }));
    },

    undismissedCount: () => {
        return get().feed.filter((f) => !f.dismissed).length;
    },
}));
