import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { X, ExternalLink, GitCompare, Grid3x3, List, RotateCcw, Crosshair, Sword, Sparkles, FlaskConical, Zap, ThumbsUp, ThumbsDown } from 'lucide-react';
import { ElementIcon } from '../destiny/ElementIcons';
import RecoilStat from '../destiny/RecoilStat';
import { calculateStats, getSocketAlternatives, type StatSegment, type StatSegmentType, type SocketAlternatives } from '../../lib/destiny/stat-manager';
import { categorizeSockets } from '../../lib/destiny/socket-helper';
import { ItemSocket } from '../item/ItemSocket';
import { PerkCircle } from '../item/PerkCircle';
import { BungieImage, bungieNetPath } from '../ui/BungieImage';
import { useDefinitions } from '../../hooks/useDefinitions';
import { StatHashes, PlugCategoryHashes } from '../../lib/destiny-constants';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useWishlistStore } from '../../store/useWishlistStore';
import { matchItemAll, isPerkWishlisted } from '../../lib/wishlist';
import type { WishListMatch } from '../../lib/wishlist';
import { getItemSeasonInfo } from '../../lib/destiny/season-info';
import { getKillTracker, getCraftedInfo, getArmorEnergy, getCatalystInfo, getDeepsightInfo } from '../../lib/destiny/item-info';
import catalystMapping from '../../data/exotic-to-catalyst-record.json';
import { KillTrackerBadge, CraftedWeaponBadge, DeepsightBadge, CatalystProgress } from '../item/ItemPopupInfo';
import { TriagePanel } from '../item/TriagePanel';

// ============================================================================
// TYPES
// ============================================================================

interface ItemDetailOverlayProps {
    item: any;
    definition: any;
    definitions: Record<string, any>;
    onClose: () => void;
}

const tierTypeToRarity: Record<number, string> = {
    6: 'exotic',
    5: 'legendary',
    4: 'rare',
    3: 'uncommon',
    2: 'common',
    0: 'common',
    1: 'common',
};

const rarityColors: Record<string, string> = {
    exotic: '#ceae33',
    legendary: '#522f65',
    rare: '#5076a3',
    uncommon: '#366f42',
    common: '#c3bcb4',
};

/**
 * Segment colors for stat bars (ported from DIM's ItemStat.m.scss).
 * base=gray, parts=blue (barrels/mags), traits=green, mod=purple, masterwork=gold
 */
const SEGMENT_COLORS: Record<StatSegmentType, string> = {
    base: '#888888',
    parts: '#68a8e0',
    traits: '#5ac467',
    mod: '#a855f7',
    masterwork: '#ceae33',
};

const SEGMENT_LABELS: Record<StatSegmentType, string> = {
    base: 'Base',
    parts: 'Weapon Part',
    traits: 'Trait',
    mod: 'Mod',
    masterwork: 'Masterwork',
};

/** Weapon component plug category hashes that may be enhanced (same set from stat-manager). */
const WEAPON_COMPONENT_PCHS = new Set<number>([
    PlugCategoryHashes.Barrels, PlugCategoryHashes.Magazines, PlugCategoryHashes.Scopes,
    PlugCategoryHashes.Stocks, PlugCategoryHashes.Grips, PlugCategoryHashes.Arrows,
]);

/**
 * Detect enhanced perk — ported from DIM's socket-utils.ts isEnhancedPerk.
 * Enhanced perks have tierType=0 (Common) and a plugCategoryHash that is
 * Frames, Origins, or a weapon component.
 */
function isEnhancedPerk(plugDef: any): boolean {
    if (!plugDef?.inventory || !plugDef?.plug) return false;
    const tier = plugDef.inventory.tierType;
    const pch = plugDef.plug.plugCategoryHash;
    return tier === 0 && (
        pch === PlugCategoryHashes.Frames ||
        pch === PlugCategoryHashes.Origins ||
        WEAPON_COMPONENT_PCHS.has(pch)
    );
}

/**
 * Stat bar tooltip — shows the math breakdown of each contributing segment.
 */
const StatBarTooltip: React.FC<{ segments: StatSegment[]; statLabel: string; displayValue: number }> = ({
    segments,
    statLabel,
    displayValue,
}) => {
    const showMath = !(segments.length === 1 && segments[0][1] === 'base');
    return (
        <div className="text-xs space-y-0.5 min-w-[140px]">
            {showMath && segments.map(([val, segType, name], i) => (
                <div key={i} className="flex justify-between gap-3">
                    <span style={{ color: SEGMENT_COLORS[segType] }}>
                        {name || SEGMENT_LABELS[segType]}
                    </span>
                    <span style={{ color: SEGMENT_COLORS[segType] }} className="font-mono tabular-nums">
                        {i > 0 && val >= 0 ? '+' : ''}{val}
                    </span>
                </div>
            ))}
            <div className={`flex justify-between gap-3 font-bold ${showMath ? 'border-t border-white/10 pt-0.5 mt-0.5' : ''}`}>
                <span className="text-white">{statLabel}</span>
                <span className="text-white font-mono tabular-nums">{displayValue}</span>
            </div>
        </div>
    );
};

/**
 * WishlistDot — Small indicator dot below a perk circle showing wishlist/trash status.
 */
const WishlistDot: React.FC<{ type: 'wish' | 'trash' }> = ({ type }) => (
    <div
        className={`w-2.5 h-2.5 rounded-full border border-[#0d0d0f] absolute -right-0.5 -top-0.5 ${
            type === 'wish' ? 'bg-green-400' : 'bg-red-400'
        }`}
        title={type === 'wish' ? 'Wishlist perk' : 'Trash list perk'}
    />
);

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * ItemDetailOverlay - Full-screen centered modal showing complete item breakdown.
 * Inspired by DIM's item detail page.
 * Shows: screenshot, stats, perks, intrinsic frame, lore, source info.
 */
export const ItemDetailOverlay: React.FC<ItemDetailOverlayProps> = ({
    item,
    definition,
    definitions: initialDefinitions,
    onClose,
}) => {
    // --- JIT Definitions for plugs ---
    // Collect all plug hashes: active plugs + all alternative plugs from reusablePlugs/plug sets
    const plugHashes = useMemo(() => {
        const hashes = new Set<number>();
        const liveSockets = item?.sockets?.sockets || item?.itemComponents?.sockets?.data?.sockets;
        if (liveSockets) {
            for (const s of liveSockets) if (s.plugHash) hashes.add(s.plugHash);
        }
        // Add all reusable plug alternatives (component 305)
        const reusable = item?.reusablePlugs as Record<number, Array<{ plugItemHash: number }>> | undefined;
        if (reusable) {
            for (const plugs of Object.values(reusable)) {
                for (const p of plugs) if (p.plugItemHash) hashes.add(p.plugItemHash);
            }
        }
        // Add plug set hashes from manifest socket entries (for manifest-only fallback)
        const socketEntries = definition?.sockets?.socketEntries;
        if (socketEntries) {
            for (const entry of socketEntries) {
                const psHash = entry.reusablePlugSetHash || entry.randomizedPlugSetHash;
                if (psHash) hashes.add(psHash); // will be fetched below as PlugSetDef
                // Inline reusablePlugItems
                if (entry.reusablePlugItems) {
                    for (const rpi of entry.reusablePlugItems) {
                        if (rpi.plugItemHash) hashes.add(rpi.plugItemHash);
                    }
                }
            }
        }
        // Also fetch lore definition if available
        if (definition?.loreHash) hashes.add(definition.loreHash);
        // Fetch collectible definition for source string
        if (definition?.collectibleHash) hashes.add(definition.collectibleHash);
        return Array.from(hashes);
    }, [item, definition]);

    const { definitions: plugDefinitions } = useDefinitions('DestinyInventoryItemDefinition', plugHashes);

    // Fetch plug set definitions for socket alternatives
    const plugSetHashes = useMemo(() => {
        const hashes = new Set<number>();
        const socketEntries = definition?.sockets?.socketEntries;
        if (socketEntries) {
            for (const entry of socketEntries) {
                if (entry.reusablePlugSetHash) hashes.add(entry.reusablePlugSetHash);
                if (entry.randomizedPlugSetHash) hashes.add(entry.randomizedPlugSetHash);
            }
        }
        return Array.from(hashes);
    }, [definition]);
    const { definitions: plugSetDefs } = useDefinitions('DestinyPlugSetDefinition', plugSetHashes);

    // Fetch alternative plug item definitions (from plug sets we just resolved)
    const altPlugItemHashes = useMemo(() => {
        const hashes = new Set<number>();
        for (const psDef of Object.values(plugSetDefs)) {
            const ps = psDef as any;
            if (ps?.reusablePlugItems) {
                for (const entry of ps.reusablePlugItems) {
                    if (entry.plugItemHash) hashes.add(entry.plugItemHash);
                }
            }
        }
        return Array.from(hashes);
    }, [plugSetDefs]);
    const { definitions: altPlugDefs } = useDefinitions('DestinyInventoryItemDefinition', altPlugItemHashes);

    // Fetch lore separately since it's a different table
    const loreHashes = useMemo(() => definition?.loreHash ? [definition.loreHash] : [], [definition]);
    const { definitions: loreDefs } = useDefinitions('DestinyLoreDefinition', loreHashes);

    // Fetch collectible for source string
    const collectibleHashes = useMemo(() => definition?.collectibleHash ? [definition.collectibleHash] : [], [definition]);
    const { definitions: collectibleDefs } = useDefinitions('DestinyCollectibleDefinition', collectibleHashes);

    // Fetch stat group definition for interpolation
    const statGroupHashes = useMemo(() => {
        const hash = definition?.stats?.statGroupHash;
        return hash ? [hash] : [];
    }, [definition]);
    const { definitions: statGroupDefs } = useDefinitions('DestinyStatGroupDefinition', statGroupHashes);

    const definitions = useMemo(
        () => ({ ...initialDefinitions, ...plugDefinitions, ...statGroupDefs, ...plugSetDefs, ...altPlugDefs }),
        [initialDefinitions, plugDefinitions, statGroupDefs, plugSetDefs, altPlugDefs]
    );

    // --- Derived Data ---
    const tierType = definition?.inventory?.tierType || 0;
    const rarity = tierTypeToRarity[tierType] || 'common';
    const rarityColor = rarityColors[rarity] || rarityColors.common;
    const isExotic = tierType === 6;
    const power = item?.instanceData?.primaryStat?.value || item?.primaryStat?.value;
    const damageTypeHash = item?.instanceData?.damageTypeHash || definition?.defaultDamageTypeHash;
    const itemTypeDisplayName = definition?.itemTypeDisplayName || '';
    const screenshot = definition?.screenshot;
    const flavorText = definition?.flavorText;
    const itemName = definition?.displayProperties?.name || 'Unknown Item';
    const itemIcon = definition?.displayProperties?.icon;

    // Lore text
    const loreDef = loreDefs[definition?.loreHash];
    const loreText = loreDef?.displayProperties?.description;

    // Source string from collectible
    const collectibleDef = collectibleDefs[definition?.collectibleHash];
    const sourceString = collectibleDef?.sourceString;

    // Season watermark
    const watermarkIcon = definition?.iconWatermark || definition?.iconWatermarkShelved;

    // Season info (name, number, year)
    const seasonInfo = useMemo(() => getItemSeasonInfo(definition), [definition]);

    // --- Item Info Features (Kill Tracker, Crafted, Energy, Catalyst, Deepsight) ---
    const killTracker = useMemo(() => getKillTracker(item, definition), [item, definition]);
    const craftedInfo = useMemo(() => getCraftedInfo(item, definition), [item, definition]);
    const armorEnergy = useMemo(() => getArmorEnergy(item), [item]);

    // Profile records for catalyst & deepsight
    const profile = useInventoryStore(s => s.profile);
    const profileRecords = useMemo(
        () => profile?.profileRecords?.data,
        [profile]
    );
    const characterRecords = useMemo(
        () => profile?.characterRecords?.data,
        [profile]
    );

    // Catalyst (exotics only)
    const catalystInfo = useMemo(() => {
        if (!isExotic) return null;
        return getCatalystInfo(
            item?.itemHash,
            profileRecords,
            characterRecords,
            catalystMapping as Record<string, number>,
        );
    }, [item?.itemHash, isExotic, profileRecords, characterRecords]);

    // Deepsight / pattern progress
    // Build pattern record map from DestinyRecordDefinition (CraftingRecipeUnlocked toast style)
    const recordHashes = useMemo(() => [] as number[], []); // Empty = load full table
    const { definitions: recordDefs } = useDefinitions('DestinyRecordDefinition', recordHashes);
    const patternRecordMap = useMemo(() => {
        const map: Record<string, number> = {};
        for (const [hash, record] of Object.entries(recordDefs)) {
            const rec = record as any;
            // DestinyRecordToastStyle.CraftingRecipeUnlocked = 3
            if (rec?.completionInfo?.toastStyle === 3 && rec?.displayProperties?.name) {
                map[rec.displayProperties.name] = Number(hash);
            }
        }
        return map;
    }, [recordDefs]);

    const deepsightInfo = useMemo(
        () => getDeepsightInfo(item, definition, profileRecords, patternRecordMap),
        [item, definition, profileRecords, patternRecordMap]
    );

    // --- Wishlist Matching ---
    const wishlistInit = useWishlistStore(s => s.init);
    const rollsByHash = useWishlistStore(s => s.rollsByHash);
    const wishlistLoaded = useWishlistStore(s => s.loaded);
    const wishlistRollCount = useWishlistStore(s => s.rollCount);

    // Initialize wishlist store on first overlay open
    useEffect(() => { wishlistInit(); }, [wishlistInit]);

    // Match this item against all wishlist rolls
    const wishlistMatches: WishListMatch[] = useMemo(
        () => wishlistLoaded ? matchItemAll(item, definition, definitions, rollsByHash) : [],
        [item, definition, definitions, rollsByHash, wishlistLoaded]
    );

    // Primary verdict: first wish match, or first trash match
    const wishlistVerdict = useMemo(() => {
        const wished = wishlistMatches.find(m => !m.isUndesirable);
        if (wished) return wished;
        const trash = wishlistMatches.find(m => m.isUndesirable);
        return trash ?? null;
    }, [wishlistMatches]);

    // --- Socket Override State (for perk swap preview) ---
    const [socketOverrides, setSocketOverrides] = useState<Record<number, number>>({});
    const hasOverrides = Object.keys(socketOverrides).length > 0;

    const handlePlugClick = useCallback((socketIndex: number, plugHash: number) => {
        setSocketOverrides(prev => {
            // If clicking the currently equipped plug (original), remove the override
            const liveSockets = item?.sockets?.sockets;
            const originalHash = liveSockets?.[socketIndex]?.plugHash;
            if (plugHash === originalHash) {
                const next = { ...prev };
                delete next[socketIndex];
                return next;
            }
            return { ...prev, [socketIndex]: plugHash };
        });
    }, [item]);

    const resetOverrides = useCallback(() => setSocketOverrides({}), []);

    // Stats & Sockets (with socket overrides applied for live preview)
    const calculatedStats = useMemo(
        () => calculateStats(item, definition, definitions, socketOverrides),
        [item, definition, definitions, socketOverrides]
    );
    const sockets = useMemo(
        () => categorizeSockets(item, definition, definitions, socketOverrides),
        [item, definition, definitions, socketOverrides]
    );

    // Socket alternatives (available plugs per socket column)
    const socketAlternatives: SocketAlternatives = useMemo(
        () => getSocketAlternatives(item, definition, definitions),
        [item, definition, definitions]
    );

    // Close on Escape
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const visibleStats = calculatedStats.filter(stat => stat.displayValue > 0);

    // Key stats for intrinsic frame display (e.g., "900 RPM / 21 Impact")
    // Following DIM: first 2 stats, excluding swords/LFRs, filtered for non-Blast Radius
    const keyStats = useMemo(() => {
        const itemCategories = definition?.itemCategoryHashes || [];
        const isSword = itemCategories.includes(54);      // ItemCategoryHashes.Sword
        const isLFR = itemCategories.includes(1504945536); // ItemCategoryHashes.LinearFusionRifles
        if (isSword || isLFR) return null;

        return calculatedStats
            .slice(0, 2)
            .filter(s => s.statHash !== StatHashes.BlastRadius && s.displayValue > 0);
    }, [calculatedStats, definition]);

    // --- Perk view mode toggle ---
    const [perkViewMode, setPerkViewMode] = useState<'grid' | 'list'>('grid');

    // --- "Your Items" data ---
    const allItems = useInventoryStore(s => s.items);
    const manifest = useInventoryStore(s => s.manifest);
    const startCompare = useInventoryStore(s => s.startCompare);
    const characters = useInventoryStore(s => s.characters);

    const yourItems = useMemo(() => {
        const itemHash = item?.itemHash;
        if (!itemHash) return [];
        return allItems.filter(
            i => i.itemHash === itemHash && i.itemInstanceId !== item.itemInstanceId
        );
    }, [allItems, item]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div
                className="relative z-[201] w-full max-w-[720px] max-h-[90vh] bg-[#0d0d0f] border border-white/10 rounded-lg overflow-hidden shadow-2xl flex flex-col"
                role="dialog"
                aria-modal="true"
                aria-label={`${itemName} details`}
            >
                {/* ============================================================
                    SCREENSHOT HEADER
                    ============================================================ */}
                {screenshot && (
                    <div className="relative w-full aspect-[16/9] max-h-[300px] overflow-hidden shrink-0">
                        <img
                            src={bungieNetPath(screenshot)}
                            alt={itemName}
                            className="w-full h-full object-cover"
                        />
                        {/* Gradient overlay for text readability */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0f] via-[#0d0d0f]/40 to-transparent" />

                        {/* Item name overlaid on screenshot */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                            <div className="flex items-end justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    {/* Item icon */}
                                    {itemIcon && (
                                        <div
                                            className="w-14 h-14 rounded border-2 overflow-hidden shrink-0 shadow-lg"
                                            style={{ borderColor: rarityColor }}
                                        >
                                            <BungieImage src={itemIcon} className="w-full h-full" />
                                        </div>
                                    )}
                                    <div>
                                        <h2
                                            className="text-xl font-bold text-white drop-shadow-lg"
                                            style={{ color: isExotic ? '#ceae33' : 'white' }}
                                        >
                                            {itemName}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <ElementIcon damageTypeHash={damageTypeHash} size={14} />
                                            <span className="text-sm text-gray-300">{itemTypeDisplayName}</span>
                                            {power && (
                                                <span className="text-sm font-mono font-bold text-white ml-1">
                                                    {power}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Season info */}
                                {watermarkIcon && (
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <div className="w-8 h-8 opacity-70">
                                            <BungieImage src={watermarkIcon} className="w-full h-full" />
                                        </div>
                                        {seasonInfo && (
                                            <div className="text-[10px] text-gray-400 leading-tight text-right">
                                                <div className="text-gray-300">{seasonInfo.seasonName}</div>
                                                <div>S{seasonInfo.seasonNumber} / Y{seasonInfo.year}</div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Fallback header when no screenshot */}
                {!screenshot && (
                    <div
                        className="px-4 py-3 border-b border-white/10 shrink-0"
                        style={{ backgroundColor: `${rarityColor}15` }}
                    >
                        <div className="flex items-center gap-3">
                            {itemIcon && (
                                <div
                                    className="w-12 h-12 rounded border-2 overflow-hidden shrink-0"
                                    style={{ borderColor: rarityColor }}
                                >
                                    <BungieImage src={itemIcon} className="w-full h-full" />
                                </div>
                            )}
                            <div>
                                <h2
                                    className="text-lg font-bold"
                                    style={{ color: isExotic ? '#ceae33' : 'white' }}
                                >
                                    {itemName}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <ElementIcon damageTypeHash={damageTypeHash} size={14} />
                                    <span className="text-sm text-gray-400">{itemTypeDisplayName}</span>
                                    {power && (
                                        <span className="text-sm font-mono font-bold text-white ml-1">{power}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-gray-400 hover:text-white hover:bg-black/80 transition-colors"
                    aria-label="Close"
                >
                    <X size={16} />
                </button>

                {/* ============================================================
                    SCROLLABLE CONTENT
                    ============================================================ */}
                <div className="flex-1 overflow-y-auto min-h-0">
                    <div className="p-4 space-y-5">

                        {/* ---- SOURCE INFO ---- */}
                        {sourceString && (
                            <div className="text-xs text-gray-400 italic border-l-2 border-white/10 pl-3">
                                {sourceString}
                            </div>
                        )}

                        {/* ---- WISHLIST VERDICT BANNER ---- */}
                        {wishlistVerdict && (
                            <div
                                className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${
                                    wishlistVerdict.isUndesirable
                                        ? 'bg-red-400/[0.04] border-red-400/[0.15]'
                                        : 'bg-green-400/[0.04] border-green-400/[0.15]'
                                }`}
                            >
                                {wishlistVerdict.isUndesirable ? (
                                    <ThumbsDown size={16} className="text-red-400 shrink-0 mt-0.5" />
                                ) : (
                                    <ThumbsUp size={16} className="text-green-400 shrink-0 mt-0.5" />
                                )}
                                <div className="min-w-0 flex-1">
                                    <div className={`font-bold text-xs ${
                                        wishlistVerdict.isUndesirable ? 'text-red-300' : 'text-green-300'
                                    }`}>
                                        {wishlistVerdict.isUndesirable ? 'Trash List Roll' : 'Wishlist Roll'}
                                    </div>
                                    {wishlistVerdict.notes && (
                                        <div className="text-[11px] text-gray-400 leading-relaxed mt-1 whitespace-pre-line">
                                            {wishlistVerdict.notes}
                                        </div>
                                    )}
                                    {/* Show additional matching notes if multiple rolls matched */}
                                    {wishlistMatches.length > 1 && (
                                        <div className="text-[10px] text-gray-500 mt-1.5">
                                            +{wishlistMatches.length - 1} more matching {wishlistMatches.length - 1 === 1 ? 'roll' : 'rolls'}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ---- KILL TRACKER / CRAFTED / DEEPSIGHT BADGES ---- */}
                        {(killTracker || craftedInfo || (deepsightInfo && !deepsightInfo.patternComplete)) && (
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Kill tracker */}
                                {killTracker && <KillTrackerBadge data={killTracker} />}

                                {/* Crafted weapon badge */}
                                {craftedInfo && <CraftedWeaponBadge data={craftedInfo} />}

                                {/* Deepsight pattern progress */}
                                {deepsightInfo && <DeepsightBadge data={deepsightInfo} />}
                            </div>
                        )}

                        {/* ---- INTRINSIC FRAME PERK (with key stats) ---- */}
                        {sockets.intrinsic && (
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                                <div className="w-12 h-12 shrink-0">
                                    <ItemSocket
                                        plugDef={sockets.intrinsic.plugDef}
                                        categoryHash={sockets.intrinsic.categoryHash}
                                        isActive={true}
                                    />
                                </div>
                                <div className="min-w-0">
                                    <div className="font-bold text-sm text-[#e2bf36]">
                                        {sockets.intrinsic.plugDef.displayProperties.name}
                                    </div>
                                    {/* Key stats inline (e.g., "900 rpm / 21 impact") */}
                                    {keyStats && keyStats.length > 0 && (
                                        <div className="text-xs text-gray-300 mt-0.5">
                                            {keyStats
                                                .map(s => `${s.displayValue} ${s.label.toLowerCase()}`)
                                                .join(' / ')}
                                        </div>
                                    )}
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 mt-0.5">
                                        {sockets.intrinsic.plugDef.itemTypeDisplayName || 'Intrinsic'}
                                    </div>
                                    {sockets.intrinsic.plugDef.displayProperties.description && (
                                        <div className="text-xs text-gray-400 leading-relaxed">
                                            {sockets.intrinsic.plugDef.displayProperties.description}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ---- PERKS (Grid / List toggle with Socket Override) ---- */}
                        {sockets.perks.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                            Perks
                                        </div>
                                        {hasOverrides && (
                                            <button
                                                onClick={resetOverrides}
                                                className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] text-amber-400/80 hover:text-amber-300 bg-amber-400/[0.06] hover:bg-amber-400/[0.12] border border-amber-400/[0.15] rounded transition-colors uppercase tracking-wider font-bold"
                                                title="Reset perk selection"
                                            >
                                                <RotateCcw size={9} />
                                                Reset
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-0.5 bg-white/[0.04] border border-white/[0.06] rounded p-0.5">
                                        <button
                                            onClick={() => setPerkViewMode('grid')}
                                            className={`p-1 rounded transition-colors ${
                                                perkViewMode === 'grid'
                                                    ? 'bg-white/10 text-white'
                                                    : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                            aria-label="Grid view"
                                            title="Grid view"
                                        >
                                            <Grid3x3 size={12} />
                                        </button>
                                        <button
                                            onClick={() => setPerkViewMode('list')}
                                            className={`p-1 rounded transition-colors ${
                                                perkViewMode === 'list'
                                                    ? 'bg-white/10 text-white'
                                                    : 'text-gray-500 hover:text-gray-300'
                                            }`}
                                            aria-label="List view"
                                            title="List view"
                                        >
                                            <List size={12} />
                                        </button>
                                    </div>
                                </div>

                                {/* Grid mode — perk columns with clickable SVG PerkCircle alternatives */}
                                {perkViewMode === 'grid' && (
                                    <div className="flex gap-3">
                                        {sockets.perks.map(socket => {
                                            const alts = socketAlternatives[socket.socketIndex];
                                            const activePlugHash = socketOverrides[socket.socketIndex] ?? socket.plugHash;
                                            const originalPlugHash = item?.sockets?.sockets?.[socket.socketIndex]?.plugHash;

                                            // No alternatives — render single SVG perk circle (not clickable)
                                            if (!alts || alts.length <= 1) {
                                                const wlStatus = isPerkWishlisted(socket.plugHash, wishlistMatches);
                                                return (
                                                    <div key={socket.socketIndex} className="flex flex-col items-center gap-1 relative">
                                                        <PerkCircle
                                                            plugDef={socket.plugDef}
                                                            size={40}
                                                            isPlugged={true}
                                                            isEnhanced={isEnhancedPerk(socket.plugDef)}
                                                            title={socket.plugDef?.displayProperties?.name || ''}
                                                        />
                                                        {wlStatus.isWished && <WishlistDot type="wish" />}
                                                        {wlStatus.isTrash && <WishlistDot type="trash" />}
                                                    </div>
                                                );
                                            }

                                            // Multiple alternatives — render as clickable column of SVG PerkCircles
                                            return (
                                                <div key={socket.socketIndex} className="flex flex-col items-center gap-1">
                                                    {alts.map(alt => {
                                                        const isActive = alt.plugHash === activePlugHash;
                                                        const isOriginal = alt.plugHash === originalPlugHash;
                                                        const isOverridden = hasOverrides && socketOverrides[socket.socketIndex] !== undefined;
                                                        const wasOriginal = isOriginal && isOverridden && !isActive;
                                                        const wlStatus = isPerkWishlisted(alt.plugHash, wishlistMatches);

                                                        return (
                                                            <div
                                                                key={alt.plugHash}
                                                                className={`relative transition-opacity ${
                                                                    isActive ? 'opacity-100' :
                                                                    wasOriginal ? 'opacity-50' :
                                                                    'opacity-40 hover:opacity-80'
                                                                }`}
                                                            >
                                                                <PerkCircle
                                                                    plugDef={alt.plugDef}
                                                                    size={40}
                                                                    isPlugged={isActive && !isOverridden}
                                                                    isSelected={isActive && isOverridden}
                                                                    isNotSelected={wasOriginal}
                                                                    isEnhanced={isEnhancedPerk(alt.plugDef)}
                                                                    cannotRoll={!alt.canInsert}
                                                                    onClick={() => handlePlugClick(socket.socketIndex, alt.plugHash)}
                                                                    title={alt.plugDef?.displayProperties?.name || ''}
                                                                />
                                                                {wlStatus.isWished && (
                                                                    <div className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-[#0d0d0f]" title="Wishlist perk" />
                                                                )}
                                                                {wlStatus.isTrash && (
                                                                    <div className="absolute -right-0.5 -top-0.5 w-2.5 h-2.5 rounded-full bg-red-400 border border-[#0d0d0f]" title="Trash list perk" />
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* List mode — icon + name + description, with alternatives */}
                                {perkViewMode === 'list' && (
                                    <div className="space-y-3">
                                        {sockets.perks.map(socket => {
                                            const alts = socketAlternatives[socket.socketIndex];
                                            const activePlugHash = socketOverrides[socket.socketIndex] ?? socket.plugHash;
                                            const originalPlugHash = item?.sockets?.sockets?.[socket.socketIndex]?.plugHash;
                                            const activeDef = definitions[activePlugHash];
                                            const dp = activeDef?.displayProperties || socket.plugDef?.displayProperties;
                                            if (!dp?.icon) return null;

                                            const activeWl = isPerkWishlisted(activePlugHash, wishlistMatches);

                                            return (
                                                <div key={socket.socketIndex}>
                                                    {/* Active perk (full detail) */}
                                                    <div
                                                        className={`flex items-start gap-2.5 p-2 rounded-lg border transition-colors ${
                                                            socketOverrides[socket.socketIndex] !== undefined
                                                                ? 'bg-amber-400/[0.03] border-amber-400/[0.15]'
                                                                : activeWl.isWished
                                                                ? 'bg-green-400/[0.03] border-green-400/[0.12]'
                                                                : activeWl.isTrash
                                                                ? 'bg-red-400/[0.03] border-red-400/[0.12]'
                                                                : 'bg-white/[0.03] border-white/[0.08]'
                                                        }`}
                                                    >
                                                        <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden border border-white/20 bg-[#222]">
                                                            <BungieImage src={dp.icon} className="w-full h-full" />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-1.5 text-xs font-bold text-white leading-tight">
                                                                {dp.name}
                                                                {activeWl.isWished && <ThumbsUp size={10} className="text-green-400" />}
                                                                {activeWl.isTrash && <ThumbsDown size={10} className="text-red-400" />}
                                                            </div>
                                                            {(activeDef?.itemTypeDisplayName || socket.plugDef?.itemTypeDisplayName) && (
                                                                <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">
                                                                    {activeDef?.itemTypeDisplayName || socket.plugDef?.itemTypeDisplayName}
                                                                </div>
                                                            )}
                                                            {dp.description && (
                                                                <div className="text-[11px] text-gray-400 leading-relaxed mt-0.5">
                                                                    {dp.description}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Alternative plugs (compact PerkCircle row below) */}
                                                    {alts && alts.length > 1 && (
                                                        <div className="flex gap-1 mt-1 ml-1">
                                                            {alts.map(alt => {
                                                                const isActive = alt.plugHash === activePlugHash;
                                                                const isOriginal = alt.plugHash === originalPlugHash;
                                                                const isOverridden = socketOverrides[socket.socketIndex] !== undefined;
                                                                const wasOriginal = isOriginal && isOverridden && !isActive;
                                                                const altWl = isPerkWishlisted(alt.plugHash, wishlistMatches);
                                                                return (
                                                                    <div
                                                                        key={alt.plugHash}
                                                                        className={`relative transition-opacity ${
                                                                            isActive ? 'opacity-100' :
                                                                            wasOriginal ? 'opacity-50' :
                                                                            'opacity-40 hover:opacity-80'
                                                                        }`}
                                                                    >
                                                                        <PerkCircle
                                                                            plugDef={alt.plugDef}
                                                                            size={28}
                                                                            isPlugged={isActive && !isOverridden}
                                                                            isSelected={isActive && isOverridden}
                                                                            isNotSelected={wasOriginal}
                                                                            isEnhanced={isEnhancedPerk(alt.plugDef)}
                                                                            cannotRoll={!alt.canInsert}
                                                                            onClick={() => handlePlugClick(socket.socketIndex, alt.plugHash)}
                                                                            title={alt.plugDef?.displayProperties?.name || ''}
                                                                        />
                                                                        {altWl.isWished && (
                                                                            <div className="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-green-400 border border-[#0d0d0f]" title="Wishlist perk" />
                                                                        )}
                                                                        {altWl.isTrash && (
                                                                            <div className="absolute -right-0.5 -top-0.5 w-2 h-2 rounded-full bg-red-400 border border-[#0d0d0f]" title="Trash list perk" />
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ---- CATALYST PROGRESS (Exotic Weapons) ---- */}
                        {catalystInfo && (
                            <CatalystProgress data={catalystInfo} variant="full" />
                        )}

                        {/* ---- MODS ROW ---- */}
                        {(sockets.mods.length > 0 || sockets.weaponMods.length > 0) && (
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                                    Mods
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {sockets.mods.map(socket => (
                                        <ItemSocket
                                            key={socket.socketIndex}
                                            plugDef={socket.plugDef}
                                            categoryHash={socket.categoryHash}
                                            isActive={socket.isEnabled}
                                        />
                                    ))}
                                    {sockets.weaponMods.map(socket => (
                                        <ItemSocket
                                            key={socket.socketIndex}
                                            plugDef={socket.plugDef}
                                            categoryHash={socket.categoryHash}
                                            isActive={socket.isEnabled}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ---- ENERGY METER (Armor) ---- */}
                        {armorEnergy && (
                            <div>
                                <div className="flex items-center gap-1.5 mb-2">
                                    <Zap size={12} className="text-blue-400" />
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                        Energy
                                    </div>
                                    <span className="text-xs text-gray-300 font-mono font-bold ml-1">
                                        {armorEnergy.energyUsed}/{armorEnergy.energyCapacity}
                                    </span>
                                </div>
                                <div className="flex gap-1 p-2 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                                    {Array.from({ length: Math.max(10, armorEnergy.energyCapacity) }).map((_, i) => {
                                        const isUsed = i < armorEnergy.energyUsed;
                                        const isAvailable = i < armorEnergy.energyCapacity && !isUsed;
                                        const isLocked = i >= armorEnergy.energyCapacity;
                                        return (
                                            <div
                                                key={i}
                                                className={`flex-1 h-3 rounded-sm transition-colors ${
                                                    isUsed
                                                        ? 'bg-blue-400/80'
                                                        : isAvailable
                                                        ? 'bg-blue-400/20 border border-blue-400/30'
                                                        : isLocked
                                                        ? 'bg-white/[0.04] border border-white/[0.06]'
                                                        : ''
                                                }`}
                                                title={
                                                    isUsed ? `Slot ${i + 1}: Used`
                                                    : isAvailable ? `Slot ${i + 1}: Available`
                                                    : `Slot ${i + 1}: Locked`
                                                }
                                            />
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between mt-1 text-[10px] text-gray-500 px-0.5">
                                    <span>{armorEnergy.energyUsed} used</span>
                                    <span>{armorEnergy.energyCapacity - armorEnergy.energyUsed} available</span>
                                </div>
                            </div>
                        )}

                        {/* ---- STATS SECTION (Segmented Color Bars) ---- */}
                        {visibleStats.length > 0 && (
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                                    Stats
                                </div>
                                <div className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                                    {visibleStats.map(stat => (
                                        <StatRow key={stat.statHash} stat={stat} />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ---- COSMETICS ROW (Ornament, Shader) ---- */}
                        {(sockets.ornament || sockets.cosmetics.length > 0) && (
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                                    Cosmetics
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {sockets.ornament && (
                                        <ItemSocket
                                            plugDef={sockets.ornament.plugDef}
                                            categoryHash={sockets.ornament.categoryHash}
                                            isActive={true}
                                        />
                                    )}
                                    {sockets.cosmetics.map(socket => (
                                        <ItemSocket
                                            key={socket.socketIndex}
                                            plugDef={socket.plugDef}
                                            categoryHash={socket.categoryHash}
                                            isActive={socket.isEnabled}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ---- FLAVOR TEXT ---- */}
                        {flavorText && (
                            <div className="text-sm text-gray-400 italic leading-relaxed border-l-2 border-white/10 pl-3">
                                "{flavorText}"
                            </div>
                        )}

                        {/* ---- LORE ---- */}
                        {loreText && (
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                                    Lore
                                </div>
                                <div className="text-xs text-gray-400 leading-relaxed max-h-[200px] overflow-y-auto pr-1 whitespace-pre-line">
                                    {loreText}
                                </div>
                            </div>
                        )}

                        {/* ---- YOUR ITEMS (All owned copies) ---- */}
                        {yourItems.length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                                        Your Items ({yourItems.length + 1} total)
                                    </div>
                                    <button
                                        onClick={() => startCompare(item)}
                                        className="flex items-center gap-1 px-2 py-1 text-[10px] text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded transition-colors uppercase tracking-wider font-bold"
                                    >
                                        <GitCompare size={10} />
                                        Compare
                                    </button>
                                </div>
                                <div className="grid grid-cols-[repeat(auto-fill,_52px)] gap-1.5">
                                    {yourItems.map(ownedItem => {
                                        const ownedDef = manifest[ownedItem.itemHash];
                                        const ownedPower = ownedItem.instanceData?.primaryStat?.value;
                                        const ownerName = ownedItem.owner === 'vault'
                                            ? 'Vault'
                                            : characters[ownedItem.owner]?.classType !== undefined
                                                ? ['Titan', 'Hunter', 'Warlock'][characters[ownedItem.owner].classType] || 'Unknown'
                                                : 'Unknown';
                                        return (
                                            <div
                                                key={ownedItem.itemInstanceId}
                                                className="relative group"
                                                title={`${ownerName}${ownedPower ? ` • ${ownedPower}` : ''}`}
                                            >
                                                <div
                                                    className="w-[52px] h-[52px] rounded border border-white/10 overflow-hidden"
                                                    style={{ borderColor: `${rarityColor}40` }}
                                                >
                                                    {ownedDef?.displayProperties?.icon && (
                                                        <BungieImage
                                                            src={ownedDef.displayProperties.icon}
                                                            className="w-full h-full"
                                                        />
                                                    )}
                                                </div>
                                                {ownedPower && (
                                                    <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] font-mono font-bold text-white bg-black/70 leading-tight py-px">
                                                        {ownedPower}
                                                    </div>
                                                )}
                                                {/* Owner indicator */}
                                                <div className="absolute -top-1 -right-1 text-[8px] bg-black/80 text-gray-400 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {ownerName}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* ---- TRIAGE (Vault Cleaning Intelligence) ---- */}
                        <TriagePanel
                            item={item}
                            allItems={allItems}
                            manifest={manifest}
                        />

                        {/* ---- EXTERNAL LINKS ---- */}
                        <div className="flex gap-2 pt-2 border-t border-white/[0.06]">
                            <a
                                href={`https://www.light.gg/db/items/${definition?.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded transition-colors"
                            >
                                <ExternalLink size={12} />
                                light.gg
                            </a>
                            <a
                                href={`https://d2foundry.gg/w/${definition?.hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] rounded transition-colors"
                            >
                                <ExternalLink size={12} />
                                D2 Foundry
                            </a>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * StatRow — A single stat line with segmented color-coded bar.
 * Ported from DIM's ItemStat.tsx StatBar pattern.
 * Colors: gray=base, blue=parts, green=traits, purple=mods, gold=masterwork
 */
const StatRow: React.FC<{ stat: import('../../lib/destiny/stat-manager').CalculatedStat }> = ({ stat }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    // Determine if stat label should be gold (masterwork affected)
    const hasMasterwork = stat.segments.some(([, t]) => t === 'masterwork');
    const hasModBonus = stat.segments.some(([v, t]) => t === 'mod' && v > 0);

    return (
        <div className="flex items-center gap-2">
            <div
                className="w-28 text-right text-xs truncate shrink-0"
                style={{ color: hasMasterwork ? '#ceae33' : hasModBonus ? '#a855f7' : '#9ca3af' }}
            >
                {stat.label}
            </div>
            <div className="w-8 text-right text-xs font-bold text-white tabular-nums font-mono shrink-0">
                {stat.displayValue}
            </div>
            <div className="flex-1 h-[6px] bg-white/[0.06] rounded-full overflow-hidden flex items-center relative">
                {stat.statHash === StatHashes.RecoilDirection ? (
                    <div className="w-full">
                        <RecoilStat value={stat.displayValue} />
                    </div>
                ) : stat.isBar ? (
                    <div
                        className="relative h-full w-full flex"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                    >
                        {stat.segments.map(([val, segType], i) => {
                            if (val <= 0) return null;
                            const pct = Math.min((val / stat.maximumValue) * 100, 100);
                            return (
                                <div
                                    key={i}
                                    className="h-full transition-all"
                                    style={{
                                        width: `${pct}%`,
                                        backgroundColor: SEGMENT_COLORS[segType],
                                        borderRadius: i === 0 ? '9999px 0 0 9999px' :
                                            i === stat.segments.length - 1 ? '0 9999px 9999px 0' : '0',
                                    }}
                                />
                            );
                        })}

                        {/* Hover tooltip */}
                        {showTooltip && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-[#1a1a1e] border border-white/10 rounded-md px-3 py-2 shadow-xl pointer-events-none whitespace-nowrap">
                                <StatBarTooltip
                                    segments={stat.segments}
                                    statLabel={stat.label}
                                    displayValue={stat.displayValue}
                                />
                            </div>
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    );
};

export default ItemDetailOverlay;
