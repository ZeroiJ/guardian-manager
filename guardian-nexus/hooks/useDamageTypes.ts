import { useState, useEffect, useRef } from 'react';
import { ManifestManager } from '../services/manifest/manager';
import { DAMAGE_TYPES } from '../data/constants';

interface DamageTypeDefinition {
    hash: number;
    displayProperties: {
        name: string;
        icon?: string;
    };
}

// Module-level cache - shared across all component instances
let cachedDamageTypes: Record<string, DamageTypeDefinition> | null = null;
let loadPromise: Promise<Record<string, DamageTypeDefinition>> | null = null;

/**
 * Loads damage type definitions once and caches them.
 */
async function loadDamageTypes(): Promise<Record<string, DamageTypeDefinition>> {
    if (cachedDamageTypes) return cachedDamageTypes;

    if (!loadPromise) {
        loadPromise = (async () => {
            try {
                // Get all damage type hashes we care about
                const hashes = Object.values(DAMAGE_TYPES).filter(h => h !== 0);
                const results = await ManifestManager.getDefinitions('DestinyDamageTypeDefinition', hashes);
                cachedDamageTypes = results;
                return results;
            } catch (err) {
                console.error('[useDamageTypes] Failed to load damage type definitions:', err);
                loadPromise = null; // Allow retry on error
                return {};
            }
        })();
    }

    return loadPromise;
}

interface UseDamageTypesResult {
    damageTypes: Record<string, DamageTypeDefinition>;
    loading: boolean;
    getIconForHash: (hash: number | undefined) => string | null;
}

/**
 * Hook to access damage type definitions from the manifest.
 * Uses a module-level cache so data is loaded only once across all components.
 */
export function useDamageTypes(): UseDamageTypesResult {
    const [damageTypes, setDamageTypes] = useState<Record<string, DamageTypeDefinition>>(cachedDamageTypes || {});
    const [loading, setLoading] = useState(!cachedDamageTypes);
    const mountedRef = useRef(true);

    useEffect(() => {
        mountedRef.current = true;

        if (!cachedDamageTypes) {
            loadDamageTypes().then(results => {
                if (mountedRef.current) {
                    setDamageTypes(results);
                    setLoading(false);
                }
            });
        }

        return () => { mountedRef.current = false; };
    }, []);

    const getIconForHash = (hash: number | undefined): string | null => {
        if (!hash) return null;
        const def = damageTypes[hash.toString()];
        if (!def?.displayProperties?.icon) return null;
        return `https://www.bungie.net${def.displayProperties.icon}`;
    };

    return { damageTypes, loading, getIconForHash };
}
