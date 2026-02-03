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
 * Interpolates a stat value using the Destiny Stat Group Definition
 */
function interpolateStatValue(value: number, statGroupDef: any, statHash: number): number {
    if (!statGroupDef?.scaledStats) return value;

    // Find the scaling definition for this specific stat
    const scaledStat = statGroupDef.scaledStats.find((s: any) => s.statHash === statHash);
    if (!scaledStat || !scaledStat.displayInterpolation) return value;

    const interpolation = scaledStat.displayInterpolation;
    if (!interpolation.length) return value;

    // Sort points by input value
    const sortedPoints = [...interpolation].sort((a: any, b: any) => a.value - b.value);

    // Clamp
    const minPoint = sortedPoints[0];
    const maxPoint = sortedPoints[sortedPoints.length - 1];

    if (value <= minPoint.value) return minPoint.weight;
    if (value >= maxPoint.value) return maxPoint.weight;

    // Linear Interpolation
    for (let i = 0; i < sortedPoints.length - 1; i++) {
        const p1 = sortedPoints[i];
        const p2 = sortedPoints[i + 1];

        if (value >= p1.value && value <= p2.value) {
            const range = p2.value - p1.value;
            if (range === 0) return p1.weight;

            const t = (value - p1.value) / range;
            const weight = p1.weight + t * (p2.weight - p1.weight);
            return Math.round(weight);
        }
    }

    return value;
}

/**
 * Hook to hydrate raw item data with manifest definitions.
 * PRIORITIZES: Live Instance Stats > Interpolated Definition Stats
 */
export function useHydratedItem(
    item: any,
    definition: any,
    definitions: Record<string, any>
) {
    // --- Stat Hydration (Live + Interpolated) ---
    const hydratedStats: HydratedStat[] = useMemo(() => {
        if (!definition?.stats?.stats) return [];

        const statGroupDef = definitions[definition.stats.statGroupHash];
        const liveStats = item?.stats?.values || item?.stats || {}; // Live stats from API

        return Object.entries(definition.stats.stats).map(([hashStr, defStat]: [string, any]) => {
            const hash = parseInt(hashStr, 10);
            const info = getStatInfo(hash);

            if (!info) return null;

            // 1. Try Live Stat (already interpolated/calculated by Bungie)
            let value = liveStats[hashStr]?.value || liveStats[hash]?.value;

            // 2. Fallback: Interpolate Investment Stat
            if (value === undefined) {
                const investmentValue = defStat.value;
                value = interpolateStatValue(investmentValue, statGroupDef, hash);
            }

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
    }, [item, definition, definitions]);

    // --- Hydrate Perks (Live Sockets) ---
    const hydratedPerks: HydratedPerk[] = useMemo(() => {
        // Support both merged path (item.sockets) and raw path (item.itemComponents...)
        const liveSockets = item?.sockets?.sockets || item?.itemComponents?.sockets?.data?.sockets;
        
        if (!liveSockets || !definition?.sockets?.socketCategories) return [];

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

            // Filter by category
            if (!SOCKET_WHITELIST.includes(categoryHash)) return;

            // Must have a plug
            if (!socket.plugHash) return;
            
            const plugDef = definitions[socket.plugHash];

            // Filter: Must have icon (Basic visual check)
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