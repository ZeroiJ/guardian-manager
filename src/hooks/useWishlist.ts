/**
 * Wishlist React Hook
 * Manages wishlist state, fetching, and localStorage persistence
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { WishListState, WishListRoll, DEFAULT_WISHLIST_URL } from '../lib/wishlist/types';
import { parseWishlists } from '../lib/wishlist/parser';
import { groupRollsByItemHash, getInventoryWishListRoll, hasWishlistRolls } from '../lib/wishlist/matcher';

const STORAGE_KEY = 'guardian-manager-wishlists';

interface UseWishlistReturn {
    /** All loaded rolls */
    rolls: WishListRoll[];
    /** Rolls grouped by item hash for fast lookup */
    rollsByHash: Map<number, WishListRoll[]>;
    /** Source info */
    state: WishListState | null;
    /** Loading state */
    loading: boolean;
    /** Error message */
    error: string | null;
    /** Add a wishlist source URL */
    addSource: (url: string) => Promise<void>;
    /** Remove a source URL */
    removeSource: (url: string) => void;
    /** Refresh all sources */
    refresh: () => Promise<void>;
    /** Clear all wishlists */
    clear: () => void;
    /** Match an item against wishlists */
    getItemWishlistRoll: (item: any, itemHash: number, categories: number[]) => ReturnType<typeof getInventoryWishListRoll>;
    /** Check if item hash has any wishlist entries */
    hasWishlistInfo: (itemHash: number, categories: number[]) => boolean;
}

/**
 * Load state from localStorage
 */
function loadFromStorage(): WishListState | null {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return null;

        const parsed = JSON.parse(stored);
        // Reconstruct Sets
        if (parsed.rolls) {
            for (const roll of parsed.rolls) {
                roll.recommendedPerks = new Set(roll.recommendedPerks);
            }
        }
        if (parsed.lastFetched) {
            parsed.lastFetched = new Date(parsed.lastFetched);
        }
        return parsed;
    } catch {
        return null;
    }
}

/**
 * Save state to localStorage
 */
function saveToStorage(state: WishListState) {
    try {
        // Convert Sets to arrays for JSON
        const toStore = {
            ...state,
            rolls: state.rolls.map(r => ({
                ...r,
                recommendedPerks: [...r.recommendedPerks],
            })),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (e) {
        console.error('Failed to save wishlist to localStorage:', e);
    }
}

/**
 * Fetch a single wishlist URL
 */
async function fetchWishlistText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch ${url}: ${res.status}`);
    }
    return res.text();
}

export function useWishlist(): UseWishlistReturn {
    const [state, setState] = useState<WishListState | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Group rolls for fast lookup
    const rollsByHash = useMemo(() => {
        return state?.rolls ? groupRollsByItemHash(state.rolls) : new Map();
    }, [state?.rolls]);

    // Load from storage on mount
    useEffect(() => {
        const stored = loadFromStorage();
        if (stored) {
            setState(stored);
        } else {
            // Auto-load default wishlist on first use
            fetchWishlists([DEFAULT_WISHLIST_URL]);
        }
    }, []);

    // Save to storage when state changes
    useEffect(() => {
        if (state) {
            saveToStorage(state);
        }
    }, [state]);

    // Fetch wishlists from URLs
    const fetchWishlists = useCallback(async (urls: string[]) => {
        if (urls.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const results = await Promise.allSettled(
                urls.map(async url => ({
                    url,
                    text: await fetchWishlistText(url),
                }))
            );

            const successful: Array<{ url: string; text: string }> = [];
            const errors: string[] = [];

            for (const result of results) {
                if (result.status === 'fulfilled') {
                    successful.push(result.value);
                } else {
                    errors.push(result.reason?.message || 'Unknown error');
                }
            }

            if (successful.length === 0) {
                setError(errors.join(', '));
                return;
            }

            const newState = parseWishlists(successful);
            setState(newState);

            if (errors.length > 0) {
                setError(`Some sources failed: ${errors.join(', ')}`);
            }
        } catch (e: any) {
            setError(e.message || 'Failed to load wishlists');
        } finally {
            setLoading(false);
        }
    }, []);

    // Add a source
    const addSource = useCallback(async (url: string) => {
        const currentUrls = state?.source?.split('|').filter(Boolean) || [];
        if (currentUrls.includes(url)) return;

        const newUrls = [...currentUrls, url];
        await fetchWishlists(newUrls);
    }, [state?.source, fetchWishlists]);

    // Remove a source
    const removeSource = useCallback((url: string) => {
        const currentUrls = state?.source?.split('|').filter(Boolean) || [];
        const newUrls = currentUrls.filter(u => u !== url);

        if (newUrls.length === 0) {
            setState(null);
            localStorage.removeItem(STORAGE_KEY);
        } else {
            fetchWishlists(newUrls);
        }
    }, [state?.source, fetchWishlists]);

    // Refresh all sources
    const refresh = useCallback(async () => {
        const urls = state?.source?.split('|').filter(Boolean) || [DEFAULT_WISHLIST_URL];
        await fetchWishlists(urls);
    }, [state?.source, fetchWishlists]);

    // Clear all
    const clear = useCallback(() => {
        setState(null);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    // Match item
    const getItemWishlistRoll = useCallback((
        item: any,
        itemHash: number,
        categories: number[]
    ) => {
        return getInventoryWishListRoll(item, itemHash, categories, rollsByHash);
    }, [rollsByHash]);

    // Check if item has wishlist info
    const hasWishlistInfo = useCallback((itemHash: number, categories: number[]) => {
        return hasWishlistRolls(itemHash, categories, rollsByHash);
    }, [rollsByHash]);

    return {
        rolls: state?.rolls || [],
        rollsByHash,
        state,
        loading,
        error,
        addSource,
        removeSource,
        refresh,
        clear,
        getItemWishlistRoll,
        hasWishlistInfo,
    };
}
