/**
 * Clarity Database Integration
 *
 * Fetches community-sourced perk descriptions from the Clarity database.
 * These descriptions include exact stat bonuses, cooldown timers, and
 * damage percentages that Bungie's API does not expose.
 *
 * Ported from DIM: src/app/clarity/descriptions/loadDescriptions.ts
 * Data source: https://database-clarity.github.io/Live-Clarity-Database/
 */
import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

/** A single content segment within a Clarity description line. */
export interface ClarityLineContent {
    text?: string;
    classNames?: string[];
    link?: string;
}

/** A line in a Clarity perk description (may contain multiple segments). */
export interface ClarityLine {
    linesContent?: ClarityLineContent[];
    classNames?: string[];
}

/** A single Clarity perk entry, keyed by perk hash. */
export interface ClarityPerk {
    hash: number;
    name: string;
    itemHash?: number;
    itemName?: string;
    descriptions: {
        en?: ClarityLine[];
        [lang: string]: ClarityLine[] | undefined;
    };
}

/** The full Clarity description database (perkHash → ClarityPerk). */
export type ClarityDescriptionDB = Record<number, ClarityPerk>;

/** Version info from the Clarity versions endpoint. */
interface ClarityVersions {
    descriptions: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CLARITY_BASE = 'https://database-clarity.github.io/';
const CLARITY_URLS = {
    descriptions: `${CLARITY_BASE}Live-Clarity-Database/descriptions/dim.json`,
    version: `${CLARITY_BASE}Live-Clarity-Database/versions.json`,
} as const;

/** Only reload from network at most every 1 hour. */
const RELOAD_INTERVAL_MS = 60 * 60 * 1000;

// ============================================================================
// STORE
// ============================================================================

interface ClarityState {
    /** The full Clarity perk description database. */
    descriptions: ClarityDescriptionDB | null;
    /** Whether a load is in progress. */
    loading: boolean;
    /** Last successful load timestamp. */
    lastLoadedAt: number;
    /** Any error from the last load attempt. */
    error: string | null;
    /** Load Clarity descriptions (fetches from network or IDB cache). */
    loadDescriptions: () => Promise<void>;
    /** Look up a single perk's Clarity description. */
    getPerkDescription: (perkHash: number) => ClarityPerk | null;
}

/**
 * Zustand store for Clarity community data.
 * Call `loadDescriptions()` once on app startup; subsequent calls
 * will no-op if data was loaded within the last hour.
 */
export const useClarityStore = create<ClarityState>((set, get) => ({
    descriptions: null,
    loading: false,
    lastLoadedAt: 0,
    error: null,

    loadDescriptions: async () => {
        const state = get();

        // Don't reload if recently fetched
        if (state.loading) return;
        if (state.descriptions && Date.now() - state.lastLoadedAt < RELOAD_INTERVAL_MS) return;

        set({ loading: true, error: null });

        try {
            // Check IDB cache first
            let cached: ClarityDescriptionDB | null = null;
            const savedVersion = Number(localStorage.getItem('gn-clarity-version') ?? '0');

            try {
                // Try to load from IDB if we have a saved version
                if (savedVersion > 0) {
                    const { get: idbGet } = await import('idb-keyval');
                    cached = await idbGet<ClarityDescriptionDB>('gn-clarity-descriptions') ?? null;
                }
            } catch {
                // IDB not available, proceed to network
            }

            // Check remote version
            let shouldFetch = !cached;
            try {
                const versionRes = await fetch(CLARITY_URLS.version);
                if (versionRes.ok) {
                    const versionData = (await versionRes.json()) as ClarityVersions;
                    if (versionData.descriptions !== savedVersion) {
                        shouldFetch = true;
                    }
                }
            } catch {
                // Version check failed — use cache if available
                if (cached) shouldFetch = false;
            }

            if (shouldFetch) {
                // Fetch fresh data from Clarity
                const descRes = await fetch(CLARITY_URLS.descriptions);
                if (!descRes.ok) throw new Error(`Clarity fetch failed: ${descRes.status}`);

                const descriptions = (await descRes.json()) as ClarityDescriptionDB;

                // Save to IDB for offline access
                try {
                    const { set: idbSet } = await import('idb-keyval');
                    await idbSet('gn-clarity-descriptions', descriptions);

                    const versionRes = await fetch(CLARITY_URLS.version);
                    if (versionRes.ok) {
                        const v = (await versionRes.json()) as ClarityVersions;
                        localStorage.setItem('gn-clarity-version', v.descriptions.toString());
                    }
                } catch {
                    // IDB save failed, still use the data
                }

                set({ descriptions, loading: false, lastLoadedAt: Date.now() });
            } else if (cached) {
                set({ descriptions: cached, loading: false, lastLoadedAt: Date.now() });
            } else {
                set({ loading: false });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to load Clarity data';
            console.error('[Clarity]', message);
            set({ loading: false, error: message });
        }
    },

    getPerkDescription: (perkHash: number) => {
        const descriptions = get().descriptions;
        if (!descriptions) return null;
        return descriptions[perkHash] ?? null;
    },
}));
