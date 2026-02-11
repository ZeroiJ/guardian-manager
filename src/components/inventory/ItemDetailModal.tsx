import React, { useMemo } from 'react';
import { X, Lock, Unlock, Tag, RefreshCw, Maximize2, Diamond } from 'lucide-react';
import { ElementIcon } from '../destiny/ElementIcons';
import RecoilStat from '../destiny/RecoilStat';
import { calculateStats } from '../../lib/destiny/stat-manager';
import { categorizeSockets } from '../../lib/destiny/socket-helper';
import { ItemSocket } from '../item/ItemSocket';
import { BungieImage } from '../ui/BungieImage';
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
    moveItem: (itemInstanceId: string, itemHash: number, targetOwnerId: string, isVault: boolean) => Promise<void>;
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
    moveItem,
    characters
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
    const isExotic = tierType === 6;
    const itemTypeDisplayName = definition.itemTypeDisplayName;
    const rarity = tierTypeToRarity[tierType] || 'common';

    const calculatedStats = useMemo(() => calculateStats(item, definition, definitions), [item, definition, definitions]);
    const sockets = useMemo(() => categorizeSockets(item, definition, definitions), [item, definition, definitions]);

    const itemOwner = item.owner || 'unknown';

    // Move Handler
    const handleMove = (targetId: string, isVault: boolean) => {
        if (targetId === itemOwner && !isVault) return; // Already on char (Equip logic would go here)
        if (itemOwner === 'vault' && isVault) return; // Already in vault

        moveItem(item.itemInstanceId, item.itemHash, targetId, isVault);
        // onClose(); // Keep open to see change? Or close? User said "Optimistic UI", implies seeing it happen. Maybe keep open.
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
                                    <ElementIcon damageTypeHash={damageTypeHash} size={16} className={headerStyles.elementIcon} />
                                    <div className={headerStyles.power}>{power}</div>
                                </div>
                            </div>
                        </div>

                        {/* CONTENT (Custom Tailwind for internal layout to fit DIM shell) */}
                        <div className="p-2 space-y-4 overflow-y-auto max-h-[60vh] bg-[#111] text-[#eee]">

                            {/* MOVE LOCATIONS (Top Priority for "Click-to-Move") */}
                            <div className="flex flex-wrap gap-2 pb-2 border-b border-white/10">
                                {/* Characters */}
                                {characters.map((char: any) => {
                                    const isCurrent = itemOwner === char.characterId;
                                    const classType = char.classType;
                                    const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
                                    const className = classNames[classType] || 'Guardian';

                                    return (
                                        <button
                                            key={char.characterId}
                                            onClick={() => handleMove(char.characterId, false)}
                                            disabled={isCurrent}
                                            className={clsx(
                                                "px-3 py-1 text-xs font-bold uppercase tracking-wide rounded border transition-colors flex flex-col items-center",
                                                isCurrent
                                                    ? "bg-white/10 border-white/20 text-gray-500 cursor-default"
                                                    : "bg-[#222] border-white/20 hover:bg-[#333] hover:border-white/40 text-gray-300"
                                            )}
                                        >
                                            {isCurrent ? "Equipped" : `Transfer to ${className}`}
                                        </button>
                                    );
                                })}

                                {/* Vault */}
                                <button
                                    onClick={() => handleMove('vault', true)}
                                    disabled={itemOwner === 'vault'}
                                    className={clsx(
                                        "px-3 py-1 text-xs font-bold uppercase tracking-wide rounded border transition-colors ml-auto",
                                        itemOwner === 'vault'
                                            ? "bg-white/10 border-white/20 text-gray-500 cursor-default"
                                            : "bg-[#222] border-white/20 hover:bg-[#333] hover:border-white/40 text-gray-300"
                                    )}
                                >
                                    {itemOwner === 'vault' ? "In Vault" : "Store in Vault"}
                                </button>
                            </div>

                            {/* TABS Placeholder */}
                            <div className="flex border-b border-white/10 pb-0">
                                <button className="px-4 py-2 text-sm font-bold border-b-2 border-orange-500 text-white">Overview</button>
                                <button className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-gray-200">Triage</button>
                            </div>

                            {/* TAGS / NOTES (Quick Action) */}
                            <div className="bg-[#111] border border-white/10 rounded p-2 flex items-center gap-2 text-gray-400 hover:text-white cursor-pointer transition-colors">
                                <RefreshCw size={14} /> <span>Add notes</span>
                            </div>

                            {/* STATS - Only show stats with actual values */}
                            <div className="p-2 rounded">
                                {calculatedStats.filter(stat => stat.displayValue > 0).length > 0 ? calculatedStats.filter(stat => stat.displayValue > 0).map(stat => (
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

                            {/* SOCKETS GRID - Reorganized to match DIM layout */}
                            <div className="space-y-3">
                                {/* Row A: Perks (main perks first) */}
                                {sockets.perks.length > 0 && (
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
                                )}

                                {/* Row B: Mods */}
                                {sockets.mods.length > 0 && (
                                    <div className="flex gap-2 pt-2 border-t border-white/10">
                                        {sockets.mods.map(socket => (
                                            <ItemSocket key={socket.socketIndex} plugDef={socket.plugDef} categoryHash={socket.categoryHash} isActive={socket.isEnabled} />
                                        ))}
                                    </div>
                                )}

                                {/* Row C: Intrinsic Frame (at bottom like DIM) */}
                                {sockets.intrinsic && (
                                    <div className="flex items-start justify-between gap-2 pt-2 border-t border-white/10">
                                        {/* Intrinsic Info */}
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 shrink-0">
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

                                        {/* Actions Box: Ornament & Catalyst */}
                                        {(isExotic || sockets.ornament) && (
                                            <div className="flex gap-2 shrink-0">
                                                {/* Ornament Box */}
                                                <div className="flex flex-col items-center gap-1 group">
                                                    <div className="w-10 h-10 border-2 border-white/10 bg-black/50 rounded flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-white/40 transition-colors">
                                                        {sockets.ornament ? (
                                                            <BungieImage
                                                                src={sockets.ornament.plugDef.displayProperties.icon}
                                                                className="w-full h-full object-cover"
                                                                title={sockets.ornament.plugDef.displayProperties.name}
                                                            />
                                                        ) : (
                                                            <div className="text-white/20 text-[8px] uppercase font-bold select-none">Base</div>
                                                        )}
                                                    </div>
                                                    <div className="text-[8px] text-gray-500 uppercase tracking-widest group-hover:text-gray-300 transition-colors">Orn</div>
                                                </div>

                                                {/* Catalyst Box (Exotic Only) */}
                                                {isExotic && (
                                                    <div className="flex flex-col items-center gap-1 group">
                                                        <div className={clsx(
                                                            "w-10 h-10 border-2 rounded flex items-center justify-center overflow-hidden relative transition-colors",
                                                            sockets.catalyst?.state === 'active'
                                                                ? "border-white/40 bg-black/50 hover:border-white/80"
                                                                : "border-[#e2bf36] bg-[#e2bf36]/5" // Golden Box styling
                                                        )}
                                                            title={sockets.catalyst?.state === 'active'
                                                                ? sockets.catalyst.socket?.plugDef.displayProperties.name
                                                                : "Catalyst Missing"
                                                            }
                                                        >
                                                            {sockets.catalyst?.state === 'active' && sockets.catalyst.socket ? (
                                                                <BungieImage
                                                                    src={sockets.catalyst.socket.plugDef.displayProperties.icon}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <Diamond className="text-[#e2bf36]" size={18} strokeWidth={1.5} />
                                                            )}
                                                        </div>
                                                        <div className={clsx(
                                                            "text-[8px] uppercase tracking-widest transition-colors",
                                                            sockets.catalyst?.state === 'active' ? "text-gray-500 group-hover:text-gray-300" : "text-[#e2bf36]"
                                                        )}>Cat</div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* FOOTER: Weapon Mods & Cosmetics */}
                            {(sockets.weaponMods.length > 0 || sockets.cosmetics.length > 0) && (
                                <div className="border-t border-white/10 pt-4 mt-2">
                                    <div className="flex flex-wrap justify-center gap-2">
                                        {/* Weapon Mods (Specs) */}
                                        {sockets.weaponMods.map(socket => (
                                            <div key={socket.socketIndex} className="scale-90">
                                                <ItemSocket
                                                    plugDef={socket.plugDef}
                                                    categoryHash={socket.categoryHash}
                                                    isActive={socket.isEnabled}
                                                />
                                            </div>
                                        ))}
                                        {/* Shaders */}
                                        {sockets.cosmetics.map(socket => (
                                            <div key={socket.socketIndex} className="scale-90">
                                                <ItemSocket
                                                    plugDef={socket.plugDef}
                                                    categoryHash={socket.categoryHash}
                                                    isActive={socket.isEnabled}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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
