import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { compareStats, categorizeStatDeltas, getTierBreakInfo, StatDelta } from '@/lib/inventory/statMath';
import { categorizeSockets, CategorizedSockets } from '@/lib/destiny/socket-helper';
import { calculateStats, CalculatedStat } from '@/lib/destiny/stat-manager';
import { StatHashes } from '@/lib/destiny-constants';
import { ItemSocket } from '@/components/item/ItemSocket';
import RecoilStat from '@/components/destiny/RecoilStat';
import { BungieImage } from '@/components/ui/BungieImage';

// ============================================================================
// TYPES
// ============================================================================

interface CompareModalProps {
    itemA: any;
    itemB: any;
    definitions: Record<string, any>;
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

/** Item card header (icon + name + power). */
function ItemCard({ item, def }: { item: any; def: any }) {
    const tierType = def?.inventory?.tierType || 0;
    const borderClass = RARITY_COLORS[tierType] || 'border-white/20';
    const power = item.instanceData?.primaryStat?.value;

    return (
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <div className={`w-16 h-16 rounded border-2 ${borderClass} overflow-hidden bg-void-surface`}>
                {def?.displayProperties?.icon && (
                    <BungieImage
                        src={def.displayProperties.icon}
                        className="w-full h-full object-cover"
                    />
                )}
            </div>
            <div className="text-center min-w-0">
                <div className="text-sm font-bold text-white truncate max-w-[140px]">
                    {def?.displayProperties?.name || 'Unknown'}
                </div>
                <div className="text-xs text-void-text-muted">
                    {def?.itemTypeDisplayName}
                </div>
                {power && (
                    <div className="text-xs font-mono text-[#f5dc56] mt-0.5">
                        ✦ {power}
                    </div>
                )}
            </div>
        </div>
    );
}

/** Section header for stat/perk groups. */
function SectionLabel({ label }: { label: string }) {
    return (
        <div className="flex items-center gap-2 mt-4 mb-2">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] uppercase tracking-widest text-void-text-muted font-bold">{label}</span>
            <div className="h-px flex-1 bg-white/10" />
        </div>
    );
}

/** Dual-layer stat bar comparing two values. */
function CompareStatBar({
    label,
    valueA,
    valueB,
    delta,
    maxValue,
    isRecoil = false,
    tierBreak,
}: {
    label: string;
    valueA: number;
    valueB: number;
    delta: number;
    maxValue: number;
    isRecoil?: boolean;
    tierBreak?: { tier: number; pointsToNext: number; isMaxTier: boolean } | null;
}) {
    const pctA = Math.min(100, (valueA / maxValue) * 100);
    const pctB = Math.min(100, (valueB / maxValue) * 100);
    const isPositive = delta > 0;
    const isNegative = delta < 0;
    const deltaColor = isPositive ? 'text-green-400' : isNegative ? 'text-red-400' : 'text-void-text-muted';

    return (
        <div className="flex items-center gap-2 mb-1.5 last:mb-0">
            {/* Label */}
            <div className="w-20 text-right text-xs text-void-text-secondary truncate shrink-0">{label}</div>

            {/* Values (A vs B) */}
            <div className="w-6 text-right text-[10px] text-void-text-muted font-mono tabular-nums shrink-0">
                {valueA}
            </div>

            {/* Bar */}
            <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
                {isRecoil ? (
                    <div className="flex items-center justify-center gap-2 h-full">
                        <RecoilStat value={valueA} />
                        <RecoilStat value={valueB} />
                    </div>
                ) : (
                    <>
                        {/* Ghost bar (Item A) */}
                        <div
                            className="absolute inset-y-0 left-0 bg-white/15 rounded-full"
                            style={{ width: `${pctA}%` }}
                        />
                        {/* Solid bar (Item B) */}
                        <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all ${isPositive ? 'bg-green-400/80' : isNegative ? 'bg-red-400/80' : 'bg-white/50'
                                }`}
                            style={{ width: `${pctB}%` }}
                        />
                    </>
                )}
            </div>

            {/* Value B */}
            <div className="w-6 text-left text-[10px] text-white font-mono font-bold tabular-nums shrink-0">
                {valueB}
            </div>

            {/* Delta badge */}
            <div className={`w-10 text-right text-xs font-mono font-bold shrink-0 ${deltaColor}`}>
                {delta === 0 ? '—' : `${isPositive ? '+' : ''}${delta}`}
            </div>

            {/* Tier break (armor only) */}
            {tierBreak && !tierBreak.isMaxTier && (
                <div className="text-[9px] text-void-text-muted font-mono shrink-0 w-14 text-right">
                    T{tierBreak.tier} +{tierBreak.pointsToNext}
                </div>
            )}
            {tierBreak?.isMaxTier && (
                <div className="text-[9px] text-[#f5dc56] font-mono shrink-0 w-14 text-right font-bold">
                    T10 MAX
                </div>
            )}
        </div>
    );
}

/** Renders side-by-side perk rows for the two items. */
function SocketCompareRow({
    label,
    socketsA,
    socketsB,
}: {
    label: string;
    socketsA: { plugDef: any; categoryHash: number; isEnabled: boolean }[];
    socketsB: { plugDef: any; categoryHash: number; isEnabled: boolean }[];
}) {
    if (socketsA.length === 0 && socketsB.length === 0) return null;

    return (
        <div className="flex items-start gap-4 py-1.5">
            {/* Item A perks */}
            <div className="flex-1 flex flex-wrap gap-1.5 justify-end">
                {socketsA.map((s, i) => (
                    <ItemSocket
                        key={`a-${i}`}
                        plugDef={s.plugDef}
                        categoryHash={s.categoryHash}
                        isActive={s.isEnabled}
                    />
                ))}
                {socketsA.length === 0 && <div className="w-10 h-10" />}
            </div>

            {/* Label */}
            <div className="w-16 text-center text-[9px] uppercase tracking-widest text-void-text-muted self-center shrink-0">
                {label}
            </div>

            {/* Item B perks */}
            <div className="flex-1 flex flex-wrap gap-1.5">
                {socketsB.map((s, i) => (
                    <ItemSocket
                        key={`b-${i}`}
                        plugDef={s.plugDef}
                        categoryHash={s.categoryHash}
                        isActive={s.isEnabled}
                    />
                ))}
                {socketsB.length === 0 && <div className="w-10 h-10" />}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CompareModal: React.FC<CompareModalProps> = ({ itemA, itemB, definitions, onClose }) => {
    const [deltas, setDeltas] = useState<StatDelta[]>([]);

    useEffect(() => {
        if (!itemA || !itemB) return;
        const results = compareStats(itemA, itemB, definitions);
        setDeltas(results);
    }, [itemA, itemB, definitions]);

    // Calculated stats for bar rendering (need max values from stat-manager)
    const statsA = useMemo(() => {
        if (!itemA) return [] as CalculatedStat[];
        const defA = definitions[itemA.itemHash];
        return calculateStats(itemA, defA, definitions);
    }, [itemA, definitions]);

    const statsB = useMemo(() => {
        if (!itemB) return [] as CalculatedStat[];
        const defB = definitions[itemB.itemHash];
        return calculateStats(itemB, defB, definitions);
    }, [itemB, definitions]);

    // Build a stat hash → max value lookup from both items
    const statMaxMap = useMemo(() => {
        const map: Record<number, number> = {};
        for (const s of [...statsA, ...statsB]) {
            map[s.statHash] = Math.max(map[s.statHash] || 0, s.maximumValue, s.displayValue);
        }
        return map;
    }, [statsA, statsB]);

    // Build stat hash → displayValue maps for bar rendering
    const valueMapA = useMemo(() => {
        const m: Record<number, number> = {};
        for (const s of statsA) m[s.statHash] = s.displayValue;
        return m;
    }, [statsA]);

    const valueMapB = useMemo(() => {
        const m: Record<number, number> = {};
        for (const s of statsB) m[s.statHash] = s.displayValue;
        return m;
    }, [statsB]);

    // Categorize sockets for side-by-side perk comparison
    const socketsA: CategorizedSockets = useMemo(() => {
        if (!itemA) return { intrinsic: null, perks: [], mods: [], weaponMods: [], cosmetics: [], ornament: null, catalyst: null };
        const defA = definitions[itemA.itemHash];
        return categorizeSockets(itemA, defA, definitions);
    }, [itemA, definitions]);

    const socketsB: CategorizedSockets = useMemo(() => {
        if (!itemB) return { intrinsic: null, perks: [], mods: [], weaponMods: [], cosmetics: [], ornament: null, catalyst: null };
        const defB = definitions[itemB.itemHash];
        return categorizeSockets(itemB, defB, definitions);
    }, [itemB, definitions]);

    // Get stat labels from calculated stats
    const statLabelMap = useMemo(() => {
        const m: Record<number, string> = {};
        for (const s of [...statsA, ...statsB]) m[s.statHash] = s.label;
        return m;
    }, [statsA, statsB]);

    if (!itemA || !itemB) return null;

    const defA = definitions[itemA.itemHash];
    const defB = definitions[itemB.itemHash];

    // Categorize stat deltas for grouped rendering
    const categorized = categorizeStatDeltas(deltas);

    // Determine if this is armor (has armor stats)
    const isArmor = categorized.armor.length > 0;

    // Pick the primary stats to show
    const primaryStats = isArmor ? categorized.armor : categorized.weapon;
    const hiddenStats = categorized.hidden;
    // If armor, weapon category may have misc stats like the total stat
    const secondaryStats = isArmor ? categorized.weapon : [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-void-elevated border border-void-border rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh] shadow-2xl">

                {/* ── HEADER ── */}
                <div className="flex items-center justify-between p-3 border-b border-void-border bg-black/40">
                    <h2 className="text-base font-bold text-white tracking-tight">Compare Items</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* ── CONTENT ── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">

                    {/* ── Item Cards (Side-by-Side) ── */}
                    <div className="flex items-start justify-center gap-6">
                        <ItemCard item={itemA} def={defA} />
                        <div className="text-void-text-muted text-xs font-mono uppercase self-center pt-4">VS</div>
                        <ItemCard item={itemB} def={defB} />
                    </div>

                    {/* ── Socket Comparison ── */}
                    <SectionLabel label="Perks" />

                    {/* Intrinsic (Frame) */}
                    <SocketCompareRow
                        label="Frame"
                        socketsA={socketsA.intrinsic ? [socketsA.intrinsic] : []}
                        socketsB={socketsB.intrinsic ? [socketsB.intrinsic] : []}
                    />

                    {/* Perks (Barrels, Mags, Traits) */}
                    <SocketCompareRow
                        label="Perks"
                        socketsA={socketsA.perks}
                        socketsB={socketsB.perks}
                    />

                    {/* Mods */}
                    {(socketsA.weaponMods.length > 0 || socketsB.weaponMods.length > 0) && (
                        <SocketCompareRow
                            label="Mods"
                            socketsA={socketsA.weaponMods}
                            socketsB={socketsB.weaponMods}
                        />
                    )}

                    {/* Armor Mods */}
                    {(socketsA.mods.length > 0 || socketsB.mods.length > 0) && (
                        <SocketCompareRow
                            label="Mods"
                            socketsA={socketsA.mods}
                            socketsB={socketsB.mods}
                        />
                    )}

                    {/* ── Stat Bars ── */}
                    <SectionLabel label={isArmor ? 'Armor Stats' : 'Weapon Stats'} />

                    {primaryStats.filter(s => (valueMapA[s.statHash] || 0) > 0 || (valueMapB[s.statHash] || 0) > 0).map(stat => {
                        const vA = valueMapA[stat.statHash] || 0;
                        const vB = valueMapB[stat.statHash] || 0;
                        const isRecoil = stat.statHash === StatHashes.RecoilDirection;
                        const tierBreak = isArmor ? getTierBreakInfo(vB) : null;

                        return (
                            <CompareStatBar
                                key={stat.statHash}
                                label={statLabelMap[stat.statHash] || `#${stat.statHash}`}
                                valueA={vA}
                                valueB={vB}
                                delta={stat.delta}
                                maxValue={statMaxMap[stat.statHash] || 100}
                                isRecoil={isRecoil}
                                tierBreak={tierBreak}
                            />
                        );
                    })}

                    {/* Hidden Stats */}
                    {hiddenStats.length > 0 && (
                        <>
                            <SectionLabel label="Hidden Stats" />
                            {hiddenStats.filter(s => (valueMapA[s.statHash] || 0) > 0 || (valueMapB[s.statHash] || 0) > 0).map(stat => {
                                const vA = valueMapA[stat.statHash] || 0;
                                const vB = valueMapB[stat.statHash] || 0;
                                const isRecoil = stat.statHash === StatHashes.RecoilDirection;

                                return (
                                    <CompareStatBar
                                        key={stat.statHash}
                                        label={statLabelMap[stat.statHash] || `#${stat.statHash}`}
                                        valueA={vA}
                                        valueB={vB}
                                        delta={stat.delta}
                                        maxValue={statMaxMap[stat.statHash] || 100}
                                        isRecoil={isRecoil}
                                    />
                                );
                            })}
                        </>
                    )}

                    {/* Secondary (misc) stats */}
                    {secondaryStats.length > 0 && (
                        <>
                            <SectionLabel label="Other Stats" />
                            {secondaryStats.filter(s => (valueMapA[s.statHash] || 0) > 0 || (valueMapB[s.statHash] || 0) > 0).map(stat => (
                                <CompareStatBar
                                    key={stat.statHash}
                                    label={statLabelMap[stat.statHash] || `#${stat.statHash}`}
                                    valueA={valueMapA[stat.statHash] || 0}
                                    valueB={valueMapB[stat.statHash] || 0}
                                    delta={stat.delta}
                                    maxValue={statMaxMap[stat.statHash] || 100}
                                />
                            ))}
                        </>
                    )}

                    {/* No stats at all */}
                    {deltas.length === 0 && (
                        <div className="text-center text-void-text-muted italic text-sm py-4">
                            No comparable stats found
                        </div>
                    )}

                    {/* Identical stats notice */}
                    {deltas.length > 0 && deltas.every(d => d.delta === 0) && (
                        <div className="text-center text-void-text-muted italic text-xs mt-3">
                            These items have identical stats
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
