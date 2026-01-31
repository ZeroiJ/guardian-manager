import { useMemo } from 'react';
import { useDefinitions } from './useDefinitions';

/**
 * Hydrated stat structure for display
 */
export interface HydratedStat {
    hash: string;
    label: string;
    value: number;
    max: number;
}

/**
 * Hydrated perk structure for display
 */
export interface HydratedPerk {
    hash: number;
    name: string;
    icon: string;
    description: string;
}

/**
 * Hook to hydrate raw item data with manifest definitions.
 * Resolves stat hashes to names and perk hashes to icons/descriptions.
 * 
 * @param item - The raw item from profile
 * @param definition - The item's DestinyInventoryItemDefinition
 * @param definitions - Already loaded item definitions
 */
export function useHydratedItem(
    item: any,
    _definition: any,
    definitions: Record<string, any>
) {
    // --- Extract stat hashes from item ---
    const statHashes = useMemo(() => {
        if (!item?.stats) return [];
        return Object.keys(item.stats).map(h => parseInt(h, 10)).filter(h => !isNaN(h));
    }, [item?.stats]);

    // --- Fetch stat definitions ---
    const { definitions: statDefs, loading: statsLoading } = useDefinitions(
        'DestinyStatDefinition',
        statHashes
    );

    // --- Hydrate stats ---
    const hydratedStats: HydratedStat[] = useMemo(() => {
        if (!item?.stats || statsLoading) return [];

        const result: HydratedStat[] = [];

        for (const [hashStr, statData] of Object.entries(item.stats as Record<string, any>)) {
            const def = statDefs[hashStr];

            // Skip if no definition found
            if (!def?.displayProperties?.name) {
                console.warn(`[useHydratedItem] Missing stat definition for hash: ${hashStr}`);
                continue;
            }

            const name = def.displayProperties.name;
            const value = statData?.value ?? 0;

            // Filter out hidden stats and non-display stats
            // statCategory: 1 = Weapon, 2 = Armor
            // Also filter by name to exclude Power/Attack/Defense
            const skipNames = ['Power', 'Attack', 'Defense', 'Charge Time'];
            if (skipNames.includes(name)) continue;
            if (value === 0) continue;

            // Calculate max (use displayMaximum if available, otherwise 100)
            const max = def.displayMaximum || 100;

            result.push({
                hash: hashStr,
                label: name,
                value,
                max
            });
        }

        return result;
    }, [item?.stats, statDefs, statsLoading]);

    // --- Hydrate perks ---
    const hydratedPerks: HydratedPerk[] = useMemo(() => {
        const sockets = item?.itemComponents?.sockets?.data?.sockets || [];
        const result: HydratedPerk[] = [];

        for (const socket of sockets) {
            if (!socket?.plugHash) continue;

            // Look up in already-loaded item definitions
            const plugDef = definitions[socket.plugHash];

            if (!plugDef?.displayProperties?.icon) {
                // Not an error - many sockets are empty or cosmetic
                continue;
            }

            // Filter: only include perks with actual icons
            if (!plugDef.displayProperties.hasIcon) continue;

            result.push({
                hash: socket.plugHash,
                name: plugDef.displayProperties.name || 'Unknown',
                icon: plugDef.displayProperties.icon,
                description: plugDef.displayProperties.description || ''
            });
        }

        // Limit to first 12 perks for display
        return result.slice(0, 12);
    }, [item?.itemComponents?.sockets?.data?.sockets, definitions]);

    return {
        stats: hydratedStats,
        perks: hydratedPerks,
        loading: statsLoading
    };
}
