/**
 * TriagePanel — Vault cleaning intelligence panel for item detail overlay.
 *
 * Shows 5 sections (matching DIM's item-triage layout):
 * 1. Loadouts containing this item
 * 2. Similar items count
 * 3. Notable stats (armor only, highlighted >=82% of best)
 * 4. Armor stat comparison vs best-in-slot (armor only)
 * 5. Better/Worse dominance count (armor only)
 *
 * Positioned in ItemDetailOverlay between "Your Items" and "External Links".
 */
import React, { useMemo } from 'react';
import { Layers, Shield, TrendingUp, TrendingDown, BarChart3, Bookmark } from 'lucide-react';
import type { GuardianItem } from '@/services/profile/types';
import type { ManifestDefinition } from '@/store/useInventoryStore';
import { useLoadoutStore } from '@/store/loadoutStore';
import {
    computeTriage,
    type TriageData,
    type ArmorStatComparison,
    type NotableStat,
} from '@/lib/triage/triage';

// ============================================================================
// TYPES
// ============================================================================

interface TriagePanelProps {
    item: GuardianItem;
    allItems: GuardianItem[];
    manifest: Record<number, ManifestDefinition>;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** A single row in the triage summary */
const TriageRow: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: React.ReactNode;
    muted?: boolean;
}> = ({ icon, label, value, muted }) => (
    <div className={`flex items-center justify-between gap-3 ${muted ? 'opacity-40' : ''}`}>
        <div className="flex items-center gap-2 text-xs text-gray-400">
            {icon}
            <span>{label}</span>
        </div>
        <div className="text-xs font-mono tabular-nums text-white">{value}</div>
    </div>
);

/** Color-coded stat bar for notable stats */
const NotableStatBar: React.FC<{ stat: NotableStat }> = ({ stat }) => {
    const pct = Math.min(stat.percentOfBest * 100, 100);
    const hslColor = `hsl(${stat.hue}, 75%, 55%)`;

    return (
        <div className="flex items-center gap-2">
            <div className="w-16 text-right text-[11px] text-gray-400 truncate shrink-0">
                {stat.label}
            </div>
            <div className="w-7 text-right text-[11px] font-mono font-bold tabular-nums shrink-0" style={{ color: hslColor }}>
                {stat.value}
            </div>
            <div className="flex-1 h-[5px] bg-white/[0.06] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all"
                    style={{
                        width: `${pct}%`,
                        backgroundColor: hslColor,
                    }}
                />
            </div>
            <div className="w-7 text-left text-[10px] text-gray-500 font-mono tabular-nums shrink-0">
                {stat.bestValue}
            </div>
        </div>
    );
};

/** Armor stat comparison table */
const ArmorComparisonTable: React.FC<{ comparison: ArmorStatComparison }> = ({ comparison }) => {
    const statKeys: Array<{ key: keyof typeof comparison.stats; label: string; abbr: string }> = [
        { key: 'mobility', label: 'MOB', abbr: 'MOB' },
        { key: 'resilience', label: 'RES', abbr: 'RES' },
        { key: 'recovery', label: 'REC', abbr: 'REC' },
        { key: 'discipline', label: 'DIS', abbr: 'DIS' },
        { key: 'intellect', label: 'INT', abbr: 'INT' },
        { key: 'strength', label: 'STR', abbr: 'STR' },
    ];

    return (
        <div className="space-y-0.5">
            {/* Header row */}
            <div className="flex items-center gap-1 text-[9px] text-gray-500 uppercase tracking-wider font-bold">
                <div className="w-10 text-right shrink-0" />
                {statKeys.map(s => (
                    <div key={s.key} className="flex-1 text-center">{s.abbr}</div>
                ))}
                <div className="w-9 text-center shrink-0">TOT</div>
            </div>
            {/* This item row */}
            <div className="flex items-center gap-1">
                <div className="w-10 text-right text-[10px] text-gray-400 shrink-0">You</div>
                {statKeys.map(s => {
                    const pct = comparison.percentiles[s.key];
                    const hue = Math.min(pct, 1) * 120;
                    return (
                        <div
                            key={s.key}
                            className="flex-1 text-center text-[11px] font-mono font-bold tabular-nums"
                            style={{ color: `hsl(${hue}, 75%, 55%)` }}
                        >
                            {comparison.stats[s.key]}
                        </div>
                    );
                })}
                <div className="w-9 text-center text-[11px] font-mono font-bold tabular-nums text-white">
                    {comparison.total}
                </div>
            </div>
            {/* Best row */}
            <div className="flex items-center gap-1">
                <div className="w-10 text-right text-[10px] text-gray-500 shrink-0">Best</div>
                {statKeys.map(s => (
                    <div key={s.key} className="flex-1 text-center text-[11px] font-mono tabular-nums text-gray-500">
                        {comparison.best[s.key]}
                    </div>
                ))}
                <div className="w-9 text-center text-[11px] font-mono tabular-nums text-gray-500">
                    {comparison.bestTotal}
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TriagePanel: React.FC<TriagePanelProps> = ({ item, allItems, manifest }) => {
    // Compute triage data (memoized on item identity)
    const triage = useMemo(
        () => computeTriage(item, allItems, manifest),
        [item, allItems, manifest]
    );

    // Count loadouts containing this item
    const loadouts = useLoadoutStore(s => s.loadouts);
    const loadoutCount = useMemo(() => {
        if (!item?.itemInstanceId) return 0;
        return loadouts.filter(l =>
            l.items.some(li => li.itemInstanceId === item.itemInstanceId)
        ).length;
    }, [loadouts, item?.itemInstanceId]);

    // Determine if this is armor (has armor stats)
    const isArmor = triage.armorStats !== null;
    const hasNotableStats = triage.notableStats.length > 0;
    const hasBetterWorse = triage.betterWorse !== null;

    // Skip triage if it's a completely uninteresting item (no copies, no armor data, no loadouts)
    const isEmpty = triage.similarCount === 0 && !isArmor && loadoutCount === 0;
    if (isEmpty) return null;

    return (
        <div className="space-y-3 pt-2 border-t border-white/[0.06]">
            {/* Section Header */}
            <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                Triage
            </div>

            {/* Quick stats row */}
            <div className="space-y-1.5">
                {/* Loadout count */}
                {loadoutCount > 0 && (
                    <TriageRow
                        icon={<Bookmark size={12} className="text-blue-400" />}
                        label="In Loadouts"
                        value={<span className="text-blue-400">{loadoutCount}</span>}
                    />
                )}

                {/* Similar items */}
                <TriageRow
                    icon={<Layers size={12} />}
                    label="Similar Items"
                    value={
                        triage.similarCount > 0 ? (
                            <span className={triage.similarCount >= 3 ? 'text-yellow-400' : 'text-gray-300'}>
                                {triage.similarCount} other{triage.similarCount !== 1 ? 's' : ''}
                            </span>
                        ) : (
                            <span className="text-gray-500">unique</span>
                        )
                    }
                    muted={triage.similarCount === 0}
                />

                {/* Better / Worse counts (armor only) */}
                {hasBetterWorse && (
                    <>
                        {triage.betterWorse!.betterCount > 0 && (
                            <TriageRow
                                icon={<TrendingUp size={12} className="text-red-400" />}
                                label="Strictly Better"
                                value={
                                    <span className="text-red-400">
                                        {triage.betterWorse!.betterCount} item{triage.betterWorse!.betterCount !== 1 ? 's' : ''}
                                    </span>
                                }
                            />
                        )}
                        {triage.betterWorse!.worseCount > 0 && (
                            <TriageRow
                                icon={<TrendingDown size={12} className="text-green-400" />}
                                label="Outclassed By This"
                                value={
                                    <span className="text-green-400">
                                        {triage.betterWorse!.worseCount} item{triage.betterWorse!.worseCount !== 1 ? 's' : ''}
                                    </span>
                                }
                            />
                        )}
                        {triage.betterWorse!.betterCount === 0 && triage.betterWorse!.worseCount === 0 && (
                            <TriageRow
                                icon={<Shield size={12} className="text-gray-400" />}
                                label="Dominance"
                                value={<span className="text-gray-500">no strict winners</span>}
                                muted
                            />
                        )}
                    </>
                )}
            </div>

            {/* Notable Stats (armor only) */}
            {hasNotableStats && (
                <div className="space-y-1">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <BarChart3 size={10} />
                        Notable Stats
                        <span className="text-gray-600 normal-case tracking-normal font-normal">(vs best in slot)</span>
                    </div>
                    <div className="space-y-0.5">
                        {triage.notableStats.map(stat => (
                            <NotableStatBar key={stat.label} stat={stat} />
                        ))}
                    </div>
                </div>
            )}

            {/* Full Armor Comparison Table */}
            {isArmor && (
                <div className="space-y-1">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider font-bold">
                        Stat Comparison
                    </div>
                    <ArmorComparisonTable comparison={triage.armorStats!} />
                </div>
            )}
        </div>
    );
};

export default TriagePanel;
