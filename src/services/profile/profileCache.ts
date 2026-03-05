/**
 * Profile Cache — Stale-While-Revalidate IDB Storage
 *
 * Stores the raw DestinyProfileResponse in IndexedDB for instant cold-load.
 * Pattern inspired by DIM: src/app/inventory/d2-stores.ts
 *
 * Architecture:
 * - Uses idb-keyval for simple key-value IDB access (already a dependency).
 * - Stores under a dedicated customStore to avoid collisions with manifest cache.
 * - Key: `profile-${membershipId}`, Value: CachedProfile envelope.
 * - The raw Bungie response is stored, NOT processed items — processing
 *   happens in hydrate() on every load.
 */
import { get, set, del, createStore } from 'idb-keyval';
import type { DestinyProfileResponse } from 'bungie-api-ts/destiny2';

// Dedicated IDB store to isolate profile cache from manifest cache
const profileStore = createStore('guardian-nexus-profile-cache', 'profiles');

/**
 * Envelope wrapping the cached profile with timestamps for staleness checks.
 */
export interface CachedProfile {
    /** The raw Bungie DestinyProfileResponse (merged core + item components). */
    profile: DestinyProfileResponse;
    /**
     * Bungie's server-side mint timestamp from the response.
     * Used for comparing freshness: newer timestamp = newer data.
     * Path: profile.responseMintedTimestamp (ISO string).
     */
    responseMintedTimestamp: string;
    /**
     * Secondary components mint timestamp (item-specific components may lag).
     * Path: profile.secondaryComponentsMintedTimestamp (ISO string).
     */
    secondaryComponentsMintedTimestamp: string;
    /** Wall-clock time when we cached this profile (Date.now()). */
    cachedAt: number;
}

/**
 * Build the IDB key for a given membership ID.
 */
function cacheKey(membershipId: string): string {
    return `profile-${membershipId}`;
}

/**
 * Extract the responseMintedTimestamp from a Bungie profile response.
 * Returns empty string if not found.
 */
export function extractMintedTimestamp(profile: any): string {
    return (profile as any)?.responseMintedTimestamp || '';
}

/**
 * Extract the secondaryComponentsMintedTimestamp from a Bungie profile response.
 * Returns empty string if not found.
 */
export function extractSecondaryMintedTimestamp(profile: any): string {
    return (profile as any)?.secondaryComponentsMintedTimestamp || '';
}

/**
 * Compare two ISO timestamp strings. Returns true if `a` is strictly newer than `b`.
 * Falls back to string comparison which works for ISO 8601 format.
 */
export function isNewerTimestamp(a: string, b: string): boolean {
    if (!a || !b) return true; // If either is missing, treat as newer (force update)
    return a > b;
}

/**
 * Read the cached profile from IndexedDB.
 *
 * @param membershipId - Bungie membership ID
 * @returns The cached profile envelope, or null if no cache exists.
 */
export async function getProfileCache(membershipId: string): Promise<CachedProfile | null> {
    try {
        const cached = await get<CachedProfile>(cacheKey(membershipId), profileStore);
        if (!cached?.profile) return null;

        console.log(
            `[ProfileCache] Cache HIT for ${membershipId}. ` +
            `Minted: ${cached.responseMintedTimestamp}, ` +
            `Cached at: ${new Date(cached.cachedAt).toLocaleTimeString()}`
        );
        return cached;
    } catch (err) {
        console.warn('[ProfileCache] Failed to read cache:', err);
        return null;
    }
}

/**
 * Write a profile to the IDB cache.
 *
 * @param membershipId - Bungie membership ID
 * @param profile - The raw DestinyProfileResponse to cache
 */
export async function setProfileCache(
    membershipId: string,
    profile: DestinyProfileResponse,
): Promise<void> {
    const entry: CachedProfile = {
        profile,
        responseMintedTimestamp: extractMintedTimestamp(profile),
        secondaryComponentsMintedTimestamp: extractSecondaryMintedTimestamp(profile),
        cachedAt: Date.now(),
    };

    try {
        await set(cacheKey(membershipId), entry, profileStore);
        console.log(
            `[ProfileCache] Cache SET for ${membershipId}. ` +
            `Minted: ${entry.responseMintedTimestamp}`
        );
    } catch (err) {
        console.warn('[ProfileCache] Failed to write cache:', err);
    }
}

/**
 * Clear the cached profile for a membership (e.g., on logout or account switch).
 *
 * @param membershipId - Bungie membership ID
 */
export async function clearProfileCache(membershipId: string): Promise<void> {
    try {
        await del(cacheKey(membershipId), profileStore);
        console.log(`[ProfileCache] Cache CLEARED for ${membershipId}`);
    } catch (err) {
        console.warn('[ProfileCache] Failed to clear cache:', err);
    }
}
