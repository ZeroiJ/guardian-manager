import React, { useMemo, useState } from 'react';
import { X, Lock, Unlock, Tag, RefreshCw, Maximize2, Diamond, ChevronDown, LayoutGrid, Anchor, Archive } from 'lucide-react';
import { ElementIcon } from '../destiny/ElementIcons';
import RecoilStat from '../destiny/RecoilStat';
import { calculateStats } from '../../lib/destiny/stat-manager';
import { categorizeSockets } from '../../lib/destiny/socket-helper';
import { ItemSocket } from '../item/ItemSocket';
import { BungieImage } from '../ui/BungieImage';
import { useDefinitions } from '../../hooks/useDefinitions';
import { StatHashes } from '../../lib/destiny-constants';
import { ItemDetailOverlay } from './ItemDetailOverlay';
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

    const calculatedStats = useMemo(() => calculateStats(item, definition, definitions), [item, definition, definitions]);
    const sockets = useMemo(() => categorizeSockets(item, definition, definitions), [item, definition, definitions]);

    const itemOwner = item.owner || 'unknown';
    const [isTransferring, setIsTransferring] = useState(false);
    const [showOverlay, setShowOverlay] = useState(false);

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

                        {/* CONTENT (Custom Tailwind for internal layout to fit DIM shell) */}
                        <div className="flex flex-col bg-[#111] text-[#eee] w-[320px] max-h-[70vh] overflow-y-auto">

                            {/* TABS Placeholder */}
                            <div className="flex border-b border-[#333]">
                                <button className="flex-1 py-1.5 text-xs font-semibold border-b-2 border-orange-500 text-white">Overview</button>
                                <button className="flex-1 py-1.5 text-xs font-semibold text-gray-400 hover:text-gray-200 border-b-2 border-transparent">Triage</button>
                            </div>

                            {/* TAGS / NOTES (Quick Action) */}
                            <div className="p-2 border-b border-[#333] flex items-center gap-2 text-xs font-semibold text-gray-200 hover:bg-white/5 cursor-pointer transition-colors">
                                <RefreshCw size={14} /> <span>Add notes</span>
                            </div>

                            {/* Objectives (Pattern, Kill Tracker) */}
                            {item.itemComponents?.objectives?.data?.objectives && (
                                <div className="border-b border-[#333] p-2 space-y-1">
                                    {item.itemComponents.objectives.data.objectives.map((obj: any, idx: number) => {
                                        const objDef = definitions.DestinyObjectiveDefinition?.[obj.objectiveHash];
                                        if (!objDef) return null;
                                        return (
                                            <div key={idx} className="flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-1.5">
                                                    {objDef.displayProperties?.icon && (
                                                        <BungieImage src={objDef.displayProperties.icon} className="w-4 h-4" />
                                                    )}
                                                    <span className="text-gray-300">{objDef.progressDescription || 'Objective'}</span>
                                                </div>
                                                <div className="text-gray-400">
                                                    {objDef.completionValue > 1 ? `${obj.progress}/${objDef.completionValue}` : obj.progress}
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                                    <div
                                                        className="h-full bg-white"
                                                        style={{ width: `${Math.min(100, (stat.baseValue / stat.maximumValue) * 100)}%` }}
                                                    />
                                                    {stat.bonusValue > 0 && (
                                                        <div
                                                            className="h-full bg-orange-400"
                                                            style={{ width: `${Math.min(100, (stat.bonusValue / stat.maximumValue) * 100)}%` }}
                                                        />
                                                    )}
                                                    {stat.bonusValue < 0 && (
                                                        <div
                                                            className="h-full bg-red-600"
                                                            style={{ width: `${Math.min(100, (Math.abs(stat.bonusValue) / stat.maximumValue) * 100)}%` }}
                                                        />
                                                    )}
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
                                            <div className="font-bold text-[13px] text-[#eee]">{sockets.intrinsic.plugDef.displayProperties.name}</div>
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
                                            <div className="flex flex-col gap-1 ml-auto">
                                                 <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-xs text-gray-400 hover:text-white cursor-pointer bg-black/50">
                                                     <LayoutGrid size={12} />
                                                 </div>
                                            </div>
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
        </FloatingPortal>
    );
};
