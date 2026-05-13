import React, { useMemo, useState } from 'react';
import { X, Lock, Unlock, Tag, RefreshCw, Maximize2, Diamond, ChevronDown, LayoutGrid, Anchor, Archive, GitCompare, ArrowRightLeft } from 'lucide-react';
import { ElementIcon } from '../destiny/ElementIcons';
import RecoilStat from '../destiny/RecoilStat';
import { calculateStats } from '../../lib/destiny/stat-manager';
import { categorizeSockets } from '../../lib/destiny/socket-helper';
import { ItemSocket } from '../item/ItemSocket';
import { BungieImage } from '../ui/BungieImage';
import { useDefinitions } from '../../hooks/useDefinitions';
import { StatHashes } from '../../lib/destiny-constants';
import { getKillTracker, getCraftedInfo, getCatalystInfo, getDeepsightInfo } from '../../lib/destiny/item-info';
import catalystMapping from '../../data/exotic-to-catalyst-record.json';
import { KillTrackerBadge, CraftedWeaponBadge, DeepsightBadge, CatalystProgress } from '../item/ItemPopupInfo';

import { ItemDetailOverlay } from './ItemDetailOverlay';
import { InfusionFinder } from './InfusionFinder';
import clsx from 'clsx';
import {
    useFloating,
    offset,
    flip,
    shift,
    autoUpdate,
    FloatingPortal
} from '@floating-ui/react';
// Import CSS Modules
import styles from './styles/ItemPopup.module.scss';
import headerStyles from './styles/ItemPopupHeader.module.scss';

import { useInventoryStore } from '../../store/useInventoryStore';

interface ItemDetailModalProps {
    item: any;
    definition: any;
    definitions: Record<string, any>;
    referenceElement: HTMLElement | null;
    onClose: () => void;
    // moveItem: removed (using store)
    characters: any[];
}


const SEGMENT_COLORS: Record<string, string> = {
    base: '#888888',
    parts: '#68a8e0',
    traits: '#5ac467',
    mod: '#a855f7',
    masterwork: '#ceae33',
};

const tierTypeToRarity: Record<number, string> = {
    6: 'exotic',
    5: 'legendary',
    4: 'rare',
    3: 'uncommon',
    2: 'common',
    0: 'common',
    1: 'common'
};

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
    item,
    definition,
    definitions: initialDefinitions,
    referenceElement,
    onClose,
    // moveItem, // Removed
    characters
}) => {
    // --- Floating UI Setup ---
    const { refs, floatingStyles, placement } = useFloating({
        elements: { reference: referenceElement },
        placement: 'right-start',
        middleware: [
            offset(10),
            flip({ fallbackPlacements: ['left-start', 'bottom', 'top'] }),
            shift({ padding: 8 })
        ],
        whileElementsMounted: autoUpdate
    });

    const moveItem = useInventoryStore(state => state.moveItem);
    const startCompare = useInventoryStore(state => state.startCompare);

    if (!item || !definition || !referenceElement) return null;

    // --- JIT Definitions ---
    const plugHashes = useMemo(() => {
        const hashes = new Set<number>();
        const liveSockets = item?.sockets?.sockets || item?.itemComponents?.sockets?.data?.sockets;
        if (liveSockets) {
            for (const s of liveSockets) if (s.plugHash) hashes.add(s.plugHash);
        }
        return Array.from(hashes);
    }, [item]);

    const { definitions: plugDefinitions } = useDefinitions('DestinyInventoryItemDefinition', plugHashes);
    const definitions = useMemo(() => ({ ...initialDefinitions, ...plugDefinitions }), [initialDefinitions, plugDefinitions]);

    // --- Logic ---
    const { state } = item;
    const isMasterwork = (state & 4) !== 0;
    const isLocked = (state & 1) !== 0;
    const power = item.instanceData?.primaryStat?.value || item.primaryStat?.value;
    const damageTypeHash = item.instanceData?.damageTypeHash || definition.defaultDamageTypeHash;
    const tierType = definition.inventory?.tierType || 0;
    const isExotic = tierType === 6;
    const itemTypeDisplayName = definition.itemTypeDisplayName;
    const rarity = tierTypeToRarity[tierType] || 'common';

    
    // --- Item Info Features (Kill Tracker, Crafted, Energy, Catalyst, Deepsight) ---
    const killTracker = useMemo(() => getKillTracker(item, definition), [item, definition]);
    const craftedInfo = useMemo(() => getCraftedInfo(item, definition), [item, definition]);

    const profile = useInventoryStore(s => s.profile);
    const profileRecords = useMemo(() => profile?.profileRecords?.data, [profile]);
    const characterRecords = useMemo(() => profile?.characterRecords?.data, [profile]);

    const catalystInfo = useMemo(() => {
        if (!isExotic) return null;
        return getCatalystInfo(
            item?.itemHash,
            profileRecords,
            characterRecords,
            catalystMapping as Record<string, number>,
        );
    }, [item?.itemHash, isExotic, profileRecords, characterRecords]);

    const recordHashes = useMemo(() => [] as number[], []); // Empty = load full table
    const { definitions: recordDefs } = useDefinitions('DestinyRecordDefinition', recordHashes);
    const patternRecordMap = useMemo(() => {
        const map: Record<string, number> = {};
        for (const [hash, record] of Object.entries(recordDefs)) {
            const rec = record as any;
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

    const calculatedStats = useMemo(() => calculateStats(item, definition, definitions), [item, definition, definitions]);
    const sockets = useMemo(() => categorizeSockets(item, definition, definitions), [item, definition, definitions]);

    const itemOwner = item.owner || 'unknown';
    const [isTransferring, setIsTransferring] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);
    const [showInfusion, setShowInfusion] = useState(false);

    // Move Handler
    const handleMove = (targetId: string, isVault: boolean) => {
        if (isTransferring) return;
        if (targetId === itemOwner && !isVault) return; // Already on char
        if (itemOwner === 'vault' && isVault) return; // Already in vault

        // Instant Interaction
        setIsTransferring(true);
        onClose();

        // Fire and forget (Optimistic UI will handle the visual feedback)
        moveItem(item.itemInstanceId, item.itemHash, targetId, isVault).catch(err => {
            console.error("Transfer failed after modal close:", err);
        });
    };

    return (
        <FloatingPortal>
            {/* Backdrop - click to close */}
            <div
                className="fixed inset-0 z-[100] bg-black/30"
                onClick={onClose}
            />

            {/* Floating Popup */}
            <div
                ref={refs.setFloating}
                style={floatingStyles}
                className={clsx(
                    'z-[101]',
                    'item-popup',
                    styles.movePopupDialog,
                    styles[rarity],
                    styles.desktopPopupRoot
                )}
                role="dialog"
                aria-modal="true"
                data-popper-placement={placement}
            >
                <div className={styles.desktopPopup}>

                    {/* BODY */}
                    <div className={clsx(styles.desktopPopupBody, styles.popupBackground, "!bg-black/80 !backdrop-blur-md border border-white/10")}>

                        {/* HEADER using ItemPopupHeader styles */}
                        <div className={clsx(headerStyles.header, headerStyles[rarity], isMasterwork && headerStyles.masterwork)}>

                            <h1
                                className={clsx(headerStyles.title, 'cursor-pointer hover:underline')}
                                onClick={() => setShowOverlay(true)}
                                title="View full item details"
                            >
                                {definition.displayProperties.name}
                            </h1>
                            <div className={headerStyles.subtitle}>
                                <div className={headerStyles.type}>
                                    {/* Item Type */}
                                    <div className={headerStyles.itemType}>{itemTypeDisplayName}</div>
                                </div>
                                <div className={headerStyles.details}>
                                    <ElementIcon damageTypeHash={damageTypeHash} size={16} className={headerStyles.elementIcon} />
                                    <div className={`${headerStyles.power} font-mono`}>{power}</div>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT - Flex row with main content + sidebar */}
                        <div className="flex bg-[#111] text-[#eee] max-h-[70vh]">
                            {/* LEFT: Main Content */}
                            <div className="flex flex-col w-[320px] overflow-y-auto">
                                {/* TABS Placeholder */}
                                <div className="flex border-b border-[#333]">
                                    <button className="flex-1 py-1.5 text-xs font-semibold border-b-2 border-orange-500 text-white">Overview</button>
                                    <button className="flex-1 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-200 border-b-2 border-transparent">Triage</button>
                                </div>

                                {/* TAGS / NOTES (Quick Action) */}
                                <div className="p-2 border-b border-[#333] flex items-center gap-2 text-xs font-semibold text-gray-200 hover:bg-white/5 cursor-pointer transition-colors">
                                    <RefreshCw size={14} /> <span>Add notes</span>
                                </div>

                                {/* Pattern / Crafted / Kill Tracker / Catalyst Badges */}
                                {(killTracker || craftedInfo || deepsightInfo || catalystInfo) && (
                                    <div className="p-2 border-b border-[#333] flex flex-wrap gap-2">
                                        {craftedInfo && <CraftedWeaponBadge data={craftedInfo} />}
                                        {deepsightInfo && <DeepsightBadge data={deepsightInfo} />}
                                        {killTracker && <KillTrackerBadge data={killTracker} />}
                                        {catalystInfo && <CatalystProgress data={catalystInfo} />}
                                    </div>
                                )}

                                {/* STATS */}
                                <div className="p-3 text-[13px]">
                                    {calculatedStats.filter(stat => stat.displayValue > 0 || stat.statHash === StatHashes.RecoilDirection).length > 0 ? calculatedStats.filter(stat => stat.displayValue > 0 || stat.statHash === StatHashes.RecoilDirection).map(stat => (
                                        <div key={stat.statHash} className="flex items-center gap-3 mb-1">
                                            <div className="w-28 text-right text-gray-300">{stat.label}</div>
                                            <div className={clsx("w-6 text-right font-bold tabular-nums font-mono", stat.bonusValue > 0 ? "text-orange-400" : "text-white")}>
                                                {stat.displayValue}
                                            </div>
                                            <div className="flex-1 flex items-center">
                                                {stat.statHash === StatHashes.RecoilDirection ? (
                                                    <div className="w-full"><RecoilStat value={stat.displayValue} /></div>
                                                ) : stat.isBar ? (
                                                    <div className="w-full h-[12px] bg-[#333] flex">
                                                        {stat.segments.map(([value, type], i) => (
                                                            <div
                                                                key={i}
                                                                className="h-full"
                                                                style={{
                                                                    width: `${Math.min(100, (value / stat.maximumValue) * 100)}%`,
                                                                    backgroundColor: SEGMENT_COLORS[type],
                                                                }}
                                                            />
                                                        ))}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )) : <div className="text-gray-500 italic text-xs p-2">No stats</div>}
                                </div>

                                {/* Intrinsic Frame (at bottom like DIM) */}
                                {sockets.intrinsic && (
                                    <div className="p-3 border-t border-[#333] bg-[#222]">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 shrink-0 border border-white/20">
                                                <BungieImage src={sockets.intrinsic.plugDef.displayProperties.icon} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="leading-tight">
                                                <div className="font-bold text-[13px] text-[#e2bf36]">{sockets.intrinsic.plugDef.displayProperties.name}</div>
                                                {calculatedStats.find(s => s.statHash === StatHashes.RoundsPerMinute) && calculatedStats.find(s => s.statHash === StatHashes.Impact) ? (
                                                    <div className="text-[11px] text-gray-400 mt-0.5">
                                                        {calculatedStats.find(s => s.statHash === StatHashes.RoundsPerMinute)?.displayValue} rpm / {calculatedStats.find(s => s.statHash === StatHashes.Impact)?.displayValue} impact
                                                    </div>
                                                ) : (
                                                    <div className="text-[11px] text-gray-400 mt-0.5">{sockets.intrinsic.plugDef.itemTypeDisplayName}</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* SOCKETS GRID - Reorganized to match DIM layout */}
                                <div className="p-3 border-t border-[#333] bg-[#1a1a1a]">
                                    <div className="flex flex-col gap-2">
                                        {/* Main Perks Grid */}
                                        {sockets.perks.length > 0 && (
                                            <div className="flex gap-2">
                                                {sockets.perks.map(socket => (
                                                    <ItemSocket
                                                        key={socket.socketIndex}
                                                        plugDef={socket.plugDef}
                                                        categoryHash={socket.categoryHash}
                                                        isActive={socket.isEnabled}
                                                    />
                                                ))}
                                                
                                            </div>
                                        )}

                                        {/* Footer: Weapon Mods, Catalysts, Ornaments */}
                                        <div className="flex gap-2 pt-2 mt-1 border-t border-[#333]">
                                            {/* Mod */}
                                            {sockets.weaponMods.map(socket => (
                                                <ItemSocket key={socket.socketIndex} plugDef={socket.plugDef} categoryHash={socket.categoryHash} isActive={socket.isEnabled} />
                                            ))}

                                            {/* Catalyst */}
                                            {isExotic && sockets.catalyst && (
                                                <ItemSocket plugDef={sockets.catalyst.socket?.plugDef || null} categoryHash={sockets.catalyst.socket?.categoryHash || 0} isActive={sockets.catalyst.state === 'active'} />
                                            )}

                                            {/* Ornament */}
                                            {sockets.ornament && (
                                                <ItemSocket plugDef={sockets.ornament.plugDef} categoryHash={sockets.ornament.categoryHash} isActive={true} />
                                            )}
                                            
                                            {/* Shaders */}
                                            {sockets.cosmetics.map(socket => (
                                                <ItemSocket key={socket.socketIndex} plugDef={socket.plugDef} categoryHash={socket.categoryHash} isActive={socket.isEnabled} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT: Action Sidebar (DIM-style) */}
                            <div className="w-[140px] bg-[#0a0a0a] border-l border-[#333] flex flex-col">
                                {/* Sidebar Header */}
                                <div className="px-3 py-2 border-b border-[#333] bg-[#111]">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Actions</span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-col gap-1 p-2">
                                    {/* Tag Item */}
                                    <button className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded transition-colors">
                                        <Tag size={14} />
                                        <span>Tag Item</span>
                                    </button>

                                    {/* Lock Status */}
                                    <button className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded transition-colors">
                                        {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                                        <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
                                    </button>

                                    {/* Compare */}
                                    <button
                                        onClick={() => {
                                            startCompare(item);
                                            onClose();
                                        }}
                                        className="flex items-center gap-2 px-2 py-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                                    >
                                        <GitCompare size={14} />
                                        <span>Compare</span>
                                    </button>

                                    {/* Loadout */}
                                    <button className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded transition-colors">
                                        <LayoutGrid size={14} />
                                        <span>Loadout</span>
                                    </button>

                                    {/* Infuse */}
                                    {power && (
                                        <button
                                            onClick={() => setShowInfusion(true)}
                                            className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-300 hover:text-[#f5dc56] hover:bg-white/5 rounded transition-colors"
                                        >
                                            <ArrowRightLeft size={14} />
                                            <span>Infuse</span>
                                        </button>
                                    )}
                                </div>

                                {/* Divider */}
                                <div className="border-t border-[#333] my-2" />

                                {/* Equip On Section */}
                                <div className="px-3 py-2">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Equip on</span>
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                        {characters.slice(0, 3).map(char => (
                                            <button
                                                key={char.characterId}
                                                className="w-8 h-8 rounded border border-white/20 hover:border-white/40 transition-colors overflow-hidden"
                                                title={`${char.classType}`}
                                            >
                                                {char.emblemPath ? (
                                                    <BungieImage 
                                                        src={char.emblemPath}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-700" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Pull to Section */}
                                <div className="px-3 py-2">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Pull to</span>
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                        {characters.slice(0, 3).map(char => (
                                            <button
                                                key={char.characterId}
                                                onClick={() => {
                                                    moveItem(item.itemInstanceId, item.itemHash, char.characterId, false);
                                                    onClose();
                                                }}
                                                className="w-8 h-8 rounded border border-white/20 hover:border-white/40 transition-colors overflow-hidden"
                                                title={`${char.classType}`}
                                            >
                                                {char.emblemPath ? (
                                                    <BungieImage 
                                                        src={char.emblemPath}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full bg-gray-700" />
                                                )}
                                            </button>
                                        ))}
                                        {/* Vault Button */}
                                        <button
                                            onClick={() => {
                                                moveItem(item.itemInstanceId, item.itemHash, 'vault', true);
                                                onClose();
                                            }}
                                            className="w-8 h-8 rounded border border-white/20 hover:border-white/40 bg-[#1a1a1a] flex items-center justify-center"
                                            title="Vault"
                                        >
                                            <Archive size={14} className="text-gray-400" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Full Item Detail Overlay */}
            {showOverlay && (
                <ItemDetailOverlay
                    item={item}
                    definition={definition}
                    definitions={definitions}
                    onClose={() => setShowOverlay(false)}
                />
            )}

            {/* Infusion Finder Modal */}
            {showInfusion && (
                <InfusionFinder
                    item={item}
                    definition={definition}
                    definitions={definitions}
                    onClose={() => setShowInfusion(false)}
                />
            )}
        </FloatingPortal>
    );
};
