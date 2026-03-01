/**
 * Wishlist Store (Zustand)
 * Manages wishlist loading, parsing, caching, and lookup.
 *
 * Architecture:
 * - Fetches wishlist text from URL (defaults to Voltron community list)
 * - Parses using lib/wishlist/parser
 * - Caches raw text in localStorage (avoids re-fetching on page reload)
 * - Builds rollsByHash Map for O(1) item lookups
 * - Re-fetches if stale (>24h) or URL changed
 */

import { create } from 'zustand';
import { parseWishListText, buildRollsByHash } from '../lib/wishlist/parser';
import type { WishListRoll, WishListInfo } from '../lib/wishlist/types';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default Voltron community wishlist (hosted on GitHub). */
const DEFAULT_WISHLIST_URL =
  'https://raw.githubusercontent.com/48klocs/dim-wish-list-sources/master/voltron.txt';

/** localStorage keys */
const LS_WISHLIST_TEXT = 'gm-wishlist-text';
const LS_WISHLIST_URL = 'gm-wishlist-url';
const LS_WISHLIST_FETCHED = 'gm-wishlist-fetched';

/** Stale threshold: 24 hours in ms. */
const STALE_MS = 24 * 60 * 60 * 1000;

// ============================================================================
// TYPES
// ============================================================================

interface WishlistState {
  /** Whether the store has been initialized. */
  loaded: boolean;
  /** Whether a fetch is in progress. */
  loading: boolean;
  /** Error message if fetch/parse failed. */
  error: string | null;

  /** Currently configured wishlist source URL (empty string = disabled). */
  sourceUrl: string;
  /** Metadata from parsed wishlist files. */
  infos: WishListInfo[];
  /** Total number of parsed rolls. */
  rollCount: number;
  /** Pre-built lookup: itemHash → WishListRoll[] */
  rollsByHash: Map<number, WishListRoll[]>;
  /** Timestamp of last successful fetch. */
  lastFetched: number | null;

  // Actions
  /** Initialize from localStorage cache, then fetch if stale. */
  init: () => Promise<void>;
  /** Set a new wishlist URL and fetch it. Pass empty string to disable. */
  setSource: (url: string) => Promise<void>;
  /** Force re-fetch from the current URL. */
  refresh: () => Promise<void>;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Convert github.com blob URLs to raw.githubusercontent.com */
function normalizeGitHubUrl(url: string): string {
  // github.com/USER/REPO/blob/BRANCH/PATH → raw.githubusercontent.com/USER/REPO/refs/heads/BRANCH/PATH
  const blobMatch = url.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)/
  );
  if (blobMatch) {
    const [, user, repo, branch, path] = blobMatch;
    return `https://raw.githubusercontent.com/${user}/${repo}/refs/heads/${branch}/${path}`;
  }
  return url;
}

/** Fetch wishlist text from URL. */
async function fetchWishlistText(url: string): Promise<string> {
  const normalizedUrl = normalizeGitHubUrl(url);
  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch wishlist: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

/** Load cached wishlist from localStorage. */
function loadCache(): { text: string; url: string; fetchedAt: number } | null {
  try {
    const text = localStorage.getItem(LS_WISHLIST_TEXT);
    const url = localStorage.getItem(LS_WISHLIST_URL);
    const fetched = localStorage.getItem(LS_WISHLIST_FETCHED);
    if (text && url && fetched) {
      return { text, url, fetchedAt: parseInt(fetched, 10) };
    }
  } catch {
    // localStorage unavailable
  }
  return null;
}

/** Save wishlist text + metadata to localStorage. */
function saveCache(text: string, url: string): void {
  try {
    localStorage.setItem(LS_WISHLIST_TEXT, text);
    localStorage.setItem(LS_WISHLIST_URL, url);
    localStorage.setItem(LS_WISHLIST_FETCHED, String(Date.now()));
  } catch {
    // localStorage full or unavailable — non-fatal
    console.warn('[WishlistStore] Failed to cache wishlist to localStorage');
  }
}

/** Clear wishlist cache. */
function clearCache(): void {
  try {
    localStorage.removeItem(LS_WISHLIST_TEXT);
    localStorage.removeItem(LS_WISHLIST_URL);
    localStorage.removeItem(LS_WISHLIST_FETCHED);
  } catch {
    // ignore
  }
}

// ============================================================================
// STORE
// ============================================================================

export const useWishlistStore = create<WishlistState>((set, get) => ({
  loaded: false,
  loading: false,
  error: null,
  sourceUrl: DEFAULT_WISHLIST_URL,
  infos: [],
  rollCount: 0,
  rollsByHash: new Map(),
  lastFetched: null,

  init: async () => {
    const state = get();
    if (state.loaded || state.loading) return;

    set({ loading: true });

    // 1. Try loading from cache
    const cache = loadCache();
    if (cache) {
      const parsed = parseWishListText(cache.text, cache.url);
      const rollsByHash = buildRollsByHash(parsed.rolls);
      set({
        loaded: true,
        loading: false,
        sourceUrl: cache.url,
        infos: parsed.infos,
        rollCount: parsed.rolls.length,
        rollsByHash,
        lastFetched: cache.fetchedAt,
      });

      console.log(`[WishlistStore] Loaded ${parsed.rolls.length} rolls from cache`);

      // If stale or URL changed, re-fetch in background
      const isStale = Date.now() - cache.fetchedAt > STALE_MS;
      if (isStale) {
        console.log('[WishlistStore] Cache is stale, refreshing in background...');
        get().refresh();
      }
      return;
    }

    // 2. No cache — fetch from default URL
    try {
      const text = await fetchWishlistText(DEFAULT_WISHLIST_URL);
      const parsed = parseWishListText(text, DEFAULT_WISHLIST_URL);
      const rollsByHash = buildRollsByHash(parsed.rolls);
      saveCache(text, DEFAULT_WISHLIST_URL);

      set({
        loaded: true,
        loading: false,
        sourceUrl: DEFAULT_WISHLIST_URL,
        infos: parsed.infos,
        rollCount: parsed.rolls.length,
        rollsByHash,
        lastFetched: Date.now(),
      });

      console.log(`[WishlistStore] Fetched & parsed ${parsed.rolls.length} rolls from Voltron`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[WishlistStore] Failed to load wishlist:', msg);
      set({ loaded: true, loading: false, error: msg });
    }
  },

  setSource: async (url: string) => {
    if (!url) {
      // Disable wishlist
      clearCache();
      set({
        loaded: true,
        loading: false,
        error: null,
        sourceUrl: '',
        infos: [],
        rollCount: 0,
        rollsByHash: new Map(),
        lastFetched: null,
      });
      return;
    }

    set({ loading: true, error: null, sourceUrl: url });

    try {
      const text = await fetchWishlistText(url);
      const parsed = parseWishListText(text, url);
      const rollsByHash = buildRollsByHash(parsed.rolls);
      saveCache(text, url);

      set({
        loaded: true,
        loading: false,
        infos: parsed.infos,
        rollCount: parsed.rolls.length,
        rollsByHash,
        lastFetched: Date.now(),
      });

      console.log(`[WishlistStore] Loaded ${parsed.rolls.length} rolls from ${url}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[WishlistStore] Failed to load wishlist:', msg);
      set({ loaded: true, loading: false, error: msg });
    }
  },

  refresh: async () => {
    const { sourceUrl, loading } = get();
    if (!sourceUrl || loading) return;

    set({ loading: true, error: null });

    try {
      const text = await fetchWishlistText(sourceUrl);
      const parsed = parseWishListText(text, sourceUrl);
      const rollsByHash = buildRollsByHash(parsed.rolls);
      saveCache(text, sourceUrl);

      set({
        loading: false,
        infos: parsed.infos,
        rollCount: parsed.rolls.length,
        rollsByHash,
        lastFetched: Date.now(),
      });

      console.log(`[WishlistStore] Refreshed: ${parsed.rolls.length} rolls`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[WishlistStore] Refresh failed:', msg);
      set({ loading: false, error: msg });
    }
  },
}));
