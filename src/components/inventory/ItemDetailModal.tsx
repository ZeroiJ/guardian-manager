import React, { useMemo } from 'react';
import { X, Lock, Unlock, Tag, RefreshCw, Maximize2 } from 'lucide-react';
import { getElementIcon } from '../destiny/ElementIcons';
import RecoilStat from '../destiny/RecoilStat';
import { calculateStats } from '../../lib/destiny/stat-manager';
import { categorizeSockets } from '../../lib/destiny/socket-helper';
import { ItemSocket } from '../item/ItemSocket';
import { useDefinitions } from '../../hooks/useDefinitions';
import { StatHashes } from '../../lib/destiny-constants';
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

interface ItemDetailModalProps {
    item: any;
    definition: any;
    definitions: Record<string, any>;
    referenceElement: HTMLElement | null;
    onClose: () => void;
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
    onClose
}) => {
    // --- Floating UI Setup ---
    const { refs, floatingStyles } = useFloating({
        elements: { reference: referenceElement },
        placement: 'right-start',
        middleware: [
            offset(10),
            flip({ fallbackPlacements: ['left-start', 'bottom', 'top'] }),
            shift({ padding: 8 })
        ],
        whileElementsMounted: autoUpdate
    });

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
    const isLocked = (state & 1) !== 0;
    const power = item.instanceData?.primaryStat?.value || item.primaryStat?.value;
    const damageTypeHash = item.instanceData?.damageTypeHash || definition.defaultDamageTypeHash;
    const tierType = definition.inventory?.tierType || 0;
    const itemTypeDisplayName = definition.itemTypeDisplayName;
    const rarity = tierTypeToRarity[tierType] || 'common';

    const calculatedStats = useMemo(() => calculateStats(item, definition, definitions), [item, definition, definitions]);
    const sockets = useMemo(() => categorizeSockets(item, definition, definitions), [item, definition, definitions]);
    const ElementIconComponent = getElementIcon(damageTypeHash);

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
            >
                <div className={styles.desktopPopup}>

                    {/* BODY */}
                    <div className={clsx(styles.desktopPopupBody, styles.popupBackground)}>

                        {/* HEADER using ItemPopupHeader styles */}
                        <div className={clsx(headerStyles.header, headerStyles[rarity])}>
                            <h1 className={headerStyles.title}>
                                {definition.displayProperties.name}
                            </h1>
                            <div className={headerStyles.subtitle}>
                                <div className={headerStyles.type}>
                                    {/* Item Type */}
                                    <div className={headerStyles.itemType}>{itemTypeDisplayName}</div>
                                </div>
                                <div className={headerStyles.details}>
                                    {ElementIconComponent && <ElementIconComponent size={16} className={headerStyles.elementIcon} />}
                                    <div className={headerStyles.power}>{power}</div>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT (Custom Tailwind for internal layout to fit DIM shell) */}
                        <div className="p-2 space-y-4 overflow-y-auto max-h-[60vh] bg-[#111] text-[#eee]">

                            {/* TABS Placeholder */}
                            <div className="flex border-b border-white/10 pb-0">
                                <button className="px-4 py-2 text-sm font-bold border-b-2 border-orange-500 text-white">Overview</button>
                                <button className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-gray-200">Triage</button>
                            </div>

                            {/* TAGS / NOTES (Quick Action) */}
                            <div className="bg-[#111] border border-white/10 rounded p-2 flex items-center gap-2 text-gray-400 hover:text-white cursor-pointer transition-colors">
                                <RefreshCw size={14} /> <span>Add notes</span>
                            </div>

                            {/* STATS */}
                            <div className="p-2 rounded">
                                {calculatedStats.length > 0 ? calculatedStats.map(stat => (
                                    <div key={stat.statHash} className="flex items-center gap-2 mb-1 last:mb-0">
                                        <div className="w-24 text-right text-xs text-gray-400 truncate">{stat.label}</div>
                                        <div className="w-6 text-right text-xs font-bold text-white tabular-nums">
                                            {stat.displayValue}
                                        </div>
                                        <div className="flex-1 h-3 bg-gray-700/30 rounded-full overflow-hidden flex items-center">
                                            {stat.statHash === StatHashes.RecoilDirection ? (
                                                <div className="w-full"><RecoilStat value={stat.displayValue} /></div>
                                            ) : stat.isBar ? (
                                                <div
                                                    className="h-full bg-white"
                                                    style={{
                                                        width: `${Math.min(100, (stat.displayValue / stat.maximumValue) * 100)}%`,
                                                        backgroundColor: stat.bonusValue > 0 ? '#4ade80' : 'white'
                                                    }}
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                )) : <div className="text-gray-500 italic text-xs p-2">No stats</div>}
                            </div>

                            {/* SEPARATOR */}
                            <div className="h-px bg-white/10 my-2" />

                            {/* SOCKETS GRID */}
                            <div className="space-y-3">
                                {/* Row A: Intrinsic */}
                                {sockets.intrinsic && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 shrink-0">
                                            <ItemSocket
                                                plugDef={sockets.intrinsic.plugDef}
                                                categoryHash={sockets.intrinsic.categoryHash}
                                                isActive={true}
                                            />
                                        </div>
                                        <div className="leading-tight">
                                            <div className="font-bold text-sm text-[#e2bf36]">{sockets.intrinsic.plugDef.displayProperties.name}</div>
                                            <div className="text-xs text-gray-400">{sockets.intrinsic.plugDef.itemTypeDisplayName}</div>
                                        </div>
                                    </div>
                                )}

                                {/* Row B: Perks */}
                                {sockets.perks.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {sockets.perks.map(socket => (
                                            <ItemSocket key={socket.socketIndex} plugDef={socket.plugDef} categoryHash={socket.categoryHash} isActive={socket.isEnabled} />
                                        ))}
                                    </div>
                                )}

                                {/* Row C: Mods */}
                                {sockets.mods.length > 0 && (
                                    <div className="flex gap-2 pt-2 border-t border-white/10">
                                        {sockets.mods.map(socket => (
                                            <ItemSocket key={socket.socketIndex} plugDef={socket.plugDef} categoryHash={socket.categoryHash} isActive={socket.isEnabled} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* SIDEBAR ACTIONS (Right Side) */}
                    <div className={styles.desktopActions}>
                        <div className="flex flex-col items-center py-2 gap-2 bg-[#090909] h-full border-l border-white/10 w-[48px]">
                            {/* Lock / Unlock */}
                            <button
                                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded"
                                title={isLocked ? "Unlock" : "Lock"}
                            >
                                {isLocked ? <Lock size={20} className="text-[#e2bf36]" /> : <Unlock size={20} />}
                            </button>

                            {/* Tag */}
                            <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded">
                                <Tag size={20} />
                            </button>

                            {/* Compare */}
                            <button className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded">
                                <Maximize2 size={20} />
                            </button>

                            <div className="w-8 h-px bg-white/10 my-1" />

                            {/* Close */}
                            <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-red-400 hover:bg-red-500/20 rounded">
                                <X size={24} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </FloatingPortal>
    );
};
