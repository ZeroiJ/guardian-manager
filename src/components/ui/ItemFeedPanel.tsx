/**
 * ItemFeedPanel — Shows a chronological list of newly acquired items.
 *
 * Listens to the Item Feed store for new items detected between
 * inventory refreshes. Renders as a collapsible sidebar panel.
 */
import React, { useMemo } from 'react';
import { useItemFeedStore, type FeedItem } from '@/store/itemFeedStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { BungieImage } from '@/components/ui/BungieImage';
import { X, Bell, Check, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// ─── Rarity colors for feed item borders ─────────────────────────────
const rarityBorderColors: Record<number, string> = {
    6: '#ceae33', // Exotic
    5: '#522f65', // Legendary
    4: '#5076a3', // Rare
    3: '#366f42', // Uncommon
    2: '#c3bcb4', // Common
};

// ─── Time formatting ─────────────────────────────────────────────────
function timeAgo(timestamp: number): string {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
}

// ─── Single Feed Item ────────────────────────────────────────────────
const FeedItemRow: React.FC<{ feedItem: FeedItem }> = ({ feedItem }) => {
    const manifest = useInventoryStore((s) => s.manifest);
    const dismissItem = useItemFeedStore((s) => s.dismissItem);
    const characters = useInventoryStore((s) => s.characters);

    const def = manifest?.[feedItem.itemHash];
    if (!def) return null;

    const icon = def.displayProperties?.icon;
    const name = def.displayProperties?.name || 'Unknown Item';
    const tierType = def.inventory?.tierType ?? 2;
    const borderColor = rarityBorderColors[tierType] ?? '#555';
    const ownerLabel =
        feedItem.owner === 'vault'
            ? 'Vault'
            : characters?.[feedItem.owner]?.classType !== undefined
                ? ['Titan', 'Hunter', 'Warlock'][characters[feedItem.owner].classType] ?? 'Unknown'
                : 'Inventory';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex items-center gap-2.5 py-1.5 px-2 rounded bg-white/[0.02] hover:bg-white/[0.05] transition-colors group"
        >
            {/* Item icon */}
            {icon && (
                <div
                    className="w-8 h-8 rounded border overflow-hidden shrink-0"
                    style={{ borderColor: `${borderColor}80` }}
                >
                    <BungieImage src={icon} className="w-full h-full" />
                </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div
                    className="text-xs font-bold truncate"
                    style={{ color: tierType === 6 ? '#ceae33' : 'white' }}
                >
                    {name}
                </div>
                <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                    <span>{ownerLabel}</span>
                    <span>·</span>
                    <span>{timeAgo(feedItem.acquiredAt)}</span>
                </div>
            </div>

            {/* Dismiss button */}
            <button
                onClick={() => dismissItem(feedItem.itemInstanceId)}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-white"
                title="Dismiss"
            >
                <Check size={12} />
            </button>
        </motion.div>
    );
};

// ─── Feed Panel ──────────────────────────────────────────────────────
interface ItemFeedPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ItemFeedPanel: React.FC<ItemFeedPanelProps> = ({ isOpen, onClose }) => {
    const feed = useItemFeedStore((s) => s.feed);
    const dismissAll = useItemFeedStore((s) => s.dismissAll);

    const undismissed = useMemo(() => feed.filter((f) => !f.dismissed), [feed]);
    const dismissed = useMemo(() => feed.filter((f) => f.dismissed), [feed]);

    if (!isOpen) return null;

    return (
        <div className="fixed top-12 right-0 bottom-0 w-80 z-[150] bg-[#0a0a0c]/95 border-l border-white/10 backdrop-blur-md flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-cyan-400" />
                    <span className="text-sm font-bold font-rajdhani uppercase tracking-widest text-white">
                        Item Feed
                    </span>
                    {undismissed.length > 0 && (
                        <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded-full font-bold">
                            {undismissed.length}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {undismissed.length > 0 && (
                        <button
                            onClick={dismissAll}
                            className="text-[9px] text-gray-500 hover:text-white uppercase tracking-wider font-bold"
                            title="Dismiss all"
                        >
                            Clear
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Feed list */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {feed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Bell size={24} className="text-gray-700 mb-3" />
                        <p className="text-xs text-gray-600">
                            No new items detected yet.
                        </p>
                        <p className="text-[10px] text-gray-700 mt-1">
                            Items will appear here when your inventory changes.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Undismissed items */}
                        {undismissed.length > 0 && (
                            <div>
                                <div className="text-[9px] text-gray-600 uppercase tracking-widest font-bold px-2 py-1">
                                    New ({undismissed.length})
                                </div>
                                <AnimatePresence mode="popLayout">
                                    {undismissed.map((item) => (
                                        <FeedItemRow key={item.itemInstanceId} feedItem={item} />
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Dismissed items (faded) */}
                        {dismissed.length > 0 && (
                            <div className="mt-3 opacity-40">
                                <div className="text-[9px] text-gray-600 uppercase tracking-widest font-bold px-2 py-1">
                                    Earlier ({dismissed.length})
                                </div>
                                {dismissed.slice(0, 20).map((item) => (
                                    <FeedItemRow key={item.itemInstanceId} feedItem={item} />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

/**
 * ItemFeedButton — Renders a small bell icon in the nav bar.
 * Shows a badge count of undismissed items.
 */
export const ItemFeedButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    const undismissedCount = useItemFeedStore((s) => s.feed.filter((f) => !f.dismissed).length);

    return (
        <button
            onClick={onClick}
            className="relative text-gray-500 hover:text-white transition-colors"
            title={undismissedCount > 0 ? `${undismissedCount} new items` : 'Item Feed'}
        >
            <Bell size={14} />
            {undismissedCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold bg-cyan-500 text-black rounded-full">
                    {undismissedCount > 99 ? '99' : undismissedCount}
                </span>
            )}
        </button>
    );
};
