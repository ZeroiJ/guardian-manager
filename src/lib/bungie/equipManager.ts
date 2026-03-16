/**
 * Equip Manager — Phase 5: The "Snapshot" Engine
 *
 * Applies a saved loadout by equipping all of its items on a target character.
 * Uses our Cloudflare Worker proxy to call Bungie's EquipItems endpoint.
 *
 * Architecture concept ported from DIM: src/app/loadout-drawer/loadout-apply.ts
 *
 * NOTE (Phase 5 scope):
 *   This is a best-effort equip. Items must already be present on the target
 *   character's inventory. Full transfer-then-equip logic (moving items from
 *   vault/other characters first) is deferred to Phase 6.
 */
import { ILoadout, ILoadoutItem } from '@/store/loadoutStore';
import { useInventoryStore } from '@/store/useInventoryStore';

// ============================================================================
// TYPES
// ============================================================================

/**
 * The result of attempting to apply a full loadout.
 */
export interface ApplyLoadoutResult {
    /** True only if every item was equipped successfully. */
    success: boolean;
    /** Instance IDs of items that were equipped without error. */
    equipped: string[];
    /** Items that failed to equip, with reasons. */
    failed: FailedEquip[];
}

/**
 * A single item that could not be equipped and the reason why.
 */
export interface FailedEquip {
    itemInstanceId: string;
    /** Human-readable failure label derived from the EquipFailureReason bitmask. */
    reason: string;
    /**
     * The raw EquipFailureReason bitmask from Bungie.
     * Values are a power-of-two bitmask and can be combined.
     *
     * Ported from bungie-api-ts: EquipFailureReason enum
     *   None                       = 0
     *   ItemUnequippable           = 1
     *   ItemUniqueEquipRestricted  = 2  (Exotic conflict)
     *   ItemFailedUnlockCheck      = 4  (Class/quest requirements)
     *   ItemFailedLevelCheck       = 8  (Character level too low)
     *   ItemWrapped                = 16 (Unwrap before equipping)
     *   ItemNotLoaded              = 32 (Item not loaded yet)
     *   ItemEquipBlocklisted       = 64 (Blocklisted)
     *   ItemLoadoutRequirementNotMet = 128 (Activity restriction)
     */
    cannotEquipReason: number;
}

/**
 * A concise equip status for progress tracking in the UI.
 */
export interface EquipProgress {
    total: number;
    equipped: number;
    failed: number;
    isComplete: boolean;
}

// ============================================================================
// CONSTANTS — EquipFailureReason bitmask labels
// Ported from bungie-api-ts EquipFailureReason enum
// ============================================================================

const EQUIP_FAILURE_LABELS: Array<[number, string]> = [
    [128, 'Not allowed in current activity'],
    [64, 'Item is blocklisted'],
    [32, 'Item is not loaded yet'],
    [16, 'Item must be unwrapped first'],
    [8, 'Character level too low'],
    [4, 'Class or quest requirement not met'],
    [2, 'Exotic conflict — another Exotic is already equipped'],
    [1, 'Item cannot be equipped'],
];

/**
 * Converts a raw EquipFailureReason bitmask to a human-readable string.
 * Handles combined bitmask values by listing all active flags.
 *
 * @example
 *   getEquipFailureLabel(0)   // 'Success'
 *   getEquipFailureLabel(2)   // 'Exotic conflict — another Exotic is already equipped'
 *   getEquipFailureLabel(130) // 'Not allowed in current activity; Item cannot be equipped'
 */
export function getEquipFailureLabel(reason: number): string {
    if (reason === 0) return 'Success';

    const labels: string[] = [];
    for (const [flag, label] of EQUIP_FAILURE_LABELS) {
        if (reason & flag) {
            labels.push(label);
        }
    }

    return labels.length > 0 ? labels.join('; ') : `Unknown failure code (${reason})`;
}

/**
 * Returns true if this failure is transient and might succeed after a retry
 * (e.g. item not loaded yet) vs. permanent (e.g. wrong class).
 */
export function isRetryableFailure(cannotEquipReason: number): boolean {
    // ItemNotLoaded (32) is the only truly transient failure
    return (cannotEquipReason & 32) !== 0;
}

/**
 * Returns true if the failure was caused by an Exotic conflict.
 * Useful for surfacing a specific warning in the UI.
 */
export function isExoticConflict(cannotEquipReason: number): boolean {
    return (cannotEquipReason & 2) !== 0;
}

/**
 * Returns true if the failure is due to an in-activity restriction.
 * DIM uses this to show "You are in an activity" warnings.
 */
export function isActivityRestriction(cannotEquipReason: number): boolean {
    return (cannotEquipReason & 128) !== 0;
}

// ============================================================================
// INTERNAL HELPERS
// ============================================================================

/**
 * Resolves the Bungie membershipType for the current user from the
 * inventory store. Falls back to 3 (PC / Steam) if not available.
 */
function getMembershipType(): number {
    const { profile } = useInventoryStore.getState();
    return profile?.profile?.data?.userInfo?.membershipType ?? 3;
}

/**
 * Splits an array into chunks of a given size.
 * Bungie's EquipItems endpoint accepts a maximum of 10 items per request.
 */
function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

// Bungie's EquipItems limit (undocumented but enforced at ~10)
const EQUIP_BATCH_SIZE = 10;

// ============================================================================
// API CALL
// ============================================================================

interface EquipItemsBody {
    itemIds: string[];
    characterId: string;
    membershipType: number;
}

interface BungieEquipItemResult {
    itemInstanceId: string;
    /** 1 = success, other values = failure */
    equipStatus: number;
    cannotEquipReason: number;
}

interface BungieEquipItemsResponse {
    Response?: {
        equipResults: BungieEquipItemResult[];
    };
    ErrorCode?: number;
    ErrorStatus?: string;
    Message?: string;
}

interface TransferItemBody {
    itemReferenceHash: number;
    stackSize: number;
    transferToVault: boolean;
    itemId: string;
    characterId: string;
    membershipType: number;
}

interface InsertPlugFreeBody {
    itemId: string;
    plug: {
        socketIndex: number;
        socketArrayType: number;
        plugItemHash: number;
    };
    characterId: string;
    membershipType: number;
}

/** Equip phases for progress tracking */
export type EquipPhase = 'dequip' | 'transfer' | 'equip' | 'sockets' | 'mods' | 'done';

export interface EquipProgressInfo {
    phase: EquipPhase;
    message: string;
    current: number;
    total: number;
}

/**
 * Calls the `/api/actions/equip` Cloudflare Worker proxy which forwards to
 * `POST /Platform/Destiny2/Actions/Items/EquipItems/`.
 *
 * @throws Error if the network request itself fails (non-HTTP errors).
 */
async function callEquipItemsEndpoint(
    body: EquipItemsBody
): Promise<BungieEquipItemResult[]> {
    const response = await fetch('/api/actions/equip', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`EquipItems API Error ${response.status}: ${text}`);
    }

    const data: BungieEquipItemsResponse = await response.json();

    // Surface Bungie-level errors (non-zero ErrorCode means failure)
    if (data.ErrorCode && data.ErrorCode !== 1) {
        throw new Error(
            `Bungie API Error ${data.ErrorCode} (${data.ErrorStatus}): ${data.Message}`
        );
    }

    return data?.Response?.equipResults ?? [];
}

/**
 * Calls the `/api/actions/transfer` Cloudflare Worker proxy.
 */
async function callTransferItemEndpoint(
    body: TransferItemBody
): Promise<any> {
    const response = await fetch('/api/actions/transfer', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`TransferItem API Error ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (data.ErrorCode && data.ErrorCode !== 1) {
        throw new Error(
            `Bungie API Error ${data.ErrorCode} (${data.ErrorStatus}): ${data.Message}`
        );
    }

    return data?.Response;
}

/**
 * Calls the `/api/actions/insertPlugFree` Cloudflare Worker proxy.
 */
export async function callInsertPlugFreeEndpoint(
    body: InsertPlugFreeBody
): Promise<any> {
    const response = await fetch('/api/actions/insertPlugFree', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`InsertPlugFree API Error ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (data.ErrorCode && data.ErrorCode !== 1) {
        throw new Error(
            `Bungie API Error ${data.ErrorCode} (${data.ErrorStatus}): ${data.Message}`
        );
    }

    return data?.Response;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Applies a saved loadout by equipping all items on the specified character.
 *
 * Handles:
 *   ✅ Batch equipping (respects Bungie's 10-item limit per request)
 *   ✅ EquipFailureReason decoding for each item
 *   ✅ Exotic conflict detection
 *   ✅ Activity restriction detection
 *
 * Does NOT handle (Phase 6):
 *   ❌ Pre-emptive item transfers from vault/other characters
 *   ❌ Dequip logic for conflicting exotics
 *   ❌ Automatic retry for transient failures
 *
 * @param characterId - The Bungie character ID to equip items on.
 * @param loadout     - The saved loadout snapshot to apply.
 * @returns           A structured result with success/failure breakdown.
 *
 * @example
 *   const result = await applyLoadout(characterId, myLoadout);
 *   if (!result.success) {
 *     result.failed.forEach(f => console.warn(f.reason));
 *   }
 */

interface EquipLoadoutBody {
    loadoutIndex: number;
    characterId: string;
    membershipType: number;
}

/**
 * Calls the `/api/actions/equipLoadout` Cloudflare Worker proxy.
 */
export async function callEquipLoadoutEndpoint(
    body: EquipLoadoutBody
): Promise<any> {
    const response = await fetch('/api/actions/equipLoadout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new Error(`EquipLoadout API Error ${response.status}: ${text}`);
    }

    const data = await response.json();

    if (data.ErrorCode && data.ErrorCode !== 1) {
        throw new Error(
            `Bungie API Error ${data.ErrorCode} (${data.ErrorStatus}): ${data.Message}`
        );
    }

    return data?.Response;
}

/**
 * Applies an in-game loadout directly via Bungie's EquipLoadout endpoint.
 */
export async function applyInGameLoadout(
    characterId: string,
    loadoutIndex: number
): Promise<{ success: boolean; error?: string }> {
    const membershipType = getMembershipType();
    
    console.log(`[EquipManager] Applying in-game loadout index ${loadoutIndex} on character ${characterId}`);
    
    try {
        await callEquipLoadoutEndpoint({
            loadoutIndex,
            characterId,
            membershipType
        });
        return { success: true };
    } catch (err: any) {
        console.error(`[EquipManager] Failed to apply in-game loadout:`, err);
        return { success: false, error: err.message || 'Unknown error' };
    }
}

export async function applyLoadout(
    characterId: string,
    loadout: ILoadout,
    onProgress?: (info: EquipProgressInfo) => void,
): Promise<ApplyLoadoutResult> {
    const membershipType = getMembershipType();
    const inventoryStore = useInventoryStore.getState();
    const allItems = inventoryStore.items;

    const equippableItems: ILoadoutItem[] = loadout.items.filter(
        (item): item is ILoadoutItem & { itemInstanceId: string } =>
            typeof item.itemInstanceId === 'string' && item.itemInstanceId.length > 0
    );

    if (equippableItems.length === 0) {
        console.warn(`[EquipManager] Loadout "${loadout.name}" has no equippable items.`);
        return { success: false, equipped: [], failed: [] };
    }

    console.log(
        `[EquipManager] Applying loadout "${loadout.name}" ` +
        `(${equippableItems.length} items) on character ${characterId}`
    );

    const equipped: string[] = [];
    const failed: FailedEquip[] = [];

    const reportProgress = (phase: EquipPhase, message: string, current: number, total: number) => {
        onProgress?.({ phase, message, current, total });
    };

    // --- PHASE 0: EXOTIC DEQUIP ---
    // If the loadout contains an exotic weapon or armor, and the character already has
    // a DIFFERENT exotic equipped in that category, dequip it first.
    reportProgress('dequip', 'Checking exotic conflicts...', 0, 1);

    const loadoutExotics = equippableItems.filter(li => {
        const live = allItems.find(i => i.itemInstanceId === li.itemInstanceId);
        if (!live) return false;
        const def = inventoryStore.manifest?.[live.itemHash];
        return def?.inventory?.tierType === 6; // Exotic
    });

    for (const exotic of loadoutExotics) {
        const liveExotic = allItems.find(i => i.itemInstanceId === exotic.itemInstanceId);
        if (!liveExotic) continue;

        const exoticDef = inventoryStore.manifest?.[liveExotic.itemHash];
        const isWeapon = exoticDef?.itemType === 3;
        const isArmor = exoticDef?.itemType === 2;

        // Find currently equipped exotics on the target character in the same category
        const equippedOnChar = allItems.filter(i =>
            i.owner === characterId &&
            i.instanceData?.isEquipped &&
            i.itemInstanceId !== exotic.itemInstanceId
        );

        for (const equipped of equippedOnChar) {
            const equippedDef = inventoryStore.manifest?.[equipped.itemHash];
            if (!equippedDef) continue;
            const isEquippedExotic = equippedDef.inventory?.tierType === 6;
            const sameCategory = (isWeapon && equippedDef.itemType === 3) || (isArmor && equippedDef.itemType === 2);

            if (isEquippedExotic && sameCategory) {
                // Need to dequip this exotic first — find a legendary replacement in same bucket
                const bucketHash = equipped.bucketHash;
                const replacement = allItems.find(i =>
                    i.owner === characterId &&
                    !i.instanceData?.isEquipped &&
                    i.bucketHash === bucketHash &&
                    i.itemInstanceId !== exotic.itemInstanceId &&
                    (inventoryStore.manifest?.[i.itemHash]?.inventory?.tierType ?? 0) < 6 // Non-exotic
                );

                if (replacement) {
                    reportProgress('dequip', `Dequipping ${equippedDef.displayProperties?.name ?? 'exotic'}...`, 0, 1);
                    console.log(`[EquipManager] Dequipping exotic ${equippedDef.displayProperties?.name} by equipping ${inventoryStore.manifest?.[replacement.itemHash]?.displayProperties?.name}`);

                    try {
                        await callEquipItemsEndpoint({
                            itemIds: [replacement.itemInstanceId!],
                            characterId,
                            membershipType,
                        });
                    } catch (err: any) {
                        console.warn(`[EquipManager] Exotic dequip failed:`, err.message);
                        // Not fatal — the equip phase may still work
                    }
                } else {
                    console.warn(`[EquipManager] No legendary replacement found in bucket ${bucketHash} to dequip exotic`);
                }
            }
        }
    }

    // --- PHASE 1: TRANSFERS ---
    reportProgress('transfer', 'Transferring items...', 0, equippableItems.length);
    let transferIdx = 0;
    for (const loadoutItem of equippableItems) {
        const liveItem = allItems.find((i) => i.itemInstanceId === loadoutItem.itemInstanceId);
        if (!liveItem) {
            console.warn(`[EquipManager] Item ${loadoutItem.itemInstanceId} not found in inventory.`);
            transferIdx++;
            continue;
        }

        if (liveItem.owner !== characterId) {
            const itemName = inventoryStore.manifest?.[liveItem.itemHash]?.displayProperties?.name ?? 'item';
            reportProgress('transfer', `Moving ${itemName}...`, transferIdx, equippableItems.length);
            console.log(`[EquipManager] Transferring item ${itemName} from ${liveItem.owner} to ${characterId}`);
            try {
                // If on another character, must go to vault first
                if (liveItem.owner !== 'vault') {
                    await callTransferItemEndpoint({
                        itemReferenceHash: liveItem.itemHash,
                        stackSize: 1,
                        transferToVault: true,
                        itemId: liveItem.itemInstanceId!,
                        characterId: liveItem.owner,
                        membershipType,
                    });
                }
                // Vault to target character
                await callTransferItemEndpoint({
                    itemReferenceHash: liveItem.itemHash,
                    stackSize: 1,
                    transferToVault: false,
                    itemId: liveItem.itemInstanceId!,
                    characterId,
                    membershipType,
                });
            } catch (err: any) {
                console.error(`[EquipManager] Transfer failed for ${inventoryStore.manifest?.[liveItem.itemHash]?.displayProperties?.name}:`, err.message);
                failed.push({
                    itemInstanceId: liveItem.itemInstanceId!,
                    reason: `Transfer failed: ${err.message}`,
                    cannotEquipReason: 0,
                });
            }
        }
        transferIdx++;
    }

    // Filter equippable items to only those that successfully transferred (or were already there)
    const itemsToEquip = equippableItems.filter((i: any) => !failed.some(f => f.itemInstanceId === i.itemInstanceId));

    // --- PHASE 2: EQUIP ---
    reportProgress('equip', 'Equipping items...', 0, itemsToEquip.length);
    const itemIdBatches = chunkArray(
        itemsToEquip.map((i) => i.itemInstanceId),
        EQUIP_BATCH_SIZE
    );

    const allResults: BungieEquipItemResult[] = [];

    for (const batch of itemIdBatches) {
        console.log(`[EquipManager] Equipping batch of ${batch.length} items...`);
        try {
            const batchResults = await callEquipItemsEndpoint({
                itemIds: batch,
                characterId,
                membershipType,
            });
            allResults.push(...batchResults);
        } catch (err: any) {
            console.error(`[EquipManager] Equip batch failed:`, err.message);
            // Let's assume the whole batch failed
            for (const id of batch) {
                failed.push({
                    itemInstanceId: id,
                    reason: `Equip batch failed: ${err.message}`,
                    cannotEquipReason: 0
                });
            }
        }
    }

    for (const result of allResults) {
        if (result.equipStatus === 1 || result.cannotEquipReason === 0) {
            equipped.push(result.itemInstanceId);
        } else {
            const reason = getEquipFailureLabel(result.cannotEquipReason);
            failed.push({
                itemInstanceId: result.itemInstanceId,
                reason,
                cannotEquipReason: result.cannotEquipReason,
            });
            console.warn(
                `[EquipManager] Failed to equip ${result.itemInstanceId}: ${reason}`
            );
        }
    }

    // --- PHASE 3: SOCKET OVERRIDES (Subclass, Fashion) ---
    const itemsWithOverrides = itemsToEquip.filter(i => i.socketOverrides);
    if (itemsWithOverrides.length > 0) {
        reportProgress('sockets', 'Applying socket overrides...', 0, itemsWithOverrides.length);
    }
    let socketIdx = 0;
    for (const loadoutItem of itemsToEquip) {
        if (loadoutItem.socketOverrides) {
            reportProgress('sockets', `Configuring sockets...`, socketIdx, itemsWithOverrides.length);
            console.log(`[EquipManager] Applying socket overrides for item ${loadoutItem.itemInstanceId}`);
            for (const [socketIndexStr, plugItemHash] of Object.entries(loadoutItem.socketOverrides)) {
                const socketIndex = parseInt(socketIndexStr, 10);
                try {
                    await callInsertPlugFreeEndpoint({
                        itemId: loadoutItem.itemInstanceId,
                        plug: {
                            socketIndex,
                            socketArrayType: 0, // Default array
                            plugItemHash,
                        },
                        characterId,
                        membershipType
                    });
                } catch (err: any) {
                    console.error(`[EquipManager] Failed to insert plug ${plugItemHash} at index ${socketIndex}:`, err.message);
                }
            }
        }
    }

    // --- PHASE 4: ARMOR MODS ---
    if (loadout.modsByBucket) {
        reportProgress('mods', 'Applying armor mods...', 0, itemsToEquip.length);
        let modIdx = 0;
        for (const loadoutItem of itemsToEquip) {
            const mods = loadout.modsByBucket[loadoutItem.bucketHash];
            if (mods && mods.length > 0) {
                reportProgress('mods', `Applying mods...`, modIdx, itemsToEquip.length);
                const liveItem = allItems.find(i => i.itemInstanceId === loadoutItem.itemInstanceId);
                const itemDef = inventoryStore.manifest?.[loadoutItem.itemHash];
                
                if (liveItem && liveItem.sockets?.sockets && itemDef?.sockets?.socketCategories) {
                    // Find indices that are categorized as "ArmorMods"
                    const modSocketCategory = itemDef.sockets.socketCategories.find(
                        (sc: any) => sc.socketCategoryHash === 3313201758 || // Armor Mods
                                     sc.socketCategoryHash === 2685412949    // Also Armor Mods sometimes
                    );
                    
                    if (modSocketCategory) {
                        const socketIndices = modSocketCategory.socketIndexes as number[];
                        let remainingMods = [...mods];
                        
                        // First pass: Don't touch sockets that already have the correct mod
                        for (const socketIndex of socketIndices) {
                            const currentPlugHash = liveItem.sockets.sockets[socketIndex]?.plugHash;
                            const modIndexReq = remainingMods.indexOf(currentPlugHash!);
                            if (modIndexReq !== -1) {
                                // Already has this mod, remove from requirements
                                remainingMods.splice(modIndexReq, 1);
                            }
                        }

                        // Second pass: Insert remaining mods into remaining sockets
                        // (This is a naive approach; DIM uses a complex ModAssignmentAlgorithm to factor in energy costs)
                        for (const socketIndex of socketIndices) {
                            if (remainingMods.length === 0) break;
                            
                            // To keep it simple, we just try to jam the first remaining mod into this socket
                            // The API will reject it if it doesn't fit the socket type or energy budget
                            const modToInsert = remainingMods[0];
                            
                            try {
                                await callInsertPlugFreeEndpoint({
                                    itemId: loadoutItem.itemInstanceId,
                                    plug: {
                                        socketIndex,
                                        socketArrayType: 0,
                                        plugItemHash: modToInsert,
                                    },
                                    characterId,
                                    membershipType
                                });
                                // Successfully requested insertion (assuming no throw)
                                remainingMods.shift();
                            } catch (err: any) {
                                console.error(`[EquipManager] Failed to insert mod ${modToInsert} at index ${socketIndex}:`, err.message);
                            }
                        }
                    }
                }
            }
            modIdx++;
        }
    }

    reportProgress('done', failed.length === 0 ? 'Loadout applied!' : `Done with ${failed.length} error(s)`, equipped.length, equippableItems.length);

    const success = failed.length === 0 && equipped.length > 0;

    console.log(
        `[EquipManager] Done: ${equipped.length} equipped, ${failed.length} failed`
    );

    const hasActivityRestriction = failed.some((f) => isActivityRestriction(f.cannotEquipReason));
    const hasExoticConflict = failed.some((f) => isExoticConflict(f.cannotEquipReason));

    if (hasActivityRestriction) {
        console.warn('[EquipManager] One or more items could not be equipped — player may be in an activity.');
    }
    if (hasExoticConflict) {
        console.warn('[EquipManager] Exotic conflict detected. Consider removing the conflicting Exotic first.');
    }

    return { success, equipped, failed };
}

/**
 * Returns a real-time progress snapshot for use in loading UI.
 * Call this while iterating over batches to show a progress indicator.
 */
export function buildEquipProgress(
    total: number,
    equipped: string[],
    failed: FailedEquip[]
): EquipProgress {
    const done = equipped.length + failed.length;
    return {
        total,
        equipped: equipped.length,
        failed: failed.length,
        isComplete: done >= total,
    };
}
