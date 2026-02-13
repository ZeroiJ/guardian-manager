import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { compareStats, StatDelta } from '@/lib/inventory/statMath';

interface CompareModalProps {
    itemA: any;
    itemB: any;
    definitions: any;
    onClose: () => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({ itemA, itemB, definitions, onClose }) => {
    const [deltas, setDeltas] = useState<StatDelta[]>([]);

    useEffect(() => {
        if (!itemA || !itemB) return;
        const results = compareStats(itemA, itemB, definitions);
        setDeltas(results);
    }, [itemA, itemB, definitions]);

    if (!itemA || !itemB) return null;

    const defA = definitions[itemA.itemHash];
    const defB = definitions[itemB.itemHash];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-lg w-full max-w-2xl flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
                    <h2 className="text-xl font-bold text-white">Compare Items</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-3 gap-4">
                        {/* Item A (Baseline) */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-lg font-bold text-gray-300 text-center">{defA?.displayProperties?.name}</div>
                            <img src={`https://www.bungie.net${defA?.displayProperties?.icon}`} className="w-16 h-16 rounded border border-white/20" />
                            <div className="text-sm text-gray-500">Power: {itemA.instanceData?.primaryStat?.value}</div>
                        </div>

                        {/* Deltas (Middle) */}
                        <div className="flex flex-col gap-2 py-4">
                            <div className="text-center text-xs text-gray-500 uppercase tracking-widest mb-2">Stat Differences</div>
                            {deltas.map((stat) => {
                                const statDef = definitions[stat.statHash];
                                if (!statDef || stat.delta === 0) return null;
                                
                                const isPositive = stat.delta > 0;
                                const color = isPositive ? "text-green-400" : "text-red-400";
                                
                                return (
                                    <div key={stat.statHash} className="flex items-center justify-between text-sm bg-black/40 px-3 py-1 rounded">
                                        <span className="text-gray-400 truncate max-w-[100px]">{statDef.displayProperties.name}</span>
                                        <span className={`font-mono font-bold ${color}`}>
                                            {isPositive ? '+' : ''}{stat.delta}
                                        </span>
                                    </div>
                                );
                            })}
                            {deltas.every(d => d.delta === 0) && <div className="text-center text-gray-600 italic">Identical Stats</div>}
                        </div>

                        {/* Item B (Target) */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-lg font-bold text-gray-300 text-center">{defB?.displayProperties?.name}</div>
                            <img src={`https://www.bungie.net${defB?.displayProperties?.icon}`} className="w-16 h-16 rounded border border-white/20" />
                            <div className="text-sm text-gray-500">Power: {itemB.instanceData?.primaryStat?.value}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
