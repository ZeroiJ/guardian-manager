import React, { useState, useCallback } from 'react';
import { callInsertPlugFreeEndpoint } from '@/lib/bungie/equipManager';
import { useInventoryStore } from '@/store/useInventoryStore';

/**
 * Socket Stripping — Remove mods from armor items
 *
 * Inspired by DIM's src/app/strip-sockets/strip-sockets.ts
 * Iterates armor sockets and resets non-empty mod sockets to their empty plug hash.
 */

// Known empty plug hashes for armor mod sockets
const EMPTY_MOD_HASH = 2600899007;      // General armor mod empty
const EMPTY_LEGACY_HASH = 4173924323;    // Legacy / Artifice empty
const EMPTY_ACTIVITY_HASH = 2321980680;  // Activity mod empty

const KNOWN_EMPTY_HASHES = new Set([
    EMPTY_MOD_HASH,
    EMPTY_LEGACY_HASH,
    EMPTY_ACTIVITY_HASH,
]);

interface StripProgress {
    total: number;
    done: number;
    errors: number;
    currentItem?: string;
}

interface StripSocketsProps {
    /** Items to strip mods from — should be armor items on a single character */
    items: any[];
    characterId: string;
    manifest: Record<number, any>;
    onClose: () => void;
}

export const StripSockets: React.FC<StripSocketsProps> = ({
    items,
    characterId,
    manifest,
    onClose,
}) => {
    const [stripMods, setStripMods] = useState(true);
    const [stripShaders, setStripShaders] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState<StripProgress | null>(null);

    const profile = useInventoryStore(s => s.profile);
    const membershipType = profile?.profile?.data?.userInfo?.membershipType ?? 3;

    /**
     * Find all strippable sockets on an item.
     * A socket is strippable if:
     * 1. It has an emptyPlugHash (socket can be emptied)
     * 2. The current plug is different from the empty plug
     * 3. The plug type matches the selected categories (mod vs shader)
     */
    const findStrippableSockets = useCallback((item: any) => {
        const def = manifest[item.itemHash];
        if (!def?.sockets?.socketEntries) return [];

        const sockets: Array<{ socketIndex: number; emptyHash: number; currentName: string }> = [];

        for (let i = 0; i < def.sockets.socketEntries.length; i++) {
            const entry = def.sockets.socketEntries[i];
            const emptyHash = entry.singleInitialItemHash;

            // Skip sockets without an empty hash
            if (!emptyHash || emptyHash === 0) continue;

            // Get the current plug from live data
            const liveSocket = item.sockets?.sockets?.[i];
            const currentPlugHash = liveSocket?.plugHash ?? entry.singleInitialItemHash;

            // If already empty, skip
            if (currentPlugHash === emptyHash || KNOWN_EMPTY_HASHES.has(currentPlugHash)) continue;

            // Check the plug definition to categorize
            const plugDef = manifest[currentPlugHash];
            if (!plugDef) continue;

            const isShader = plugDef.itemCategoryHashes?.includes(41) ?? false; // ItemCategoryHashes.Shaders
            const isArmorMod = (plugDef.itemCategoryHashes?.includes(4104513227) ?? false) || // ArmorMods
                               (plugDef.plug?.plugCategoryIdentifier?.includes('armor') ?? false);

            if ((stripMods && isArmorMod) || (stripShaders && isShader)) {
                sockets.push({
                    socketIndex: i,
                    emptyHash,
                    currentName: plugDef.displayProperties?.name ?? 'Unknown Mod',
                });
            }
        }

        return sockets;
    }, [manifest, stripMods, stripShaders]);

    const handleStrip = async () => {
        setIsRunning(true);

        // Collect all socket actions
        const actions: Array<{
            item: any;
            socketIndex: number;
            emptyHash: number;
            currentName: string;
        }> = [];

        for (const item of items) {
            const sockets = findStrippableSockets(item);
            for (const s of sockets) {
                actions.push({ item, ...s });
            }
        }

        if (actions.length === 0) {
            setProgress({ total: 0, done: 0, errors: 0 });
            setIsRunning(false);
            return;
        }

        setProgress({ total: actions.length, done: 0, errors: 0 });

        let done = 0;
        let errors = 0;

        for (const action of actions) {
            const def = manifest[action.item.itemHash];
            setProgress({
                total: actions.length,
                done,
                errors,
                currentItem: def?.displayProperties?.name ?? 'Item',
            });

            try {
                await callInsertPlugFreeEndpoint({
                    itemId: action.item.itemInstanceId,
                    plug: {
                        socketIndex: action.socketIndex,
                        socketArrayType: 0,
                        plugItemHash: action.emptyHash,
                    },
                    characterId,
                    membershipType,
                });
                done++;
            } catch (err: any) {
                console.error(`[StripSockets] Failed to strip socket ${action.socketIndex}:`, err.message);
                errors++;
                done++;
            }
        }

        setProgress({ total: actions.length, done, errors });
        setIsRunning(false);
    };

    const armorItems = items.filter(item => {
        const def = manifest[item.itemHash];
        return def?.itemType === 2; // Armor
    });

    const previewCount = armorItems.reduce((acc, item) => {
        return acc + findStrippableSockets(item).length;
    }, 0);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-[#111122] border border-white/10 rounded-lg w-full max-w-md shadow-2xl">
                {/* Header */}
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Strip Sockets</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="px-5 py-4 space-y-4">
                    <p className="text-sm text-gray-400">
                        Remove mods and shaders from <span className="text-white font-medium">{armorItems.length}</span> armor pieces.
                    </p>

                    {/* Category toggles */}
                    <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={stripMods}
                                onChange={e => setStripMods(e.target.checked)}
                                disabled={isRunning}
                                className="accent-[#7af48b] w-4 h-4"
                            />
                            <span className="text-sm text-white">Armor Mods</span>
                            <span className="text-xs text-gray-500 ml-auto">Energy mods, stat mods, combat mods</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={stripShaders}
                                onChange={e => setStripShaders(e.target.checked)}
                                disabled={isRunning}
                                className="accent-[#7af48b] w-4 h-4"
                            />
                            <span className="text-sm text-white">Shaders</span>
                            <span className="text-xs text-gray-500 ml-auto">Cosmetic shaders on armor</span>
                        </label>
                    </div>

                    {/* Preview count */}
                    <div className="text-sm text-gray-400 bg-[#0a0a12] rounded px-3 py-2 border border-white/5">
                        {previewCount === 0 
                            ? 'No sockets to strip with current selection.'
                            : `${previewCount} socket${previewCount !== 1 ? 's' : ''} will be cleared.`
                        }
                    </div>

                    {/* Progress */}
                    {progress && (
                        <div className="space-y-2">
                            <div className="w-full bg-[#0a0a12] rounded-full h-2 overflow-hidden border border-white/5">
                                <div
                                    className="bg-[#7af48b] h-full rounded-full transition-all duration-300"
                                    style={{ width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                                <span>{progress.done}/{progress.total} sockets</span>
                                {progress.errors > 0 && (
                                    <span className="text-red-400">{progress.errors} failed</span>
                                )}
                            </div>
                            {progress.currentItem && isRunning && (
                                <div className="text-xs text-gray-500 truncate">
                                    Stripping: {progress.currentItem}...
                                </div>
                            )}
                            {!isRunning && progress.done > 0 && (
                                <div className="text-sm text-[#7af48b] font-medium">
                                    ✓ Done! {progress.done - progress.errors} sockets stripped.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-white/5 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-sm rounded bg-transparent border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                    >
                        {progress && !isRunning ? 'Close' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleStrip}
                        disabled={isRunning || previewCount === 0}
                        className="px-4 py-1.5 text-sm rounded bg-red-500/80 text-white font-medium hover:bg-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isRunning ? 'Stripping...' : `Strip ${previewCount} Socket${previewCount !== 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
};
