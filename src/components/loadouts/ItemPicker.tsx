/**
 * ItemPicker - Search and select inventory items modal
 * 
 * Reuses existing itemFilter.ts for search functionality.
 * Used to add items to loadout slots.
 */
import { useState, useMemo, useCallback } from 'react';
import { Search, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GuardianItem } from '@/services/profile/types';
import { filterItems } from '@/lib/search/itemFilter';
import { useInventoryStore } from '@/store/useInventoryStore';
import { CLASS_NAMES } from '@/store/loadoutStore';
import { createPortal } from 'react-dom';

interface ItemPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onItemSelected: (item: GuardianItem) => void;
    /** Optional filter to limit item types (e.g., only armor, only weapons) */
    filter?: (item: GuardianItem) => boolean;
    /** Prompt shown at top of picker */
    prompt?: string;
    /** Only show items owned by this character (or 'vault') */
    ownerId?: string;
}

const RARITY_COLORS: Record<number, string> = {
    6: 'border-rarity-exotic bg-rarity-exotic/10',  // Exotic
    5: 'border-rarity-legendary bg-rarity-legendary/10', // Legendary
    4: 'border-rarity-rare bg-rarity-rare/10',     // Rare
    2: 'border-rarity-common bg-rarity-common/10',  // Common
};

export function ItemPicker({
    isOpen,
    onClose,
    onItemSelected,
    filter,
    prompt = 'Select an item',
    ownerId,
}: ItemPickerProps) {
    const [query, setQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    
    const items = useInventoryStore((s) => s.items) ?? [];
    const manifest = useInventoryStore((s) => s.manifest) ?? {};
    const characters = useInventoryStore((s) => s.characters) ?? {};

    // Filter items by owner and optional filter function
    const filteredItems = useMemo(() => {
        let result = items;
        
        // Filter by owner
        if (ownerId) {
            result = result.filter((item) => item.owner === ownerId);
        }
        
        // Apply custom filter
        if (filter) {
            result = result.filter(filter);
        }
        
        return result;
    }, [items, ownerId, filter]);

    // Apply search query using existing itemFilter
    const searchResults = useMemo(() => {
        if (!query.trim()) return filteredItems.slice(0, 50); // Limit initial results
        
        // Get dupe instance IDs for is:dupe filter
        const dupeInstanceIds = new Set<string>();
        const hashCounts = new Map<number, number>();
        for (const item of filteredItems) {
            const count = hashCounts.get(item.itemHash) || 0;
            hashCounts.set(item.itemHash, count + 1);
        }
        for (const item of filteredItems) {
            if ((hashCounts.get(item.itemHash) || 0) > 1) {
                dupeInstanceIds.add(item.itemInstanceId!);
            }
        }
        
        return filterItems(filteredItems, query, manifest, dupeInstanceIds).slice(0, 100);
    }, [filteredItems, query, manifest]);

    const handleSelect = useCallback((item: GuardianItem) => {
        onItemSelected(item);
        onClose();
    }, [onItemSelected, onClose]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onKeyDown={handleKeyDown}
        >
            <div 
                className="w-[700px] max-h-[80vh] bg-[#0a0a0a] border border-white/15 rounded-lg shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <div>
                        <h2 className="text-lg font-bold font-rajdhani tracking-widest uppercase text-white">
                            {prompt}
                        </h2>
                        <p className="text-xs text-gray-500 font-mono mt-1">
                            {searchResults.length} items
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-sm transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-4 border-b border-white/10">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search weapons, armor, perks... (is:exotic, stat:res:>50)"
                            className="w-full bg-void-surface border border-white/15 rounded-sm pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 font-mono"
                            autoFocus
                        />
                        {query && (
                            <button
                                onClick={() => setQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-600 font-mono">
                        <span>Filters:</span>
                        <span className="px-1.5 py-0.5 bg-white/5 rounded">is:exotic</span>
                        <span className="px-1.5 py-0.5 bg-white/5 rounded">is:legendary</span>
                        <span className="px-1.5 py-0.5 bg-white/5 rounded">stat:res:&gt;50</span>
                        <span className="px-1.5 py-0.5 bg-white/5 rounded">perk:firefly</span>
                    </div>
                </div>

                {/* Item Grid */}
                <div className="flex-1 overflow-y-auto p-4">
                    {searchResults.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <p className="text-gray-500 font-mono text-sm">No items match your search</p>
                            <p className="text-gray-600 font-mono text-xs mt-2">Try different keywords or filters</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-4 gap-2">
                            {searchResults.map((item) => {
                                const def = manifest[item.itemHash];
                                const icon = def?.displayProperties?.icon;
                                const name = def?.displayProperties?.name || 'Unknown';
                                const type = def?.itemTypeDisplayName || '';
                                const rarity = def?.inventory?.tierType;
                                const power = item.instanceData?.primaryStat?.value;
                                const damageType = item.instanceData?.damageType;
                                
                                // Get owner name (character or vault)
                                const isVault = item.owner === 'vault';
                                const ownerLabel = isVault ? 'Vault' : (characters[item.owner]?.classType !== undefined ? CLASS_NAMES[characters[item.owner].classType] : 'Unknown');
                                
                                return (
                                    <button
                                        key={item.itemInstanceId || `${item.itemHash}-${Math.random()}`}
                                        onClick={() => handleSelect(item)}
                                        className={cn(
                                            'group relative p-2 rounded-sm border bg-void-surface transition-all',
                                            'hover:border-white/30 hover:bg-white/5',
                                            rarity ? RARITY_COLORS[rarity] : 'border-white/10'
                                        )}
                                    >
                                        {/* Icon */}
                                        <div className="w-12 h-12 mx-auto rounded overflow-hidden bg-black/50">
                                            {icon ? (
                                                <img 
                                                    src={`https://www.bungie.net${icon}`} 
                                                    alt={name}
                                                    className="w-full h-full object-cover"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    ?
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Name */}
                                        <div className="mt-1.5 text-[10px] font-bold text-gray-300 truncate font-rajdhani uppercase">
                                            {name}
                                        </div>
                                        
                                        {/* Type */}
                                        <div className="text-[8px] text-gray-600 truncate font-mono">
                                            {type}
                                        </div>
                                        
                                        {/* Power badge */}
                                        {power && power > 0 && (
                                            <span className="absolute top-1 right-1 px-1 py-px text-[7px] font-mono font-bold text-white/80 bg-black/80 border border-white/10 rounded-sm">
                                                {power}
                                            </span>
                                        )}
                                        
                                        {/* Damage type indicator */}
                                        {damageType && damageType !== 1 && (
                                            <div 
                                                className={cn(
                                                    'absolute top-1 left-1 w-2 h-2 rounded-full',
                                                    damageType === 2 && 'bg-arc',
                                                    damageType === 3 && 'bg-solar',
                                                    damageType === 4 && 'bg-void',
                                                    damageType === 6 && 'bg-stasis',
                                                    damageType === 7 && 'bg-strand',
                                                )}
                                            />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-white/10 text-[10px] text-gray-600 font-mono text-center">
                    Press ESC to close · Click item to select
                </div>
            </div>
        </div>,
        document.body
    );
}

export default ItemPicker;
