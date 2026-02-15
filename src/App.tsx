import { useState, useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { StoreHeader } from '@/components/inventory/StoreHeader';
import { InventoryBucketLabel } from '@/components/inventory/InventoryBucketLabel';
import { StoreBucket } from '@/components/inventory/StoreBucket';
import { BUCKETS } from '@/data/constants';
import { VirtualVaultGrid } from '@/components/inventory/VirtualVaultGrid';
import { ItemDetailModal } from '@/components/inventory/ItemDetailModal';
import { ItemContextMenu } from '@/components/inventory/ItemContextMenu';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { useProfile } from '@/hooks/useProfile';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useDefinitions } from '@/hooks/useDefinitions';
import { filterItems } from '@/lib/search/itemFilter';
import { calculateMaxPower } from '@/lib/destiny/powerUtils';
import { CompareModal } from '@/components/CompareModal';

export default function App() {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any, definition: any } | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ item: any, definition: any, referenceElement: HTMLElement | null } | null>(null);

    // Use the new Zipper hook
    const { profile, loading: profileLoading, error: profileError, refresh } = useProfile();

    // Auto-refresh system (30s polling with visibility check)
    const { lastUpdated, isRefreshing, triggerRefresh } = useAutoRefresh({
        onRefresh: refresh,
        enabled: !profileLoading && !profileError,
    });

    // Extract hashes for manifest lookup
    // Include both item hashes AND plug hashes from sockets (perks, mods, etc.)
    const itemHashes = useMemo(() => {
        if (!profile?.items) return [];
        const hashes = new Set<number>();
        for (const item of profile.items) {
            hashes.add(item.itemHash);
            // Collect all plug hashes from sockets so we can resolve perk/mod definitions
            const sockets = item.sockets?.sockets;
            if (sockets) {
                for (const socket of sockets) {
                    if (socket.plugHash) {
                        hashes.add(socket.plugHash);
                    }
                }
            }
        }
        return Array.from(hashes);
    }, [profile?.items]);
    const { definitions: itemDefs, loading: itemDefsLoading } = useDefinitions('DestinyInventoryItemDefinition', itemHashes);

    // Fetch Stat Groups (Dependent on Item Definitions)
    const statGroupHashes = useMemo(() => {
        const hashes = new Set<number | string>();
        Object.values(itemDefs).forEach((def: any) => {
            if (def?.stats?.statGroupHash) {
                hashes.add(def.stats.statGroupHash);
            }
        });
        return Array.from(hashes);
    }, [itemDefs]);

    const { definitions: statGroupDefs, loading: statGroupsLoading } = useDefinitions('DestinyStatGroupDefinition', statGroupHashes);

    // Merge Definitions
    const definitions = useMemo(() => ({ ...itemDefs, ...statGroupDefs }), [itemDefs, statGroupDefs]);

    // Sync Manifest to Store for Headless Engine
    const setManifest = useInventoryStore(state => state.setManifest);
    const dupeInstanceIds = useInventoryStore(state => state.dupeInstanceIds);
    const compareSession = useInventoryStore(state => state.compareSession);
    const endCompare = useInventoryStore(state => state.endCompare);

    useEffect(() => {
        if (Object.keys(definitions).length > 0) {
            setManifest(definitions);
        }
    }, [definitions, setManifest]);

    // Compare: find all items matching the session filter
    const compareItems = useMemo(() => {
        if (!compareSession) return [];
        const allItems = profile?.items || [];
        return allItems.filter(item => {
            if (!item.itemInstanceId) return false;
            const def = definitions[item.itemHash];
            if (!def) return false;
            // Must be same bucket (e.g. Kinetic Weapons)
            const itemBucket = item.bucketHash || def?.inventory?.bucketTypeHash || 0;
            if (itemBucket !== compareSession.bucketHash) return false;
            // Name match (stripped of Adept/Timelost)
            const name = (def?.displayProperties?.name || '')
                .replace(/\s*\((Adept|Timelost|Harrowed)\)/gi, '')
                .trim()
                .toLowerCase();
            return name === compareSession.nameFilter;
        });
    }, [compareSession, profile?.items, definitions]);

    // Filter Items Logic
    const allItems = profile?.items || [];

    // Dropdown (Live Search)
    const dropdownItems = useMemo(() => {
        if (!searchQuery.trim()) return [];
        return filterItems(allItems, searchQuery, definitions, dupeInstanceIds).slice(0, 10);
    }, [allItems, searchQuery, definitions, dupeInstanceIds]);

    const loading = profileLoading || (itemHashes.length > 0 && (itemDefsLoading || statGroupsLoading));

    const handleContextMenu = (e: React.MouseEvent, item: any, definition: any) => {
        e.preventDefault();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            item,
            definition
        });
    };

    const handleItemClick = (item: any, definition: any, event: React.MouseEvent) => {
        setSelectedItem({ item, definition, referenceElement: event.currentTarget as HTMLElement });
        setIsSearchFocused(false);
    };

    if (loading) {
        return (
            <div className="h-screen bg-[#050505] text-white flex flex-col items-center justify-center font-mono space-y-4">
                <div className="w-12 h-12 border-4 border-t-transparent border-[#f5dc56] rounded-full animate-spin" />
                <div className="animate-pulse text-[#f5dc56]">INITIALIZING GUARDIAN NEXUS...</div>
                <div className="text-xs text-gray-500">Connecting to Neural Net (Cloudflare Worker)</div>
            </div>
        );
    }

    if (profileError) {
        // Check if it's an Auth Error
        const isAuthError = profileError.message.includes('Unauthorized') || profileError.message.includes('401');

        if (isAuthError) {
            return (
                <div className="h-screen bg-[#050505] flex flex-col items-center justify-center font-sans space-y-8 relative overflow-hidden">
                    {/* Background - Flat solid */}
                    <div className="absolute inset-0 bg-dim-bg" />

                    <div className="z-10 text-center space-y-6 max-w-lg px-6">
                        <div className="mb-8">
                            <div className="inline-block p-4 rounded-full bg-[#f5dc56]/10 border border-[#f5dc56]/20 mb-4">
                                <Search className="w-12 h-12 text-[#f5dc56]" />
                            </div>
                            <h1 className="text-5xl font-bold tracking-tighter text-white mb-2">
                                Guardian <span className="text-[#f5dc56]">Nexus</span>
                            </h1>
                            <p className="text-gray-400 text-lg">
                                The Advanced/AI Item Manager for Destiny 2
                            </p>
                        </div>

                        <div className="bg-dim-surface border border-dim-border rounded-xl p-8">
                            <p className="text-gray-300 mb-8 leading-relaxed">
                                Connect your Bungie account to manage inventory, optimize loadouts, and organize your vault with advanced tools.
                            </p>

                            <a
                                href="/api/auth/login"
                                className="block w-full py-4 px-6 bg-[#f5dc56] hover:bg-[#e6ce4b] text-black font-bold text-lg rounded-lg transition-colors"
                            >
                                Login with Bungie
                            </a>
                        </div>

                        <div className="text-xs text-gray-600 font-mono">
                            Secure OAuth 2.0 Connection • No Credentials Stored
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="h-screen bg-[#050505] text-red-500 flex flex-col items-center justify-center font-mono p-4">
                <div className="text-xl mb-4">CRITICAL SYSTEM FAILURE</div>
                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded max-w-md break-words">
                    {profileError.message}
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-8 px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors"
                >
                    REBOOT SYSTEM
                </button>
            </div>
        );
    }

    // Main Grid (Always Show All)
    const filteredItems = allItems;

    // Filter Items for Vault
    const vaultItems = filteredItems.filter(i => i.owner === 'vault');

    const characters = profile?.characters ? Object.values(profile.characters) : [];

    // Helper to get items for character
    const getItemsForCharacter = (charId: string) => {
        // We filter from the SEARCH results
        const charItems = filteredItems.filter(i => i.owner === charId);

        // Find Postmaster items (Standard bucket check)
        // Need to check definition for bucket hash
        const postmasterItems = charItems.filter(i => {
            const def = definitions[i.itemHash];
            return def?.inventory?.bucketTypeHash === 215593132; // BUCKETS.Postmaster
        });

        const inventoryItems = charItems.filter(i => {
            const def = definitions[i.itemHash];
            // Exclude postmaster
            return def?.inventory?.bucketTypeHash !== 215593132;
        });

        // Calculate Max Power
        // We need ALL items owned by this class (Inventory + Vault + Equipped)
        const charClassType = profile?.characters[charId]?.classType;
        const allUserItems = profile?.items || [];
        const maxPower = calculateMaxPower(allUserItems, definitions, charClassType);

        return {
            equipment: inventoryItems.filter(i => i.instanceData?.isEquipped),
            inventory: inventoryItems.filter(i => !i.instanceData?.isEquipped),
            postmaster: postmasterItems,
            maxPower
        };
    };

    return (
        <div className="h-screen bg-black text-white font-sans flex flex-col overflow-y-auto selection:bg-white selection:text-black scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {/* Top Bar */}
            <div className="sticky top-0 h-12 bg-black border-b border-void-border flex items-center px-4 justify-between flex-shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-xl tracking-tight text-white">GuardianNexus</span>
                    <nav className="flex gap-4 text-sm font-medium text-gray-400">
                        <button className="text-white transition-colors bg-void-surface px-3 py-1 border border-void-border">Inventory</button>
                        <button className="hover:text-white transition-colors">Progress</button>
                        <button className="hover:text-white transition-colors">Vendors</button>
                    </nav>
                </div>

                <div className="flex-1 max-w-xl px-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                        <input
                            id="search-items"
                            name="search"
                            type="text"
                            placeholder="Search item, perk, is:dupe..."
                            className="w-full bg-[#000]/30 border border-white/10 rounded-sm py-1.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f5dc56]/50 transition-colors font-mono"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                        />

                        {/* Spotlight Search Dropdown */}
                        {isSearchFocused && dropdownItems.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-md shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto">
                                {dropdownItems.map(item => {
                                    const def = definitions[item.itemHash];
                                    const power = item.instanceData?.primaryStat?.value;

                                    return (
                                        <button
                                            key={item.itemInstanceId || item.itemHash}
                                            className="w-full flex items-center gap-3 p-2 hover:bg-white/10 cursor-pointer transition-colors text-left group border-b border-white/5 last:border-0"
                                            onClick={(e) => {
                                                // Prevent blur from firing before click
                                                e.preventDefault();
                                                handleItemClick(item, def, e);
                                            }}
                                        >
                                            {def?.displayProperties?.icon && (
                                                <img
                                                    src={`https://www.bungie.net${def.displayProperties.icon}`}
                                                    className="w-10 h-10 rounded-sm bg-gray-800"
                                                    alt=""
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-gray-200 group-hover:text-white truncate">
                                                    {def?.displayProperties?.name || 'Unknown Item'}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                    <span className="truncate">{def?.itemTypeDisplayName}</span>
                                                    {power && (
                                                        <>
                                                            <span className="w-1 h-1 rounded-full bg-gray-600" />
                                                            <span className="text-[#f5dc56]">{power}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Tag/Owner indicator could go here */}
                                            <div className="text-xs text-gray-600 font-mono uppercase">
                                                {item.owner === 'vault' ? 'Vault' : 'Char'}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <RefreshButton
                        lastUpdated={lastUpdated}
                        isRefreshing={isRefreshing}
                        onRefresh={triggerRefresh}
                    />
                    <button className="hover:text-white">Settings</button>
                    <div className="size-6 bg-gradient-to-tr from-[#f5dc56] to-[#f5dc56]/50 rounded-full border border-white/10" />
                </div>
            </div>

            {/* Horizontal Content - THE FLOORS */}
            {/* Horizontal Content - SLOT BASED ROWS */}
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-x-auto pb-32">

                {/* Floor 1: HEADERS (Emblems + Stats) */}
                <div className="flex gap-2 min-w-max h-[160px] items-start"> {/* Fixed height for alignment */}
                    {characters.map((char: any) => (
                        <div
                            key={char.characterId}
                            className="flex-shrink-0"
                        >
                            <StoreHeader
                                storeId={char.characterId}
                                character={char}
                            />
                        </div>
                    ))}
                    <div className="flex-1 min-w-[300px] flex flex-col">
                        <StoreHeader storeId="vault" vaultCount={vaultItems.length} />
                    </div>
                </div>

                {/* DYNAMIC ROWS Loop */}
                {[
                    { label: 'Kinetic Weapons', hash: BUCKETS.Kinetic },
                    { label: 'Energy Weapons', hash: BUCKETS.Energy },
                    { label: 'Power Weapons', hash: BUCKETS.Power },
                    { label: 'Helmets', hash: BUCKETS.Helmet },
                    { label: 'Arms', hash: BUCKETS.Gauntlets },
                    { label: 'Chest', hash: BUCKETS.Chest },
                    { label: 'Legs', hash: BUCKETS.Legs },
                    { label: 'Class Items', hash: BUCKETS.Class },
                ].map(row => (
                    <div key={row.hash} className="flex flex-col w-full">
                        <InventoryBucketLabel label={row.label} />
                        <div className="flex gap-2 items-start">
                            {/* Characters */}
                            {characters.map((char: any) => {
                                const { equipment, inventory } = getItemsForCharacter(char.characterId);
                                return (
                                    <div
                                        key={char.characterId}
                                        className="w-[290px] flex-shrink-0"
                                    >
                                        <StoreBucket
                                            bucketHash={row.hash}
                                            equipment={equipment}
                                            inventory={inventory}
                                            definitions={definitions}
                                            onItemClick={handleItemClick}
                                        />
                                    </div>
                                );
                            })}

                            {/* Vault */}
                            <div className="flex-1 min-w-[400px]">
                                <VirtualVaultGrid
                                    bucketHash={row.hash}
                                    items={vaultItems}
                                    definitions={definitions}
                                    onItemContextMenu={handleContextMenu}
                                    onItemClick={handleItemClick}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <ItemContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    item={contextMenu.item}
                    definition={contextMenu.definition}
                    onClose={() => setContextMenu(null)}
                />
            )}

            {/* Item Details Modal */}
            {selectedItem && (
                <ItemDetailModal
                    item={selectedItem.item}
                    definition={selectedItem.definition}
                    definitions={definitions}
                    referenceElement={selectedItem.referenceElement}
                    onClose={() => setSelectedItem(null)}
                    characters={characters}
                />
            )}

            {/* Compare Sheet (DIM-style bottom drawer) */}
            {compareSession && compareItems.length > 0 && (
                <CompareModal
                    session={compareSession}
                    items={compareItems}
                    definitions={definitions}
                    onClose={endCompare}
                />
            )}
        </div>
    );
}

// Re-export of App needs to handle default and named exports usually, but this file has `export default`.
