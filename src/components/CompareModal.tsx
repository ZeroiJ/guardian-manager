/**
 * CompareModal — DIM-style bottom sheet compare view.
 * Ported from DIM: src/app/compare/Compare.tsx
 *
 * Shows ALL similar items (same bucket + name) as scrollable columns
 * with aligned stat rows. Single-click from item popup opens this.
 */
import React, { useMemo, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { calculateStats } from '@/lib/destiny/stat-manager';
import { categorizeSockets } from '@/lib/destiny/socket-helper';
import { ItemSocket } from '@/components/item/ItemSocket';
import { BungieImage } from '@/components/ui/BungieImage';
import { CompareSession, ManifestDefinition } from '@/store/useInventoryStore';
import { GuardianItem } from '@/services/profile/types';
import { STAT_WHITELIST } from '@/utils/manifest-helper';

// ============================================================================
// TYPES
// ============================================================================

interface CompareModalProps {
    /** The active compare session from the store. */
    session: CompareSession;
    /** All items matching the session filter (computed in App.tsx). */
    items: GuardianItem[];
    /** Manifest definitions. */
    definitions: Record<number, ManifestDefinition>;
    /** Close the compare sheet. */
    onClose: () => void;
}

const RARITY_COLORS: Record<number, string> = {
    6: 'border-rarity-exotic',
    5: 'border-rarity-legendary',
    4: 'border-rarity-rare',
    3: 'border-rarity-uncommon',
    2: 'border-rarity-common',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Single item column header — icon + name + power + remove button. */
function CompareItemHeader({
    item,
    def,
    isInitial,
    onRemove,
}: {
    item: GuardianItem;
    def: ManifestDefinition | undefined;
    isInitial: boolean;
    onRemove: () => void;
}) {
    const tierType = def?.inventory?.tierType || 0;
    const borderClass = isInitial ? 'border-[#f5dc56]' : (RARITY_COLORS[tierType] || 'border-white/20');
    const power = item.instanceData?.primaryStat?.value;

    return (
        <div className="flex flex-col items-center gap-1.5 min-w-[120px] max-w-[120px] px-2 relative group">
            {/* Remove button */}
            <button
                onClick={onRemove}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                title="Remove from comparison"
            >
                <X className="w-3 h-3 text-white" />
            </button>

            <div className={`w-14 h-14 rounded border-2 ${borderClass} overflow-hidden bg-void-surface shrink-0`}>
                {def?.displayProperties?.icon && (
                    <BungieImage
                        src={def.displayProperties.icon}
                        className="w-full h-full object-cover"
                    />
                )}
            </div>
            <div className="text-center min-w-0 w-full">
                <div className="text-[11px] font-bold text-white truncate">
                    {def?.displayProperties?.name || 'Unknown'}
                </div>
                {power && (
                    <div className="text-[10px] font-mono text-[#f5dc56]">
                        ✦ {power}
                    </div>
                )}
            </div>
        </div>
    );
}

/** A single stat row spanning all columns. */
function StatRow({
    label,
    values,
    maxValue,
}: {
    label: string;
    values: number[];
    maxValue: number;
}) {
    const best = Math.max(...values);
    const worst = Math.min(...values.filter(v => v > 0));
    const allSame = values.every(v => v === values[0]);

    return (
        <div className="flex items-center border-b border-white/5 last:border-0">
            {/* Stat label */}
            <div className="w-24 shrink-0 text-right pr-3 py-1.5 text-xs text-void-text-secondary truncate">
                {label}
            </div>

            {/* Value cells */}
            {values.map((value, i) => {
                const isBest = !allSame && value === best && value > 0;
                const isWorst = !allSame && value === worst && values.length > 1;
                const pct = maxValue > 0 ? Math.min(100, (value / maxValue) * 100) : 0;
                const colorClass = isBest ? 'text-green-400' : isWorst ? 'text-red-400' : 'text-white';
                const barColor = isBest ? 'bg-green-400/60' : isWorst ? 'bg-red-400/40' : 'bg-white/30';

                return (
                    <div
                        key={i}
                        className="min-w-[120px] max-w-[120px] px-2 py-1.5 flex items-center gap-2"
                    >
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                        <span className={`text-xs font-mono tabular-nums w-7 text-right ${colorClass}`}>
                            {value || '—'}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

/** Perk row showing sockets across all item columns. */
function PerkRow({
    label,
    itemPerks,
}: {
    label: string;
    itemPerks: { plugDef: Record<string, unknown>; categoryHash: number; isEnabled: boolean }[][];
}) {
    if (itemPerks.every(p => p.length === 0)) return null;

    return (
        <div className="flex items-start border-b border-white/5 last:border-0">
            <div className="w-24 shrink-0 text-right pr-3 py-2 text-xs text-void-text-secondary">
                {label}
            </div>
            {itemPerks.map((perks, i) => (
                <div
                    key={i}
                    className="min-w-[120px] max-w-[120px] px-2 py-1.5 flex flex-wrap gap-1 justify-center"
                >
                    {perks.map((s, j) => (
                        <ItemSocket
                            key={j}
                            plugDef={s.plugDef}
                            categoryHash={s.categoryHash}
                            isActive={s.isEnabled}
                        />
                    ))}
                    {perks.length === 0 && <div className="w-8 h-8" />}
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * DIM-style compare sheet. Slides up from the bottom,
 * auto-discovers similar items, renders them as scrollable columns.
 */
export const CompareModal: React.FC<CompareModalProps> = ({
    session,
    items,
    definitions,
    onClose,
}) => {
    // Track which items are hidden (removed from view, not from inventory)
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    const [showPerks, setShowPerks] = useState(true);

    const visibleItems = useMemo(
        () => items.filter(i => i.itemInstanceId && !hiddenIds.has(i.itemInstanceId)),
        [items, hiddenIds],
    );

    // Sort: initial item first, then by power descending
    const sortedItems = useMemo(() => {
        return [...visibleItems].sort((a, b) => {
            if (a.itemInstanceId === session.initialItemId) return -1;
            if (b.itemInstanceId === session.initialItemId) return 1;
            const pA = a.instanceData?.primaryStat?.value || 0;
            const pB = b.instanceData?.primaryStat?.value || 0;
            return pB - pA;
        });
    }, [visibleItems, session.initialItemId]);

    // Calculate stats for all visible items
    const allItemStats = useMemo(() => {
        return sortedItems.map(item => {
            const def = definitions[item.itemHash];
            return calculateStats(item, def, definitions);
        });
    }, [sortedItems, definitions]);

    // Build unified stat list (union of all stat hashes across items)
    const statInfo = useMemo(() => {
        const statMap = new Map<number, { label: string; maxValue: number; order: number }>();
        for (const itemStats of allItemStats) {
            for (const s of itemStats) {
                const existing = statMap.get(s.statHash);
                const whitelistEntry = STAT_WHITELIST[s.statHash];
                const order = whitelistEntry?.sort ?? 999;
                if (!existing) {
                    statMap.set(s.statHash, {
                        label: s.label,
                        maxValue: Math.max(s.maximumValue, s.displayValue),
                        order,
                    });
                } else {
                    existing.maxValue = Math.max(existing.maxValue, s.maximumValue, s.displayValue);
                    if (order < existing.order) existing.order = order;
                }
            }
        }
        return Array.from(statMap.entries())
            .sort(([, a], [, b]) => a.order - b.order);
    }, [allItemStats]);

    // Build per-item stat value arrays aligned to statInfo order
    const statValues = useMemo(() => {
        return statInfo.map(([statHash]) => {
            return allItemStats.map(itemStats => {
                const found = itemStats.find(s => s.statHash === statHash);
                return found?.displayValue || 0;
            });
        });
    }, [statInfo, allItemStats]);

    // Categorize sockets per item for perk rows
    const allItemSockets = useMemo(() => {
        return sortedItems.map(item => {
            const def = definitions[item.itemHash];
            return categorizeSockets(item, def, definitions);
        });
    }, [sortedItems, definitions]);

    const removeItem = (id: string) => {
        const newHidden = new Set(hiddenIds);
        newHidden.add(id);
        // If all items would be hidden, close instead
        if (newHidden.size >= items.length) {
            onClose();
            return;
        }
        setHiddenIds(newHidden);
    };

    const firstDef = sortedItems[0] ? definitions[sortedItems[0].itemHash] : undefined;
    const typeName = firstDef?.itemTypeDisplayName || 'Items';

    if (sortedItems.length === 0) {
        onClose();
        return null;
    }

    return (
        <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col animate-slideUp">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 -z-10" onClick={onClose} />

            {/* Sheet */}
            <div className="bg-void-elevated border-t border-void-border rounded-t-xl shadow-2xl max-h-[70vh] flex flex-col">

                {/* ── HEADER ── */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-void-border bg-black/40 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-bold text-white tracking-tight">
                            Compare {typeName}
                        </h2>
                        <span className="text-xs text-void-text-muted bg-white/5 px-2 py-0.5 rounded">
                            {sortedItems.length} items
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowPerks(!showPerks)}
                            className={`text-xs px-2 py-1 rounded transition-colors ${showPerks
                                ? 'bg-white/10 text-white'
                                : 'text-void-text-muted hover:text-white'
                                }`}
                        >
                            Perks
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                        >
                            <ChevronDown className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* ── CONTENT (scrollable both ways) ── */}
                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <div className="min-w-max">

                        {/* Item Headers Row */}
                        <div className="flex items-end sticky top-0 bg-void-elevated z-10 border-b border-void-border pb-2 pt-3">
                            <div className="w-24 shrink-0" /> {/* Spacer for label column */}
                            {sortedItems.map(item => (
                                <CompareItemHeader
                                    key={item.itemInstanceId}
                                    item={item}
                                    def={definitions[item.itemHash]}
                                    isInitial={item.itemInstanceId === session.initialItemId}
                                    onRemove={() => removeItem(item.itemInstanceId || '')}
                                />
                            ))}
                        </div>

                        {/* Stat Rows */}
                        <div className="py-1">
                            {statInfo.map(([statHash, info], rowIdx) => (
                                <StatRow
                                    key={statHash}
                                    label={info.label}
                                    values={statValues[rowIdx]}
                                    maxValue={info.maxValue}
                                />
                            ))}
                        </div>

                        {/* Perk Rows (toggleable) */}
                        {showPerks && allItemSockets.length > 0 && (
                            <>
                                <div className="flex items-center gap-2 px-4 py-1.5">
                                    <div className="h-px flex-1 bg-white/10" />
                                    <span className="text-[10px] uppercase tracking-widest text-void-text-muted font-bold">
                                        Perks & Mods
                                    </span>
                                    <div className="h-px flex-1 bg-white/10" />
                                </div>

                                {/* Intrinsic */}
                                <PerkRow
                                    label="Frame"
                                    itemPerks={allItemSockets.map(s =>
                                        s.intrinsic ? [s.intrinsic] : [],
                                    )}
                                />
                                {/* Perks */}
                                <PerkRow
                                    label="Perks"
                                    itemPerks={allItemSockets.map(s => s.perks)}
                                />
                                {/* Weapon Mods */}
                                <PerkRow
                                    label="Mods"
                                    itemPerks={allItemSockets.map(s =>
                                        s.weaponMods.length > 0 ? s.weaponMods : s.mods,
                                    )}
                                />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
