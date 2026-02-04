import React, { useMemo } from 'react';
import { X, Lock, Unlock, Tag, RefreshCw, Maximize2 } from 'lucide-react';
import { BungieImage } from '../BungieImage';
import { getElementIcon } from '../destiny/ElementIcons';
import RecoilStat from '../destiny/RecoilStat';
import { calculateStats } from '../../lib/destiny/stat-manager';
import { categorizeSockets } from '../../lib/destiny/socket-helper';
import { ItemSocket } from '../item/ItemSocket';
import { useDefinitions } from '../../hooks/useDefinitions';
import { StatHashes } from '../../lib/destiny-constants';

interface ItemDetailModalProps {
    item: any;
    definition: any;
    definitions: Record<string, any>;
    characters: any[];
    allItems: any[];
    onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
    item,
    definition,
    definitions: initialDefinitions,
    characters,
    onClose
}) => {
    if (!item || !definition) return null;

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

    // DIM-Exact Colors
    const isExotic = tierType === 6;
    const isLegendary = tierType === 5;
    const isRare = tierType === 4;
    const isUncommon = tierType === 3;

    // Header Colors
    const headerBg = isExotic ? '#ceae33'
        : isLegendary ? '#522f65'
            : isRare ? '#5076a3'
                : isUncommon ? '#366f3c' : '#333';

    // Body Backgrounds (Dark variants)
    const bodyBg = isExotic ? '#161204'
        : isLegendary ? '#0e0811'
            : isRare ? '#0a0f15'
                : '#121212';

    const calculatedStats = useMemo(() => calculateStats(item, definition, definitions), [item, definition, definitions]);
    const sockets = useMemo(() => categorizeSockets(item, definition, definitions), [item, definition, definitions]);
    const ElementIconComponent = getElementIcon(damageTypeHash);

    // Class Icons
    const classIcons: Record<number, string> = { 0: 'T', 1: 'H', 2: 'W' };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            {/* DIM Layout: Flex Row (Body | Actions) */}
            <div className="flex flex-row shadow-2xl rounded overflow-hidden" onClick={e => e.stopPropagation()}>

                {/* --- BODY (320px) --- */}
                <div className="w-[320px] flex flex-col" style={{ backgroundColor: bodyBg }}>

                    {/* 1. HEADER */}
                    <div
                        className="p-3 text-white relative min-h-[60px] flex flex-col justify-center"
                        style={{ backgroundColor: headerBg }}
                    >
                        {/* Top: Name */}
                        <h1 className="text-xl font-bold uppercase leading-tight drop-shadow-md pr-6">
                            {definition.displayProperties.name}
                        </h1>

                        {/* Bottom: Subtitle Row */}
                        <div className="flex items-center justify-between mt-1 text-sm font-medium opacity-90">
                            {/* Type | Ammo | Breaker */}
                            <div className="flex items-center gap-2">
                                <span>{itemTypeDisplayName}</span>
                                {definition.equippingBlock?.ammoType === 1 && <span className="text-white">Primary</span>}
                                {definition.equippingBlock?.ammoType === 2 && <span className="text-green-400">Special</span>}
                                {definition.equippingBlock?.ammoType === 3 && <span className="text-purple-400">Heavy</span>}
                            </div>

                            {/* Power | Element */}
                            <div className="flex items-center gap-1">
                                {power && <span className="text-lg font-bold bg-black/20 px-1 rounded">{power}</span>}
                                {ElementIconComponent && <ElementIconComponent size={16} />}
                            </div>
                        </div>
                    </div>

                    {/* 2. CONTENT */}
                    <div className="p-2 space-y-4 overflow-y-auto max-h-[80vh] scrollbar-thin scrollbar-thumb-white/10">

                        {/* TABS (Placeholder) */}
                        <div className="flex border-b border-white/10 pb-0">
                            <button className="px-4 py-2 text-sm font-bold border-b-2 border-orange-500 text-white">Overview</button>
                            <button className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-gray-200">Triage</button>
                        </div>

                        {/* TAGS / NOTES (Quick Action) */}
                        <div className="bg-[#111] border border-white/10 rounded p-2 flex items-center gap-2 text-gray-400 hover:text-white cursor-pointer transition-colors">
                            <RefreshCw size={14} /> <span>Add notes</span>
                        </div>

                        {/* STATS */}
                        <div className="bg-[#111] p-2 rounded">
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

                {/* --- SIDEBAR ACTIONS (Right Side) --- */}
                <div className="w-[48px] bg-[#090909] flex flex-col items-center py-2 gap-2 border-l border-white/10">
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
    );
};
