/**
 * FashionPicker - Select shaders and ornaments for items
 * 
 * A drawer to select cosmetic overrides (shaders, ornaments) for loadout items
 */
import { useState, useMemo, useCallback } from 'react';
import { X, Check, Palette, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInventoryStore } from '@/store/useInventoryStore';
import { SocketCategoryHashes, PlugCategoryHashes } from '@/lib/destiny-constants';
import { createPortal } from 'react-dom';

interface FashionPickerProps {
    /** Current socket overrides for fashion (shader/ornament hashes) */
    socketOverrides: Record<number, number>;
    /** Bucket hash to know what type of item */
    bucketHash: number;
    onAccept: (overrides: Record<number, number>) => void;
    onClose: () => void;
}

type CosmeticOption = {
    hash: number;
    name: string;
    icon?: string;
    type: 'shader' | 'ornament';
};

export function FashionPicker({
    socketOverrides,
    bucketHash,
    onAccept,
    onClose,
}: FashionPickerProps) {
    const manifest = useInventoryStore((s) => s.manifest);
    const [selectedHash, setSelectedHash] = useState<number | null>(
        Object.values(socketOverrides)[0] || null
    );
    const [filterType, setFilterType] = useState<'all' | 'shader' | 'ornament'>('all');

    // Get available shaders and ornaments
    const cosmeticOptions = useMemo((): CosmeticOption[] => {
        const options: CosmeticOption[] = [];

        // Search manifest for shaders (itemType 41) and ornaments
        for (const [hash, def] of Object.entries(manifest)) {
            const hashNum = parseInt(hash);
            if (isNaN(hashNum)) continue;

            // Shaders
            if (def?.itemType === 41 || def?.itemTypeDisplayName?.toLowerCase()?.includes('shader')) {
                options.push({
                    hash: hashNum,
                    name: def.displayProperties?.name || 'Unknown Shader',
                    icon: def.displayProperties?.icon,
                    type: 'shader',
                });
            }

            // Check for ornaments in other ways
            if (def?.itemType === 2 && def?.plug?.plugCategoryIdentifier?.includes('ornament')) {
                options.push({
                    hash: hashNum,
                    name: def.displayProperties?.name || 'Unknown Ornament',
                    icon: def.displayProperties?.icon,
                    type: 'ornament',
                });
            }
        }

        // Sort alphabetically
        return options.sort((a, b) => a.name.localeCompare(b.name));
    }, [manifest]);

    // Filter options
    const filteredOptions = useMemo(() => {
        if (filterType === 'all') return cosmeticOptions;
        return cosmeticOptions.filter(opt => opt.type === filterType);
    }, [cosmeticOptions, filterType]);

    const handleSelect = useCallback((hash: number) => {
        setSelectedHash(hash);
    }, []);

    const handleAccept = useCallback(() => {
        if (selectedHash) {
            // Save as socket override at index 0 (shader socket)
            onAccept({ 0: selectedHash });
        }
        onClose();
    }, [selectedHash, onAccept, onClose]);

    return createPortal(
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div 
                className="w-[600px] max-h-[80vh] bg-[#0a0a0a] border border-white/15 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <Palette size={24} className="text-purple-400" />
                        <div>
                            <h2 className="text-lg font-bold font-rajdhani tracking-widest uppercase text-white">
                                Choose Fashion
                            </h2>
                            <p className="text-xs text-gray-500 font-mono">
                                Select shaders and ornaments
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex border-b border-white/10">
                    {(['all', 'shader', 'ornament'] as const).map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={cn(
                                'flex-1 py-2 text-[10px] font-bold uppercase tracking-widest font-rajdhani transition-colors',
                                filterType === type 
                                    ? 'text-white border-b-2 border-white bg-white/5' 
                                    : 'text-gray-500 hover:text-gray-300'
                            )}
                        >
                            {type === 'shader' ? 'Shaders' : type === 'ornament' ? 'Ornaments' : 'All'}
                        </button>
                    ))}
                </div>

                {/* Cosmetic Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {filteredOptions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Palette size={32} className="text-gray-600 mb-3" />
                            <p className="text-gray-500 font-mono text-sm">No cosmetics found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {/* Default/None option */}
                            <button
                                onClick={() => setSelectedHash(null)}
                                className={cn(
                                    'group p-2 rounded-sm border transition-all flex flex-col items-center gap-1',
                                    selectedHash === null 
                                        ? 'border-white bg-white/10' 
                                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                )}
                            >
                                <div className="w-10 h-10 rounded-sm border border-white/20 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                                    <X size={16} className="text-gray-500" />
                                </div>
                                <span className="text-[9px] font-bold font-rajdhani text-gray-500">
                                    Default
                                </span>
                            </button>

                            {filteredOptions.map((opt) => {
                                const isSelected = selectedHash === opt.hash;
                                
                                return (
                                    <button
                                        key={opt.hash}
                                        onClick={() => handleSelect(opt.hash)}
                                        className={cn(
                                            'group relative p-2 rounded-sm border transition-all flex flex-col items-center gap-1',
                                            isSelected 
                                                ? 'border-rarity-legendary bg-rarity-legendary/10' 
                                                : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                        )}
                                    >
                                        {isSelected && (
                                            <div className="absolute top-1 right-1 w-4 h-4 bg-rarity-legendary rounded-full flex items-center justify-center z-10">
                                                <Check size={10} className="text-white" />
                                            </div>
                                        )}
                                        
                                        <div className="w-10 h-10 rounded-sm overflow-hidden bg-black/50">
                                            {opt.icon ? (
                                                <img 
                                                    src={`https://www.bungie.net${opt.icon}`} 
                                                    alt={opt.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <Palette size={16} />
                                                </div>
                                            )}
                                        </div>
                                        
                                        <span className="text-[9px] font-bold font-rajdhani text-center truncate w-full">
                                            {opt.name}
                                        </span>

                                        {opt.type === 'ornament' && (
                                            <Sparkles size={10} className="text-amber-400 absolute top-1 left-1" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 flex justify-between items-center">
                    <p className="text-[10px] text-gray-600 font-mono">
                        {filteredOptions.length} options
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 font-rajdhani"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAccept}
                            className="px-6 py-2 rounded-sm text-xs font-bold uppercase tracking-widest bg-white text-black hover:bg-gray-200 font-rajdhani flex items-center gap-2"
                        >
                            <Check size={14} />
                            Apply
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default FashionPicker;
