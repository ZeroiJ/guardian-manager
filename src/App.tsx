import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { StoreHeader } from '@/components/inventory/StoreHeader';
import { InventoryBucketLabel } from '@/components/inventory/InventoryBucketLabel';
import { StoreBucket } from '@/components/inventory/StoreBucket';
import { BUCKETS } from '@/data/constants';
import { DroppableBucket } from '@/components/inventory/DroppableBucket';
import { VirtualVaultGrid } from '@/components/inventory/VirtualVaultGrid';
import { ItemDetailModal } from '@/components/inventory/ItemDetailModal';
import { ItemContextMenu } from '@/components/inventory/ItemContextMenu';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { useProfile } from '@/hooks/useProfile';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useDefinitions } from '@/hooks/useDefinitions';
import { filterItems } from '@/lib/search/itemFilter';
import { calculateMaxPower } from '@/lib/destiny/powerUtils';
import { useToast } from '@/contexts/ToastContext';
import { InventoryDragLayer } from '@/components/inventory/InventoryDragLayer';

export default function App() {
    const [searchQuery, setSearchQuery] = useState('');
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any, definition: any } | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ item: any, definition: any, referenceElement: HTMLElement | null } | null>(null);
    const { showToast } = useToast();

    // Use the new Zipper hook
    const { profile, loading: profileLoading, error: profileError, moveItem, refresh } = useProfile();

    // Auto-refresh system (30s polling with visibility check)
    const { lastUpdated, isRefreshing, triggerRefresh } = useAutoRefresh({
        onRefresh: refresh,
        enabled: !profileLoading && !profileError,
    });

    // Extract hashes for manifest lookup
    // Only fetch for items we actually have
    const itemHashes = profile?.items.map(i => i.itemHash) || [];
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

    const loading = profileLoading || (itemHashes.length > 0 && (itemDefsLoading || statGroupsLoading));

    const handleDrop = async (item: any, _sourceId: string, targetId: string) => {
        const sourceOwner = item.owner;
        let finalTargetId = targetId;
        let isVault = targetId === 'vault';

        // Parse Target ID
        if (targetId.startsWith('header_')) {
            finalTargetId = targetId.replace('header_', '');
            isVault = false;
        } else if (targetId !== 'vault' && targetId.includes('_')) {
            const parts = targetId.split('_');
            finalTargetId = parts[1];
            isVault = false;
        }

        // Check if no move needed
        if (sourceOwner === finalTargetId) return;

        // Execute Move
        console.log(`Moving item ${item.itemInstanceId} from ${sourceOwner} to ${finalTargetId}`);

        try {
            await moveItem(item.itemInstanceId, item.itemHash, finalTargetId, isVault);

            // Get proper names for Toast
            const targetName = isVault ? 'Vault' : 'Character';

            showToast({
                title: 'Item Transferred',
                message: `${definitions[item.itemHash]?.displayProperties?.name || 'Item'} moved to ${targetName}`,
                type: 'success',
                duration: 5000
            });
        } catch (error) {
            showToast({
                title: 'Transfer Failed',
                message: 'Failed to move item. Please try again.',
                type: 'error'
            });
        }
    };

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

    // Filter Items Logic
    const allItems = profile?.items || [];
    const filteredItems = filterItems(allItems, searchQuery, definitions);

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
        <DndProvider backend={HTML5Backend}>
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
                            />
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
                            <DroppableBucket
                                key={char.characterId}
                                id={`header_${char.characterId}`}
                                className="flex-shrink-0"
                                onDrop={handleDrop}
                            >
                                <StoreHeader
                                    storeId={char.characterId}
                                    character={char}
                                />
                            </DroppableBucket>
                        ))}
                        <DroppableBucket id="vault" className="flex-1 min-w-[300px] flex flex-col" onDrop={handleDrop}>
                            <StoreHeader storeId="vault" vaultCount={vaultItems.length} />
                        </DroppableBucket>
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
                                        <DroppableBucket
                                            key={char.characterId}
                                            id={`char_${char.characterId}_${row.hash}`}
                                            className="w-[290px] flex-shrink-0"
                                            onDrop={handleDrop}
                                        >
                                            <StoreBucket
                                                bucketHash={row.hash}
                                                equipment={equipment}
                                                inventory={inventory}
                                                definitions={definitions}
                                                onItemClick={handleItemClick}
                                            />
                                        </DroppableBucket>
                                    );
                                })}

                                {/* Vault */}
                                <DroppableBucket id="vault" className="flex-1 min-w-[400px]" onDrop={handleDrop}>
                                    <VirtualVaultGrid
                                        bucketHash={row.hash}
                                        items={vaultItems}
                                        definitions={definitions}
                                        onItemContextMenu={handleContextMenu}
                                        onItemClick={handleItemClick}
                                    />
                                </DroppableBucket>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Global Custom Drag Preview */}
                <InventoryDragLayer />

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
                    />
                )}
            </div>
        </DndProvider>
    );
}

// Re-export of App needs to handle default and named exports usually, but this file has `export default`.
