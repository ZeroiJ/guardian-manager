import React, { useEffect, useState } from 'react';
import init, { compare_stats } from '../wasm/guardian_engine';
import { X } from 'lucide-react';

interface CompareModalProps {
    itemA: any;
    itemB: any;
    definitions: any;
    onClose: () => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({ itemA, itemB, definitions, onClose }) => {
    const [deltas, setDeltas] = useState<Record<string, number> | null>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        // Initialize WASM
        init().then(() => {
            setReady(true);
        }).catch(err => {
            console.error("Failed to load WASM:", err);
        });
    }, []);

    useEffect(() => {
        if (!ready || !itemA || !itemB) return;

        // Extract stats into simple objects for Rust
        const extractStats = (item: any) => {
            const stats: Record<string, number> = {};
            // Item stats are keyed by Hash.
            // We need to map them to meaningful keys or just use Hashes.
            // For this demo, let's use the Stat Hashes directly as string keys.
            const itemStats = item.stats || definitions[item.itemHash]?.stats?.stats || {};
            
            Object.entries(itemStats).forEach(([hash, stat]: [string, any]) => {
                stats[hash] = stat.value || 0;
            });
            return stats;
        };

        const statsA = extractStats(itemA);
        const statsB = extractStats(itemB);

        try {
            const result = compare_stats(statsA, statsB);
            setDeltas(result as Record<string, number>);
        } catch (e) {
            console.error("Rust comparison failed:", e);
        }

    }, [ready, itemA, itemB, definitions]);

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
                        {/* Item A */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-lg font-bold text-gray-300">{defA?.displayProperties?.name}</div>
                            <img src={`https://www.bungie.net${defA?.displayProperties?.icon}`} className="w-16 h-16 rounded border border-white/20" />
                            <div className="text-sm text-gray-500">Base Power: {itemA.instanceData?.primaryStat?.value}</div>
                        </div>

                        {/* Deltas (Middle) */}
                        <div className="flex flex-col gap-2 py-4">
                            <div className="text-center text-xs text-gray-500 uppercase tracking-widest mb-2">Stat Deltas</div>
                            {deltas && Object.entries(deltas).map(([hash, val]) => {
                                const statDef = definitions[hash]; // Need stat definitions passed in or fetched
                                if (!statDef || val === 0) return null;
                                
                                const isPositive = val > 0;
                                const color = isPositive ? "text-green-400" : "text-red-400";
                                
                                return (
                                    <div key={hash} className="flex items-center justify-between text-sm bg-black/40 px-3 py-1 rounded">
                                        <span className="text-gray-400 truncate max-w-[100px]">{statDef.displayProperties.name}</span>
                                        <span className={`font-mono font-bold ${color}`}>
                                            {isPositive ? '+' : ''}{val}
                                        </span>
                                    </div>
                                );
                            })}
                            {!deltas && <div className="text-center text-gray-600 italic">Calculating...</div>}
                        </div>

                        {/* Item B */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-lg font-bold text-gray-300">{defB?.displayProperties?.name}</div>
                            <img src={`https://www.bungie.net${defB?.displayProperties?.icon}`} className="w-16 h-16 rounded border border-white/20" />
                            <div className="text-sm text-gray-500">Base Power: {itemB.instanceData?.primaryStat?.value}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
