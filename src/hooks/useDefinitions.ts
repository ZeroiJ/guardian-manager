import { useState, useEffect, useMemo } from 'react';
import { ManifestManager } from '../services/manifest/manager';

/**
 * Hook to retrieve definitions from a manifest table.
 * Uses synchronous memory cache when available for instant lookups.
 * Falls back to async IndexedDB fetch if not cached.
 * 
 * @param tableName The Bungie manifest table name (e.g. 'DestinyInventoryItemDefinition')
 * @param hashes Array of item hashes to look up
 */
export function useDefinitions(tableName: string, hashes: (number | string)[]) {
    // Try sync lookup first (instant if table is in memory)
    const syncDefs = useMemo(() => {
        if (hashes.length === 0) return {};
        return ManifestManager.getDefinitionsSync(tableName, hashes);
    }, [tableName, JSON.stringify(hashes)]);

    const [asyncDefinitions, setAsyncDefinitions] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // If sync lookup found everything, we're done
    const allFoundSync = useMemo(() => {
        if (hashes.length === 0) return true;
        return hashes.every(h => syncDefs[h.toString()]);
    }, [hashes, syncDefs]);

    useEffect(() => {
        // Skip async fetch if sync lookup found all definitions
        if (allFoundSync) {
            setLoading(false);
            return;
        }

        if (hashes.length === 0) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        async function fetch() {
            try {
                const results = await ManifestManager.getDefinitions(tableName, hashes);
                if (isMounted) {
                    setAsyncDefinitions(results);
                    setLoading(false);
                }
            } catch (err) {
                if (isMounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setLoading(false);
                }
            }
        }

        fetch();

        return () => { isMounted = false; };
    }, [tableName, JSON.stringify(hashes), allFoundSync]);

    // Merge sync and async results (sync takes priority for instant display)
    const definitions = useMemo(() => ({
        ...asyncDefinitions,
        ...syncDefs
    }), [syncDefs, asyncDefinitions]);

    return { definitions, loading: loading && !allFoundSync, error };
}
