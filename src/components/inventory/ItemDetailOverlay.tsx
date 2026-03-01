import React, { useMemo } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { ElementIcon } from '../destiny/ElementIcons';
import RecoilStat from '../destiny/RecoilStat';
import { calculateStats } from '../../lib/destiny/stat-manager';
import { categorizeSockets } from '../../lib/destiny/socket-helper';
import { ItemSocket } from '../item/ItemSocket';
import { BungieImage, bungieNetPath } from '../ui/BungieImage';
import { useDefinitions } from '../../hooks/useDefinitions';
import { StatHashes } from '../../lib/destiny-constants';

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
    const plugHashes = useMemo(() => {
        const hashes = new Set<number>();
        const liveSockets = item?.sockets?.sockets || item?.itemComponents?.sockets?.data?.sockets;
        if (liveSockets) {
            for (const s of liveSockets) if (s.plugHash) hashes.add(s.plugHash);
        }
        // Also fetch lore definition if available
        if (definition?.loreHash) hashes.add(definition.loreHash);
        // Fetch collectible definition for source string
        if (definition?.collectibleHash) hashes.add(definition.collectibleHash);
        return Array.from(hashes);
    }, [item, definition]);

    const { definitions: plugDefinitions } = useDefinitions('DestinyInventoryItemDefinition', plugHashes);

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
        () => ({ ...initialDefinitions, ...plugDefinitions, ...statGroupDefs }),
        [initialDefinitions, plugDefinitions, statGroupDefs]
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

    // Stats & Sockets
    const calculatedStats = useMemo(
        () => calculateStats(item, definition, definitions),
        [item, definition, definitions]
    );
    const sockets = useMemo(
        () => categorizeSockets(item, definition, definitions),
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

                                {/* Season watermark */}
                                {watermarkIcon && (
                                    <div className="w-10 h-10 opacity-60 shrink-0">
                                        <BungieImage src={watermarkIcon} className="w-full h-full" />
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

                        {/* ---- INTRINSIC FRAME PERK ---- */}
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
                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
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

                        {/* ---- PERKS ROW ---- */}
                        {sockets.perks.length > 0 && (
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                                    Perks
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {sockets.perks.map(socket => (
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

                        {/* ---- STATS SECTION ---- */}
                        {visibleStats.length > 0 && (
                            <div>
                                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2">
                                    Stats
                                </div>
                                <div className="space-y-1.5 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                                    {visibleStats.map(stat => (
                                        <div key={stat.statHash} className="flex items-center gap-2">
                                            <div className="w-28 text-right text-xs text-gray-400 truncate shrink-0">
                                                {stat.label}
                                            </div>
                                            <div className="w-8 text-right text-xs font-bold text-white tabular-nums font-mono shrink-0">
                                                {stat.displayValue}
                                            </div>
                                            <div className="flex-1 h-[6px] bg-white/[0.06] rounded-full overflow-hidden flex items-center">
                                                {stat.statHash === StatHashes.RecoilDirection ? (
                                                    <div className="w-full">
                                                        <RecoilStat value={stat.displayValue} />
                                                    </div>
                                                ) : stat.isBar ? (
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{
                                                            width: `${Math.min(100, (stat.displayValue / stat.maximumValue) * 100)}%`,
                                                            backgroundColor: stat.bonusValue > 0 ? '#4ade80' : 'white',
                                                        }}
                                                    />
                                                ) : null}
                                            </div>
                                        </div>
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

export default ItemDetailOverlay;
