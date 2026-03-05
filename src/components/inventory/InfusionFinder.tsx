import React, { useMemo } from 'react';
import { X, ArrowUp, Zap } from 'lucide-react';
import { findInfusionCandidates, InfusionCandidate } from '../../lib/destiny/infusionFinder';
import { useInventoryStore } from '../../store/useInventoryStore';
import { BungieImage } from '../ui/BungieImage';
import { RARITY_COLORS, MASTERWORK_GOLD } from '../../data/constants';

interface InfusionFinderProps {
    /** The item we want to infuse (the target that will gain power). */
    item: any;
    definition: any;
    definitions: Record<string, any>;
    onClose: () => void;
}

const CLASS_NAMES = ['Titan', 'Hunter', 'Warlock'];

export const InfusionFinder: React.FC<InfusionFinderProps> = ({
    item,
    definition,
    definitions,
    onClose,
}) => {
    const allItems = useInventoryStore((s) => s.items);
    const characters = useInventoryStore((s) => s.characters);
    const moveItem = useInventoryStore((s) => s.moveItem);

    const targetPower = item.instanceData?.primaryStat?.value || 0;

    const candidates = useMemo(
        () => findInfusionCandidates(item, definition, allItems, definitions),
        [item, definition, allItems, definitions],
    );

    const getOwnerLabel = (owner: string) => {
        if (owner === 'vault') return 'Vault';
        const char = characters[owner];
        if (!char) return owner;
        return CLASS_NAMES[char.classType] || 'Unknown';
    };

    /**
     * Transfer the fuel item to the same location as the target item
     * so the player can perform the actual infusion in-game.
     */
    const handleBringFuel = async (candidate: InfusionCandidate) => {
        const fuelItem = candidate.item;
        const targetOwner = item.owner;

        // If fuel is already at the same location, nothing to do
        if (fuelItem.owner === targetOwner) return;

        const isVault = targetOwner === 'vault';
        await moveItem(fuelItem.itemInstanceId, fuelItem.itemHash, targetOwner, isVault);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />

            {/* Panel */}
            <div className="relative z-10 bg-[#111] border border-white/10 rounded-lg shadow-2xl w-[420px] max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <Zap size={18} className="text-[#f5dc56]" />
                        <div>
                            <h2 className="text-sm font-bold text-white">Infusion Finder</h2>
                            <p className="text-xs text-gray-400">
                                {definition?.displayProperties?.name} — {targetPower} Power
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>

                {/* Candidate List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {candidates.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            No higher-power items found in this slot.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {candidates.map((c) => {
                                const tierType = c.definition?.inventory?.tierType || 0;
                                const borderColor = (c.item.state & 4) !== 0
                                    ? MASTERWORK_GOLD
                                    : (RARITY_COLORS[tierType] || RARITY_COLORS[0]);
                                const isLocked = (c.item.state & 1) !== 0;
                                const isSameLocation = c.item.owner === item.owner;

                                return (
                                    <div
                                        key={c.item.itemInstanceId}
                                        className="flex items-center gap-3 p-2 rounded hover:bg-white/5 transition-colors group"
                                    >
                                        {/* Item icon */}
                                        <div
                                            className="w-12 h-12 flex-shrink-0 border relative"
                                            style={{ borderColor }}
                                        >
                                            <BungieImage
                                                src={c.definition?.displayProperties?.icon}
                                                className="w-full h-full"
                                            />
                                            {/* Power badge */}
                                            <div className="absolute bottom-0 right-0 bg-black/80 px-[2px] leading-[13px]">
                                                <span className="text-[9px] font-bold font-mono text-white">
                                                    {c.power}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-gray-200 truncate">
                                                {c.definition?.displayProperties?.name}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                                <span>{getOwnerLabel(c.owner)}</span>
                                                {isLocked && (
                                                    <span className="text-yellow-500/80" title="Locked">
                                                        Locked
                                                    </span>
                                                )}
                                                {c.isExotic && (
                                                    <span className="text-[#ceae33]">Exotic</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Power delta */}
                                        <div className="flex items-center gap-1 text-green-400 font-mono text-sm font-bold">
                                            <ArrowUp size={14} />
                                            +{c.powerDelta}
                                        </div>

                                        {/* Action: bring fuel to target location */}
                                        <button
                                            onClick={() => handleBringFuel(c)}
                                            disabled={isSameLocation}
                                            className="px-2 py-1 text-xs font-bold uppercase tracking-wide rounded border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-default transition-colors"
                                            title={
                                                isSameLocation
                                                    ? 'Already at same location'
                                                    : `Transfer to ${getOwnerLabel(item.owner)}`
                                            }
                                        >
                                            {isSameLocation ? 'Here' : 'Bring'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 text-xs text-gray-500 text-center">
                    {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} found
                    {candidates.length > 0 && ' — "Bring" transfers fuel to target location'}
                </div>
            </div>
        </div>
    );
};
