import { useMemo } from 'react';
import { getStatInfo } from '../utils/manifest-helper';
import { StatHashes, SocketCategoryHashes } from '../lib/destiny-constants';

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

// Stats that should NOT display a bar (text only or special visual)
const NO_BAR_STATS: number[] = [
    StatHashes.RoundsPerMinute,
    StatHashes.Magazine,
    StatHashes.RecoilDirection,
    StatHashes.ChargeTime,
    StatHashes.DrawTime,
];

// Approved Socket Categories for Perk Display
const SOCKET_WHITELIST: number[] = [
    SocketCategoryHashes.WeaponPerks,
    SocketCategoryHashes.ArmorMods,
    SocketCategoryHashes.IntrinsicTraits,
];

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
        const rawStats = item?.stats?.values || item?.stats || definition?.stats?.stats || {};

        return Object.entries(rawStats).map(([hashStr, statData]) => {
            const hash = parseInt(hashStr, 10);
            const info = getStatInfo(hash);

            if (!info) return null;

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
                isRecoil: hash === StatHashes.RecoilDirection,
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

            if (!SOCKET_WHITELIST.includes(categoryHash)) return;

            if (!socket.plugHash) return;
            const plugDef = definitions[socket.plugHash];

            if (plugDef?.displayProperties?.hasIcon) {
                result.push({
                    hash: socket.plugHash,
                    name: plugDef.displayProperties.name,
                    icon: plugDef.displayProperties.icon,
                    description: plugDef.displayProperties.description
                });
            }
        });

        return result;
    }, [item, definition, definitions]);

    return {
        stats: hydratedStats,
        perks: hydratedPerks
    };
}
