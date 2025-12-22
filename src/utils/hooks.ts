import { useState, useEffect } from 'react';
import { ManifestManager } from './manifest-manager';

/**
 * Hook to retrieve definitions from a manifest table.
 * @param tableName The Bungie manifest table name (e.g. 'DestinyInventoryItemDefinition')
 * @param hashes Array of item hashes to look up
 */
export function useDefinitions(tableName: string, hashes: (number | string)[]) {
    const [definitions, setDefinitions] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (hashes.length === 0) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        async function fetch() {
            try {
                const results = await ManifestManager.getDefinitions(tableName, hashes);
                if (isMounted) {
                    setDefinitions(results);
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
    }, [tableName, JSON.stringify(hashes)]);

    return { definitions, loading, error };
}
