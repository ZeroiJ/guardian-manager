/**
 * useInGameLoadouts — Processes Bungie Component 205 into enriched InGameLoadout[].
 *
 * This hook bridges the raw profile data (already fetched by useProfile) with the
 * three small manifest tables needed to resolve loadout names, icons, and colors.
 *
 * Flow:
 *   1. Read `profile.characterLoadouts.data` from useInventoryStore
 *   2. Fetch DestinyLoadoutNameDefinition, DestinyLoadoutColorDefinition,
 *      DestinyLoadoutIconDefinition via useDefinitions (full-table loads)
 *   3. When all three tables are ready, call processInGameLoadouts()
 *   4. Push result into store via setInGameLoadouts()
 *
 * The hook is designed to be called once at the app level (e.g., in the Inventory
 * page or a top-level provider) so the store is populated for any consumer.
 */
import { useEffect, useRef } from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useDefinitions } from './useDefinitions';
import { processInGameLoadouts } from '@/lib/destiny/ingame-loadouts';
import type {
    LoadoutNameDefinition,
    LoadoutColorDefinition,
    LoadoutIconDefinition,
} from '@/lib/destiny/ingame-loadouts';

/** Empty array constant to avoid re-renders from useDefinitions. */
const EMPTY_HASHES: number[] = [];

export function useInGameLoadouts() {
    const profile = useInventoryStore((s) => s.profile);
    const setInGameLoadouts = useInventoryStore((s) => s.setInGameLoadouts);

    // Fetch the three loadout cosmetic tables (full-table, they're tiny)
    const { definitions: nameDefs, loading: nameLoading } = useDefinitions(
        'DestinyLoadoutNameDefinition',
        EMPTY_HASHES,
    );
    const { definitions: colorDefs, loading: colorLoading } = useDefinitions(
        'DestinyLoadoutColorDefinition',
        EMPTY_HASHES,
    );
    const { definitions: iconDefs, loading: iconLoading } = useDefinitions(
        'DestinyLoadoutIconDefinition',
        EMPTY_HASHES,
    );

    // Track whether we've already processed for this profile to avoid redundant work
    const lastProfileRef = useRef<any>(null);

    const defsReady = !nameLoading && !colorLoading && !iconLoading;
    const characterLoadouts = profile?.characterLoadouts?.data;

    useEffect(() => {
        if (!defsReady || !characterLoadouts) return;

        // Skip if we already processed this exact profile object
        if (lastProfileRef.current === profile) return;
        lastProfileRef.current = profile;

        const hasNameDefs = Object.keys(nameDefs).length > 0;
        const hasColorDefs = Object.keys(colorDefs).length > 0;
        const hasIconDefs = Object.keys(iconDefs).length > 0;

        if (!hasNameDefs || !hasColorDefs || !hasIconDefs) {
            console.warn('[useInGameLoadouts] Loadout manifest tables are empty — skipping.');
            return;
        }

        const processed = processInGameLoadouts(
            characterLoadouts,
            nameDefs as Record<string | number, LoadoutNameDefinition>,
            colorDefs as Record<string | number, LoadoutColorDefinition>,
            iconDefs as Record<string | number, LoadoutIconDefinition>,
        );

        const totalCount = Object.values(processed).reduce(
            (sum, arr) => sum + arr.length,
            0,
        );
        console.log(`[useInGameLoadouts] Processed ${totalCount} in-game loadouts`);

        setInGameLoadouts(processed);
    }, [defsReady, characterLoadouts, profile, nameDefs, colorDefs, iconDefs, setInGameLoadouts]);

    return { loading: !defsReady };
}
