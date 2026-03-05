import React, { useState } from 'react';
import { Lock, Unlock, Archive, X, ChevronDown } from 'lucide-react';
import { useBulkSelectStore } from '../../store/useBulkSelectStore';
import { useInventoryStore } from '../../store/useInventoryStore';

interface BulkActionBarProps {
    characters: any[];
}

const CLASS_NAMES = ['Titan', 'Hunter', 'Warlock'];

export const BulkActionBar: React.FC<BulkActionBarProps> = ({ characters }) => {
    const selectedIds = useBulkSelectStore((s) => s.selectedIds);
    const clear = useBulkSelectStore((s) => s.clear);
    const setLockState = useInventoryStore((s) => s.setLockState);
    const moveItem = useInventoryStore((s) => s.moveItem);
    const items = useInventoryStore((s) => s.items);
    const [showTransferMenu, setShowTransferMenu] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    const count = selectedIds.size;
    if (count === 0) return null;

    // Get selected items from the store
    const selectedItems = items.filter((i) => i.itemInstanceId && selectedIds.has(i.itemInstanceId));

    const handleBulkLock = async (locked: boolean) => {
        setIsProcessing(true);
        for (const item of selectedItems) {
            if (item.itemInstanceId && item.lockable) {
                try {
                    await setLockState(item.itemInstanceId, locked);
                } catch (err) {
                    console.warn(`[BulkAction] Failed to ${locked ? 'lock' : 'unlock'} ${item.itemInstanceId}:`, err);
                }
            }
        }
        setIsProcessing(false);
        clear();
    };

    const handleBulkMove = async (targetId: string, isVault: boolean) => {
        setShowTransferMenu(false);
        setIsProcessing(true);
        for (const item of selectedItems) {
            if (item.itemInstanceId && item.owner !== targetId) {
                try {
                    await moveItem(item.itemInstanceId, item.itemHash, targetId, isVault);
                } catch (err) {
                    console.warn(`[BulkAction] Failed to move ${item.itemInstanceId}:`, err);
                }
            }
        }
        setIsProcessing(false);
        clear();
    };

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[150] animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="bg-[#1a1a1a] border border-white/15 rounded-lg shadow-2xl px-4 py-3 flex items-center gap-3">
                {/* Count badge */}
                <div className="flex items-center gap-2">
                    <span className="bg-[#f5dc56] text-black text-xs font-bold px-2 py-0.5 rounded-full tabular-nums">
                        {count}
                    </span>
                    <span className="text-sm text-gray-300 font-semibold">
                        {count === 1 ? 'item' : 'items'} selected
                    </span>
                </div>

                <div className="w-px h-6 bg-white/10" />

                {/* Lock */}
                <button
                    onClick={() => handleBulkLock(true)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                    title="Lock all selected"
                >
                    <Lock size={14} />
                    Lock
                </button>

                {/* Unlock */}
                <button
                    onClick={() => handleBulkLock(false)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                    title="Unlock all selected"
                >
                    <Unlock size={14} />
                    Unlock
                </button>

                <div className="w-px h-6 bg-white/10" />

                {/* Move to Vault */}
                <button
                    onClick={() => handleBulkMove('vault', true)}
                    disabled={isProcessing}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                    title="Move all to Vault"
                >
                    <Archive size={14} />
                    Vault
                </button>

                {/* Transfer to Character dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowTransferMenu(!showTransferMenu)}
                        disabled={isProcessing}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                        title="Move to character"
                    >
                        Transfer
                        <ChevronDown size={12} />
                    </button>

                    {showTransferMenu && (
                        <div className="absolute bottom-full left-0 mb-2 bg-[#222] border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                            {characters.map((char: any) => (
                                <button
                                    key={char.characterId}
                                    onClick={() => handleBulkMove(char.characterId, false)}
                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                                >
                                    <div
                                        className="w-4 h-4 rounded-full bg-cover flex-shrink-0"
                                        style={{
                                            backgroundImage: `url(https://www.bungie.net${char.emblemPath})`,
                                        }}
                                    />
                                    {CLASS_NAMES[char.classType] || 'Unknown'}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-px h-6 bg-white/10" />

                {/* Clear selection */}
                <button
                    onClick={clear}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    title="Clear selection"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
};
