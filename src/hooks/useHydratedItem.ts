import { useMemo } from 'react';
import { STAT_HASH_MAP, isBarStat, getStatSortOrder, isRecoilStat } from '../utils/stat-definitions';

/**
 * Hydrated stat structure for display
 */
export interface HydratedStat {
    hash: string;
    label: string;
    value: number;
    max: number;
    isBar: boolean;
    isRecoil: boolean;
    sortOrder: number;
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
    definition: any,
    definitions: Record<string, any>
) {
    // --- Synchronous Stat Hydration ---
    const hydratedStats: HydratedStat[] = useMemo(() => {
        // Fallback: Check item.stats.values (Instance) OR item.stats (Profile-level) OR definition.stats.stats (Generic)
        // Note: useProfile generally flattens item.stats -> { [hash]: { value } }
        const rawStats = item?.stats?.values || item?.stats || definition?.stats?.stats || {};

        return Object.entries(rawStats).map(([hashStr, statData]) => {
            const hash = parseInt(hashStr, 10);
            const name = STAT_HASH_MAP[hash];

            if (!name) return null; // Filter hidden stats

            // Handle API quirk where value might be wrapped { value: 10 } or raw number
            const value = (typeof statData === 'object' && statData !== null)
                ? (statData as any).value
                : statData;

            if (typeof value !== 'number') return null;

            return {
                hash: hashStr,
                label: name,
                value,
                max: 100,
                isBar: isBarStat(hash),
                isRecoil: isRecoilStat(hash),
                sortOrder: getStatSortOrder(hash)
            };
        })
            .filter((s): s is HydratedStat => s !== null)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }, [item?.stats, definition?.stats]);

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
        perks: hydratedPerks
    };
}
