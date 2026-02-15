/**
 * CompareModal — DIM-style compare view.
 * Ported from DIM: src/app/compare/Compare.tsx
 *
 * Shows similar items as scrollable columns with stat rows
 * (numbers-only, no bars), archetype, perks, and mods.
 */
import React, { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { categorizeSockets } from '../lib/destiny/socket-helper';
import { ItemSocket } from './item/ItemSocket';
import { BungieImage } from './ui/BungieImage';
import { CompareSession, ManifestDefinition } from '../store/useInventoryStore';
import { GuardianItem } from '../services/profile/types';
import { STAT_WHITELIST } from '../utils/manifest-helper';

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

/** Internal stat shape used during calculation. */
interface CompareStat {
    statHash: number;
    label: string;
    value: number;
    order: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Column width for each item — kept narrow like DIM */
const COL_W = 'min-w-[140px] max-w-[160px]';
const LABEL_W = 'w-20 shrink-0';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Item column header — icon + name + power + close button.
 * Matches DIM's compact header style.
 */
/**
 * Item column header — icon + name + power + close button.
 * Matches DIM's compact header style.
 */
const CompareItemHeader: React.FC<{
    item: GuardianItem;
    def: ManifestDefinition | undefined;
    isInitial: boolean;
    onRemove: () => void;
}> = ({ item, def, isInitial, onRemove }) => {
    const power = item.instanceData?.primaryStat?.value;

    return (
        <div className={`${COL_W} px-2 py-2 relative group`}>
            {/* Close button — always top right */}
            <button
                onClick={onRemove}
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center
                           text-gray-500 hover:text-white transition-colors z-10"
                title="Remove from comparison"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            {/* Name (DIM blue link style) */}
            <div className={`text-xs font-semibold truncate pr-5 mb-1.5 ${isInitial ? 'text-[#80b3ff]' : 'text-[#7da5d6]'
                }`}>
                {def?.displayProperties?.name || 'Unknown'}
            </div>

            {/* Icon + Power */}
            <div className="flex items-center gap-2">
                <div className="w-12 h-12 rounded border border-white/20 overflow-hidden bg-[#1a1a2e] shrink-0">
                    {def?.displayProperties?.icon && (
                        <BungieImage
                            src={def.displayProperties.icon}
                            className="w-full h-full object-cover"
                        />
                    )}
                    {power && (
                        <div className="absolute bottom-[2px] right-[6px] text-[9px] font-bold text-[#f5dc56] bg-black/70 px-1 rounded">
                            {power}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * A single stat row — numbers only, no bars.
 * Green = best, Red = worst, White = default. Matches DIM exactly.
 */
/**
 * A single stat row — numbers only, no bars.
 * Green = best, Red = worst, White = default. Matches DIM exactly.
 */
const StatRow: React.FC<{
    label: string;
    values: number[];
}> = ({ label, values }) => {
    const nonZero = values.filter(v => v > 0);
    const best = nonZero.length > 0 ? Math.max(...nonZero) : 0;
    const worst = nonZero.length > 0 ? Math.min(...nonZero) : 0;
    const allSame = values.every(v => v === values[0]);

    return (
        <div className="flex items-center">
            {/* Stat label */}
            <div className={`${LABEL_W} text-right pr-3 py-[3px] text-[11px] text-gray-400`}>
                {label}
            </div>

            {/* Value cells — just numbers */}
            {values.map((value, i) => {
                const isBest = !allSame && value === best && value > 0;
                const isWorst = !allSame && value === worst && nonZero.length > 1;
                const colorClass = isBest
                    ? 'text-[#51b853]'   // DIM green
                    : isWorst
                        ? 'text-[#d14334]'   // DIM red
                        : 'text-white';

                return (
                    <div
                        key={i}
                        className={`${COL_W} px-2 py-[3px] text-[13px] font-mono tabular-nums ${colorClass}`}
                    >
                        {value || '—'}
                    </div>
                );
            })}
        </div>
    );
};

/**
 * Archetype row showing the intrinsic frame icon + name for each item.
 * Matches DIM's "Archetype" row.
 */
/**
 * Archetype row showing the intrinsic frame icon + name for each item.
 * Matches DIM's "Archetype" row.
 */
const ArchetypeRow: React.FC<{
    itemSockets: ReturnType<typeof categorizeSockets>[];
}> = ({ itemSockets }) => {
    const hasAny = itemSockets.some(s => s.intrinsic !== null);
    if (!hasAny) return null;

    return (
        <div className="flex items-center border-t border-white/10">
            <div className={`${LABEL_W} text-right pr-3 py-2 text-[11px] text-gray-400`}>
                Archetype
            </div>
            {itemSockets.map((sockets, i) => {
                const intrinsic = sockets.intrinsic;
                if (!intrinsic?.plugDef) {
                    return <div key={i} className={`${COL_W} px-2 py-2`} />;
                }
                const dp = (intrinsic.plugDef as Record<string, any>).displayProperties;
                return (
                    <div key={i} className={`${COL_W} px-2 py-2 flex items-center gap-1.5`}>
                        {dp?.icon && (
                            <div className="w-8 h-8 rounded-sm border border-[#e2bf36] overflow-hidden bg-[#222] shrink-0">
                                <BungieImage src={dp.icon} className="w-full h-full" />
                            </div>
                        )}
                        <span className="text-[11px] text-gray-300 leading-tight">
                            {dp?.name || ''}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

/**
 * Perk/Mod row showing socket icons across all item columns.
 * Perks = circular, Mods = rounded-square, matching DIM.
 */
/**
 * Perk/Mod row showing socket icons across all item columns.
 * Perks = circular, Mods = rounded-square, matching DIM.
 */
const PerkRow: React.FC<{
    label: string;
    itemPerks: { plugDef: Record<string, unknown>; categoryHash: number; isEnabled: boolean }[][];
}> = ({ label, itemPerks }) => {
    if (itemPerks.every(p => p.length === 0)) return null;

    return (
        <div className="flex items-start">
            <div className={`${LABEL_W} text-right pr-3 py-2 text-[11px] text-gray-400`}>
                {label}
            </div>
            {itemPerks.map((perks, i) => (
                <div
                    key={i}
                    className={`${COL_W} px-1 py-1.5 flex flex-wrap gap-1`}
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
};

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

    // ── STATS (per-instance live values from Bungie API) ──
    const allItemStats = useMemo(() => {
        return sortedItems.map(item => {
            const def = definitions[item.itemHash];
            if (!def?.stats?.stats) return [] as CompareStat[];

            const liveStats = item?.stats || {};

            return (Object.entries(def.stats.stats) as [string, Record<string, unknown>][])
                .map(([hashStr, defStat]) => {
                    const hash = parseInt(hashStr, 10);
                    const info = STAT_WHITELIST[hash];
                    if (!info) return null;

                    const liveEntry = liveStats[hashStr] || liveStats[hash];
                    let value = (liveEntry as Record<string, unknown>)?.value as number | undefined;
                    if (value === undefined) {
                        value = (defStat as Record<string, unknown>).value as number || 0;
                    }
                    if (typeof value !== 'number') return null;

                    return { statHash: hash, label: info.label, value, order: info.sort } as CompareStat;
                })
                .filter((s): s is CompareStat => s !== null)
                .sort((a, b) => a.order - b.order);
        });
    }, [sortedItems, definitions]);

    // Unified stat list (union of all stats)
    const statInfo = useMemo(() => {
        const statMap = new Map<number, { label: string; order: number }>();
        for (const itemStats of allItemStats) {
            for (const s of itemStats) {
                if (!statMap.has(s.statHash)) {
                    statMap.set(s.statHash, { label: s.label, order: s.order });
                }
            }
        }
        return Array.from(statMap.entries()).sort(([, a], [, b]) => a.order - b.order);
    }, [allItemStats]);

    // Per-item stat arrays aligned to statInfo
    const statValues = useMemo(() => {
        return statInfo.map(([statHash]) => {
            return allItemStats.map(itemStats => {
                const found = itemStats.find(s => s.statHash === statHash);
                return found?.value || 0;
            });
        });
    }, [statInfo, allItemStats]);

    // ── SOCKETS ──
    const allItemSockets = useMemo(() => {
        return sortedItems.map(item => {
            const def = definitions[item.itemHash];
            return categorizeSockets(item, def, definitions);
        });
    }, [sortedItems, definitions]);

    const removeItem = (id: string) => {
        const newHidden = new Set(hiddenIds);
        newHidden.add(id);
        if (newHidden.size >= items.length) {
            onClose();
            return;
        }
        setHiddenIds(newHidden);
    };

    const firstDef = sortedItems[0] ? definitions[sortedItems[0].itemHash] : undefined;
    const typeName = firstDef?.itemTypeDisplayName || firstDef?.displayProperties?.name || 'Items';

    if (sortedItems.length === 0) {
        onClose();
        return null;
    }

    return (
        <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col animate-slideUp">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 -z-10" onClick={onClose} />

            {/* Sheet */}
            <div className="bg-black/80 backdrop-blur-md border-t border-white/10 rounded-t-xl shadow-2xl max-h-[75vh] flex flex-col">

                {/* ── HEADER BAR ── */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5 rounded-t-xl shrink-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-[13px] font-bold text-white">
                            {typeName}
                        </h2>
                        <span className="text-[11px] text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                            {sortedItems.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowPerks(!showPerks)}
                            className={`text-[11px] px-2 py-0.5 rounded transition-colors ${showPerks ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'
                                }`}
                        >
                            Perks
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* ── SCROLLABLE TABLE ── */}
                <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <div className="min-w-max">

                        {/* ── ITEM HEADERS ── */}
                        <div className="flex items-start sticky top-0 bg-[#1a1a2e] z-10 border-b border-white/10">
                            <div className={LABEL_W} /> {/* label spacer */}
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

                        {/* ── STAT ROWS (numbers only, no bars) ── */}
                        <div className="py-0.5">
                            {statInfo.map(([statHash, info], rowIdx) => (
                                <StatRow
                                    key={statHash}
                                    label={info.label}
                                    values={statValues[rowIdx]}
                                />
                            ))}
                        </div>

                        {/* ── ARCHETYPE + PERKS + MODS ── */}
                        {showPerks && allItemSockets.length > 0 && (
                            <div className="border-t border-white/10">
                                {/* Archetype (Frame) */}
                                <ArchetypeRow itemSockets={allItemSockets} />

                                {/* Perks */}
                                <PerkRow
                                    label="Perks"
                                    itemPerks={allItemSockets.map(s => s.perks)}
                                />

                                {/* Mods */}
                                <PerkRow
                                    label="Mods"
                                    itemPerks={allItemSockets.map(s =>
                                        s.weaponMods.length > 0 ? s.weaponMods : s.mods,
                                    )}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
