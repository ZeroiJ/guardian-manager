import { useState, useEffect, useMemo } from 'react';
import { ManifestManager } from '../services/manifest/manager';

/**
 * Hook to retrieve definitions from a manifest table.
 * Uses synchronous memory cache when available for instant lookups.
 * Falls back to async IndexedDB fetch if not cached.
 * 
 * @param tableName The Bungie manifest table name (e.g. 'DestinyInventoryItemDefinition')
 * @param hashes Array of item hashes to look up. If empty, loads the ENTIRE table.
 */
export function useDefinitions(tableName: string, hashes: (number | string)[]) {
    // Try sync lookup first (instant if table is in memory)
    // If hashes is empty, we'll load the full table
    const syncDefs = useMemo(() => {
        if (hashes.length === 0) {
            // Load full table synchronously if in memory
            return ManifestManager.getFullTableSync(tableName);
        }
        return ManifestManager.getDefinitionsSync(tableName, hashes);
    }, [tableName, JSON.stringify(hashes)]);

    const [asyncDefinitions, setAsyncDefinitions] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // If we have sync results (either full table or found hashes), we're done
    const hasData = useMemo(() => {
        if (hashes.length === 0) {
            // For full table, check if we got anything
            return Object.keys(syncDefs).length > 0;
        }
        return hashes.every(h => syncDefs[h.toString()]);
    }, [hashes, syncDefs]);

    useEffect(() => {
        // If we already have data from sync, skip loading
        if (hasData) {
            setLoading(false);
            return;
        }

        // If hashes is empty and we don't have full table loaded yet, load it
        if (hashes.length === 0) {
            let isMounted = true;
            
            async function fetchFullTable() {
                try {
                    const table = await ManifestManager.loadTable(tableName);
                    if (isMounted) {
                        setAsyncDefinitions(table);
                        setLoading(false);
                    }
                } catch (err) {
                    if (isMounted) {
                        setError(err instanceof Error ? err : new Error(String(err)));
                        setLoading(false);
                    }
                }
            }
            
            fetchFullTable();
            return () => { isMounted = false; };
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
    }, [tableName, JSON.stringify(hashes), hasData]);

    // Merge sync and async results (sync takes priority for instant display)
    const definitions = useMemo(() => ({
        ...asyncDefinitions,
        ...syncDefs
    }), [syncDefs, asyncDefinitions]);

    return { definitions, loading: loading && !hasData, error };
}
