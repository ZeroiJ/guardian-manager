import { useEffect, useRef } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { BucketHashes } from '../lib/destiny-constants';

/**
 * Farming Mode Hook
 *
 * When farming mode is active, this hook watches the inventory for
 * engrams and consumables on the active character and automatically
 * moves them to the vault.
 *
 * It runs on every inventory change (items array), not on a timer,
 * because the store is already polling via useAutoRefresh.
 *
 * Items that are moved:
 * - Engrams (bucket 375726501)
 * - Consumables (bucket 1469714392) that are NOT equipped and have instanceId
 *
 * Excludes:
 * - Items without itemInstanceId (non-transferable stackables handled differently)
 * - Items already being transferred (TransferService dedup handles this)
 */

/** Buckets that get auto-vaulted in farming mode. */
const FARMING_BUCKETS = new Set<number>([
    BucketHashes.Engrams,      // 375726501
    BucketHashes.Consumables,  // 1469714392
]);

export function useFarmingMode() {
    const farmingMode = useInventoryStore((s) => s.farmingMode);
    const items = useInventoryStore((s) => s.items);
    const moveItem = useInventoryStore((s) => s.moveItem);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        if (!farmingMode.active || !farmingMode.characterId) return;

        const charId = farmingMode.characterId;

        // Find items on the farming character that belong to farming buckets
        const toMove = items.filter((item) => {
            if (item.owner !== charId) return false;
            if (!item.itemInstanceId) return false;
            // Don't move equipped items
            if (item.instanceData?.isEquipped) return false;
            // Check if item is in a farming bucket
            return FARMING_BUCKETS.has(item.bucketHash);
        });

        if (toMove.length === 0 || isProcessingRef.current) return;

        // Process moves sequentially to avoid overwhelming the API
        isProcessingRef.current = true;
        (async () => {
            for (const item of toMove) {
                try {
                    // Check farming mode is still active (user might have toggled off mid-batch)
                    if (!useInventoryStore.getState().farmingMode.active) break;
                    await moveItem(item.itemInstanceId!, item.itemHash, 'vault', true);
                    console.log(`[FarmingMode] Moved ${item.itemInstanceId} to vault`);
                } catch (err) {
                    console.warn(`[FarmingMode] Failed to move ${item.itemInstanceId}:`, err);
                    // Continue with next item
                }
            }
            isProcessingRef.current = false;
        })();
    }, [farmingMode.active, farmingMode.characterId, items, moveItem]);
}
