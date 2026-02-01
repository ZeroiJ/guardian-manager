import { useMemo } from 'react';
import { getStatInfo } from '../utils/manifest-helper';

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

// Approved Socket Categories
const SOCKET_WHITELIST = [
    4241087561, // Weapon Perks
    590099826,  // Armor Mods
    3956125808  // Intrinsic Traits (Exotics)
];

const NO_BAR_STATS = [1931675084, 3871231066, 2715839340]; // RPM, Mag, Recoil

/**
 * Hook to hydrate raw item data with manifest definitions using STRICT MANUAL OVERRIDES.
 */
export function useHydratedItem(
    item: any,
    definition: any,
    definitions: Record<string, any>
) {
    // --- Synchronous Stat Hydration ---
    const hydratedStats: HydratedStat[] = useMemo(() => {
        // Source: item.stats (Live) > definition.stats (Static)
        const rawStats = item?.stats?.values || item?.stats || definition?.stats?.stats || {};

        return Object.entries(rawStats).map(([hashStr, statData]) => {
            const hash = parseInt(hashStr, 10);
            const info = getStatInfo(hash); // Check STRICT WHITELIST

            if (!info) return null; // Filter everything else

            // Handle API quirk { value: 10 } vs 10
            const value = (typeof statData === 'object' && statData !== null)
                ? (statData as any).value
                : statData;

            if (typeof value !== 'number') return null;

            return {
                hash: hashStr,
                label: info.label,
                value,
                max: 100,
                isBar: !NO_BAR_STATS.includes(hash),
                isRecoil: hash === 2715839340,
                sortOrder: info.sort
            };
        })
            .filter((s): s is HydratedStat => s !== null)
            .sort((a, b) => a.sortOrder - b.sortOrder);
    }, [item?.stats, definition?.stats]);

    // --- Hydrate Perks (Strict Socket Logic) ---
    const hydratedPerks: HydratedPerk[] = useMemo(() => {
        if (!item?.itemComponents?.sockets?.data?.sockets || !definition?.sockets?.socketCategories) return [];

        const liveSockets = item.itemComponents.sockets.data.sockets;
        const socketCategories = definition.sockets.socketCategories;
        const result: HydratedPerk[] = [];

        // Map socket index -> category hash
        const socketIndexToCategory: Record<number, number> = {};
        for (const cat of socketCategories) {
            for (const index of cat.socketIndexes) {
                socketIndexToCategory[index] = cat.socketCategoryHash;
            }
        }

        liveSockets.forEach((socket: any, index: number) => {
            const categoryHash = socketIndexToCategory[index];

            // 1. Check strict category whitelist
            if (!SOCKET_WHITELIST.includes(categoryHash)) return;

            // 2. Resolve Plug info
            if (!socket.plugHash) return;
            const plugDef = definitions[socket.plugHash];

            // 3. Render if valid Icon exists
            if (plugDef?.displayProperties?.hasIcon) {
                result.push({
                    hash: socket.plugHash,
                    name: plugDef.displayProperties.name,
                    icon: plugDef.displayProperties.icon,
                    description: plugDef.displayProperties.description
                });
            }
        });

        return result; // Return ALL valid perks, don't slice randomly
    }, [item, definition, definitions]);

    return {
        stats: hydratedStats,
        perks: hydratedPerks
    };
}
