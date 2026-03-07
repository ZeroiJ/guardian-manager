/**
 * Vendors Page — Browse vendor inventories, bounties, and engram focusing.
 *
 * Architecture:
 * - Fetches all vendors on character selection via vendorStore
 * - Groups vendors using Bungie's DestinyVendorGroupDefinition
 * - Shows vendor cards with sale items organized by display categories
 * - Collapsible sections, refresh countdown timers, cost badges
 * - Character selector tabs to switch between characters
 *
 * Lazy-loaded via React.lazy() in App.tsx.
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Navigation } from '@/components/Navigation';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useVendorStore } from '@/store/vendorStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { BungieImage, bungieNetPath } from '@/components/ui/BungieImage';
import { Loader2, ChevronDown, ChevronRight, Clock, Eye, EyeOff, RefreshCw } from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Vendors to hide (Bungie internal/deprecated):
 * - 2190858386 = Ada-1 (Deprecated/Subvendor)
 * - Kiosk vendors with no useful items
 */
const HIDDEN_VENDORS = new Set<number>([
    // Add vendor hashes to hide if needed
]);

/** Silver item hash — used for "hide silver items" filter */
const SILVER_HASH = 3147280338;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Format a refresh date as a countdown string.
 * Returns null if the date is in the past or invalid.
 */
function formatCountdown(refreshDate: string | undefined): string | null {
    if (!refreshDate) return null;
    const target = new Date(refreshDate).getTime();
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
        const days = Math.floor(hours / 24);
        return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

/**
 * Sale status flags from Bungie.
 * 0 = Available, 4 = Not available, 8 = Already owned, etc.
 */
function getSaleStatusLabel(status: number): { label: string; color: string } | null {
    if (status === 0) return null; // Available — no badge needed
    if (status & 8) return { label: 'Owned', color: 'text-green-400' };
    if (status & 4) return { label: 'Unavailable', color: 'text-gray-500' };
    if (status & 2) return { label: 'Already Held', color: 'text-yellow-400' };
    return null;
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

/** Character selector tabs */
const CharacterTabs: React.FC<{
    characters: Record<string, any>;
    selectedId: string | null;
    onSelect: (id: string) => void;
}> = ({ characters, selectedId, onSelect }) => {
    const charIds = Object.keys(characters);
    const classNames = ['Titan', 'Hunter', 'Warlock'];

    return (
        <div className="flex gap-1 bg-void-surface/50 border border-void-border rounded-sm p-1">
            {charIds.map(id => {
                const char = characters[id];
                const className = classNames[char?.classType] || 'Unknown';
                const isActive = id === selectedId;
                return (
                    <button
                        key={id}
                        onClick={() => onSelect(id)}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors rounded-sm ${
                            isActive
                                ? 'bg-white/10 text-white border border-white/10'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {className}
                        <span className="ml-2 text-gray-500 text-[10px] font-mono">
                            {char?.light || ''}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

/** Cost badge — shows item cost with icon */
const CostBadge: React.FC<{
    cost: { itemHash: number; quantity: number };
    definitions: Record<string, any>;
}> = ({ cost, definitions }) => {
    const def = definitions[cost.itemHash];
    const icon = def?.displayProperties?.icon;
    const name = def?.displayProperties?.name || `#${cost.itemHash}`;

    return (
        <div className="flex items-center gap-1 text-[10px] text-gray-400" title={name}>
            {icon && (
                <BungieImage src={icon} className="w-3 h-3 rounded-sm" />
            )}
            <span className="font-mono tabular-nums">{cost.quantity.toLocaleString()}</span>
        </div>
    );
};

/** Class badge colors and labels */
const CLASS_BADGE: Record<number, { label: string; color: string; bg: string }> = {
    0: { label: 'Titan', color: 'text-red-300', bg: 'bg-red-500/30' },
    1: { label: 'Hunter', color: 'text-cyan-300', bg: 'bg-cyan-500/30' },
    2: { label: 'Warlock', color: 'text-amber-300', bg: 'bg-amber-500/30' },
};

/**
 * Check if an item is class-locked armor (classType 0-2).
 * Returns the classType if armor, null if universal or not armor.
 */
function getItemClassType(def: any): number | null {
    const classType = def?.classType;
    if (classType != null && classType >= 0 && classType <= 2) return classType;
    return null;
}

/** Single vendor sale item tile */
const VendorItemTile: React.FC<{
    sale: { vendorItemIndex: number; itemHash: number; costs: Array<{ itemHash: number; quantity: number }>; saleStatus: number };
    definitions: Record<string, any>;
    costDefinitions: Record<string, any>;
    showClassBadge?: boolean;
}> = ({ sale, definitions, costDefinitions, showClassBadge }) => {
    const def = definitions[sale.itemHash];
    if (!def) return null;

    const icon = def.displayProperties?.icon;
    const name = def.displayProperties?.name || 'Unknown';
    const tierType = def.inventory?.tierType || 0;
    const statusBadge = getSaleStatusLabel(sale.saleStatus);
    const itemClassType = getItemClassType(def);
    const classBadge = showClassBadge && itemClassType != null ? CLASS_BADGE[itemClassType] : null;

    const rarityColors: Record<number, string> = {
        6: '#ceae33',  // exotic
        5: '#522f65',  // legendary
        4: '#5076a3',  // rare
        3: '#366f42',  // uncommon
    };
    const borderColor = rarityColors[tierType] || '#333';

    return (
        <div className="group relative flex flex-col items-center gap-1 w-[72px]">
            <div
                className="relative w-[56px] h-[56px] rounded border overflow-hidden bg-black/30 shrink-0"
                style={{ borderColor: `${borderColor}60` }}
                title={name}
            >
                {icon && (
                    <BungieImage src={icon} className="w-full h-full" />
                )}
                {/* Owned badge */}
                {statusBadge && (
                    <div className={`absolute top-0 left-0 right-0 text-center text-[8px] font-bold uppercase py-px bg-black/70 ${statusBadge.color}`}>
                        {statusBadge.label}
                    </div>
                )}
                {/* Class badge — bottom-right corner */}
                {classBadge && (
                    <div className={`absolute bottom-0 right-0 text-[7px] font-bold uppercase px-1 py-px ${classBadge.bg} ${classBadge.color} rounded-tl`}>
                        {classBadge.label[0]}
                    </div>
                )}
            </div>
            {/* Item name */}
            <div className="text-[10px] text-gray-400 text-center leading-tight line-clamp-2 w-full">
                {name}
            </div>
            {/* Costs */}
            {sale.costs.length > 0 && (
                <div className="flex flex-wrap gap-1 justify-center">
                    {sale.costs.map((cost, i) => (
                        <CostBadge key={i} cost={cost} definitions={costDefinitions} />
                    ))}
                </div>
            )}
        </div>
    );
};

/** A vendor card with collapsible categories */
const VendorCard: React.FC<{
    vendorHash: number;
    vendorDef: any;
    vendor: import('@/store/vendorStore').VendorData;
    itemDefinitions: Record<string, any>;
    costDefinitions: Record<string, any>;
    characterClassType: number;
}> = ({ vendorHash, vendorDef, vendor, itemDefinitions, costDefinitions, characterClassType }) => {
    const [collapsed, setCollapsed] = useState(false);

    if (!vendorDef) return null;

    const name = vendorDef.displayProperties?.name || `Vendor ${vendorHash}`;
    const subtitle = vendorDef.displayProperties?.subtitle || '';
    const icon = vendorDef.displayProperties?.smallTransparentIcon || vendorDef.displayProperties?.icon;
    const largeIcon = vendorDef.displayProperties?.largeTransparentIcon || vendorDef.displayProperties?.mapIcon;

    // Refresh countdown
    const nextRefresh = (vendor.component as any)?.nextRefreshDate;
    const countdown = formatCountdown(nextRefresh);

    // Get display categories from vendorDef
    const displayCategories = vendorDef.displayCategories || [];
    const saleItems = Object.values(vendor.sales);

    // Organize sales by category, filtering by character class
    const { categorizedSales, hasMultiClassItems } = useMemo(() => {
        /**
         * Filter a sale item by character class.
         * - Universal items (classType 3 or undefined) always pass.
         * - Class-locked items pass only if they match the selected character's class.
         */
        const isVisibleForClass = (sale: typeof saleItems[0]) => {
            const def = itemDefinitions[sale.itemHash];
            const itemClass = def?.classType;
            // classType: 0=Titan, 1=Hunter, 2=Warlock, 3=Universal/Unknown
            if (itemClass == null || itemClass === 3) return true;
            return itemClass === characterClassType;
        };

        // Track if this vendor sells items for multiple classes (for badge display)
        let seenClasses = new Set<number>();
        for (const sale of saleItems) {
            const def = itemDefinitions[sale.itemHash];
            const ct = def?.classType;
            if (ct != null && ct >= 0 && ct <= 2) seenClasses.add(ct);
        }
        const hasMultiClassItems = seenClasses.size > 1;

        if (vendor.categories.length === 0 && saleItems.length > 0) {
            const filtered = saleItems.filter(isVisibleForClass);
            return {
                categorizedSales: filtered.length > 0 ? [{ name: 'Items', items: filtered }] : [],
                hasMultiClassItems,
            };
        }

        const categories: Array<{ name: string; items: typeof saleItems }> = [];
        for (const cat of vendor.categories) {
            const catDef = displayCategories[cat.displayCategoryIndex];
            const catName = catDef?.displayProperties?.name || `Category ${cat.displayCategoryIndex}`;
            const catItems = (cat.itemIndexes || [])
                .map((idx: number) => vendor.sales[String(idx)])
                .filter(Boolean)
                .filter(isVisibleForClass);

            if (catItems.length > 0) {
                categories.push({ name: catName, items: catItems });
            }
        }

        // If categories produced nothing, show filtered items
        if (categories.length === 0) {
            const filtered = saleItems.filter(isVisibleForClass);
            if (filtered.length > 0) {
                categories.push({ name: 'Items', items: filtered });
            }
        }

        return { categorizedSales: categories, hasMultiClassItems };
    }, [vendor.categories, vendor.sales, displayCategories, saleItems, characterClassType, itemDefinitions]);

    // Skip vendors with no visible items (after class filtering)
    const visibleItemCount = categorizedSales.reduce((sum, cat) => sum + cat.items.length, 0);
    if (visibleItemCount === 0) return null;

    return (
        <div className="bg-void-surface/40 border border-void-border rounded-sm overflow-hidden">
            {/* Vendor Header */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
            >
                {/* Vendor Icon */}
                {(icon || largeIcon) && (
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-black/30">
                        <BungieImage src={icon || largeIcon} className="w-full h-full object-cover" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{name}</div>
                    {subtitle && (
                        <div className="text-[10px] text-gray-500 truncate">{subtitle}</div>
                    )}
                </div>

                {/* Refresh timer */}
                {countdown && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
                        <Clock size={10} />
                        {countdown}
                    </div>
                )}

                {/* Item count */}
                <div className="text-[10px] text-gray-500 shrink-0">
                    {visibleItemCount} items
                </div>

                {/* Collapse chevron */}
                {collapsed ? <ChevronRight size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
            </button>

            {/* Vendor Items */}
            {!collapsed && (
                <div className="border-t border-void-border px-4 py-3 space-y-4">
                    {categorizedSales.map((category, ci) => (
                        <div key={ci}>
                            {categorizedSales.length > 1 && (
                                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">
                                    {category.name}
                                </div>
                            )}
                            <div className="flex flex-wrap gap-3">
                                {category.items.map((sale) => (
                                    <VendorItemTile
                                        key={sale.vendorItemIndex}
                                        sale={sale}
                                        definitions={itemDefinitions}
                                        costDefinitions={costDefinitions}
                                        showClassBadge={hasMultiClassItems}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Vendors() {
    const characters = useInventoryStore(s => s.characters);
    const profile = useInventoryStore(s => s.profile);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
    const [hideOwned, setHideOwned] = useState(false);
    const [hideSilver, setHideSilver] = useState(true);

    const { vendors, vendorHashes, loading, error, fetchVendors, lastFetched } = useVendorStore();

    // Select first character on load
    useEffect(() => {
        if (!selectedCharacterId && Object.keys(characters).length > 0) {
            setSelectedCharacterId(Object.keys(characters)[0]);
        }
    }, [characters, selectedCharacterId]);

    // Fetch vendors when character changes
    useEffect(() => {
        if (selectedCharacterId && profile) {
            fetchVendors(selectedCharacterId);
        }
    }, [selectedCharacterId, profile, fetchVendors]);

    // Collect all item hashes from vendor sales for definition lookup
    const allItemHashes = useMemo(() => {
        const hashes = new Set<number>();
        for (const vendor of Object.values(vendors)) {
            for (const sale of Object.values(vendor.sales)) {
                hashes.add(sale.itemHash);
                // Cost item hashes
                for (const cost of sale.costs) {
                    hashes.add(cost.itemHash);
                }
            }
        }
        return Array.from(hashes);
    }, [vendors]);

    // Collect all vendor hashes for vendor definitions
    const vendorDefHashes = useMemo(() => vendorHashes, [vendorHashes]);

    // Fetch item definitions
    const { definitions: itemDefs, loading: itemDefsLoading } = useDefinitions(
        'DestinyInventoryItemDefinition',
        allItemHashes,
    );

    // Fetch vendor definitions
    const { definitions: vendorDefs, loading: vendorDefsLoading } = useDefinitions(
        'DestinyVendorDefinition',
        vendorDefHashes,
    );

    // Fetch vendor group definitions for grouping
    const vendorGroupHashes = useMemo(() => {
        // Vendor groups come from the profile response
        const groups = profile?.vendorGroupDefinitions || [];
        return groups.map((g: any) => g?.vendorGroupHash).filter(Boolean);
    }, [profile]);

    const { definitions: vendorGroupDefs } = useDefinitions(
        'DestinyVendorGroupDefinition',
        vendorGroupHashes,
    );

    // Organize vendors into groups
    const vendorGroups = useMemo(() => {
        if (!selectedCharacterId || vendorHashes.length === 0) return [];

        // Group vendors by their vendorGroupDefinition
        // For now, create a simple list sorted by vendor name
        const grouped: Array<{ name: string; vendorHashes: number[] }> = [];
        const ungrouped: number[] = [];

        // Check if we have vendor group definitions from the profile
        const groupsFromProfile = profile?.vendorGroups?.data?.groups;
        if (groupsFromProfile && Array.isArray(groupsFromProfile)) {
            const groupMap = new Map<number, number[]>();
            for (const group of groupsFromProfile) {
                const existing = groupMap.get(group.vendorGroupHash) || [];
                existing.push(group.vendorHash);
                groupMap.set(group.vendorGroupHash, existing);
            }

            for (const [groupHash, vendorHashList] of groupMap) {
                const groupDef = vendorGroupDefs[groupHash] as any;
                const groupName = groupDef?.categoryName || `Group ${groupHash}`;
                // Filter to vendors we actually have data for
                const validHashes = vendorHashList.filter(h =>
                    vendorHashes.includes(h) && !HIDDEN_VENDORS.has(h)
                );
                if (validHashes.length > 0) {
                    grouped.push({ name: groupName, vendorHashes: validHashes });
                }
            }
        }

        // If no groups, put everything in one group
        if (grouped.length === 0) {
            const allValid = vendorHashes.filter(h => !HIDDEN_VENDORS.has(h));
            grouped.push({ name: 'Vendors', vendorHashes: allValid });
        }

        return grouped;
    }, [selectedCharacterId, vendorHashes, profile, vendorGroupDefs]);

    // Handle character switch
    const handleCharacterSelect = useCallback((charId: string) => {
        setSelectedCharacterId(charId);
    }, []);

    // Refresh
    const handleRefresh = useCallback(() => {
        if (selectedCharacterId) {
            fetchVendors(selectedCharacterId);
        }
    }, [selectedCharacterId, fetchVendors]);

    const isLoading = loading || itemDefsLoading || vendorDefsLoading;
    const hasData = vendorHashes.length > 0;

    return (
        <div className="min-h-screen bg-void-bg text-void-text">
            <Navigation />

            <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
                {/* Header Bar */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-lg font-bold text-white">Vendors</h1>
                        <p className="text-xs text-gray-500">
                            {lastFetched
                                ? `Updated ${new Date(lastFetched).toLocaleTimeString()}`
                                : 'Not yet loaded'}
                        </p>
                    </div>

                    {/* Character Tabs */}
                    {Object.keys(characters).length > 0 && (
                        <CharacterTabs
                            characters={characters}
                            selectedId={selectedCharacterId}
                            onSelect={handleCharacterSelect}
                        />
                    )}

                    {/* Controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setHideOwned(!hideOwned)}
                            className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors ${
                                hideOwned
                                    ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                                    : 'bg-white/[0.04] border-void-border text-gray-400 hover:text-white'
                            }`}
                            title="Toggle hiding owned items"
                        >
                            {hideOwned ? <EyeOff size={12} /> : <Eye size={12} />}
                            {hideOwned ? 'Hidden' : 'Owned'}
                        </button>

                        <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border border-void-border text-gray-400 hover:text-white bg-white/[0.04] transition-colors disabled:opacity-50"
                            title="Refresh vendor data"
                        >
                            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Error State */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-4 py-3 text-sm text-red-400">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {isLoading && !hasData && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <Loader2 size={32} className="animate-spin text-gray-500" />
                        <span className="text-sm text-gray-500">Loading vendors...</span>
                    </div>
                )}

                {/* No profile state */}
                {!profile && !loading && (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <span className="text-sm text-gray-500">
                            Log in and load your profile first to view vendors.
                        </span>
                    </div>
                )}

                {/* Vendor Groups */}
                {hasData && vendorGroups.map((group, gi) => (
                    <div key={gi} className="space-y-2">
                        {vendorGroups.length > 1 && (
                            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest pt-2">
                                {group.name}
                            </h2>
                        )}
                        {group.vendorHashes.map(vendorHash => {
                            const key = `${selectedCharacterId}_${vendorHash}`;
                            const vendor = vendors[key];
                            if (!vendor) return null;

                            const vendorDef = vendorDefs[vendorHash];
                            const charClassType = selectedCharacterId
                                ? characters[selectedCharacterId]?.classType ?? 3
                                : 3;

                            return (
                                <VendorCard
                                    key={vendorHash}
                                    vendorHash={vendorHash}
                                    vendorDef={vendorDef}
                                    vendor={vendor}
                                    itemDefinitions={itemDefs}
                                    costDefinitions={itemDefs}
                                    characterClassType={charClassType}
                                />
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
}
