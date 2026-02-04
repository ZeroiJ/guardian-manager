import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { CharacterColumn } from '@/components/inventory/CharacterColumn';
import DestinyItemTile from '@/components/destiny/DestinyItemTile';
import { DroppableZone } from '@/components/inventory/DroppableZone';
import { VirtualVaultGrid } from '@/components/inventory/VirtualVaultGrid';
import { ItemDetailModal } from '@/components/inventory/ItemDetailModal';
import { ItemContextMenu } from '@/components/inventory/ItemContextMenu';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { useProfile } from '@/hooks/useProfile';
import { useAutoRefresh } from '@/hooks/useAutoRefresh';
import { useDefinitions } from '@/hooks/useDefinitions';
import { filterItems } from '@/lib/search/itemFilter';
import { calculateMaxPower } from '@/lib/destiny/powerUtils';

export default function App() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDragItem, setActiveDragItem] = useState<{ item: any, definition: any } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, item: any, definition: any } | null>(null);
    const [selectedItem, setSelectedItem] = useState<{ item: any, definition: any } | null>(null);

    // Dnd Kit Sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required to start drag
            },
        })
    );

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

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.data.current) {
            setActiveDragItem(event.active.data.current as any);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragItem(null);

        if (!over) return;

        const sourceItem = active.data.current?.item;
        const targetContainerId = over.id as string; // 'vault' or characterId

        if (!sourceItem) return;

        // If dropped on same owner, do nothing
        if (sourceItem.owner === targetContainerId) return;

        // Execute Move
        const isVault = targetContainerId === 'vault';
        console.log(`Moving item ${sourceItem.itemInstanceId} from ${sourceItem.owner} to ${targetContainerId}`);

        moveItem(sourceItem.itemInstanceId, sourceItem.itemHash, targetContainerId, isVault);
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

    const handleItemClick = (item: any, definition: any) => {
        setSelectedItem({ item, definition });
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
                    {/* Background Ambience */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#1a1a2e] via-[#050505] to-[#050505] opacity-50" />

                    <div className="z-10 text-center space-y-6 max-w-lg px-6">
                        <div className="mb-8">
                            <div className="inline-block p-4 rounded-full bg-[#f5dc56]/10 border border-[#f5dc56]/20 mb-4 shadow-[0_0_30px_rgba(245,220,86,0.1)]">
                                <Search className="w-12 h-12 text-[#f5dc56]" />
                            </div>
                            <h1 className="text-5xl font-bold tracking-tighter text-white mb-2">
                                Guardian <span className="text-[#f5dc56]">Nexus</span>
                            </h1>
                            <p className="text-gray-400 text-lg">
                                The Advanced/AI Item Manager for Destiny 2
                            </p>
                        </div>

                        <div className="bg-[#11111b] border border-white/5 rounded-xl p-8 shadow-2xl backdrop-blur-sm">
                            <p className="text-gray-300 mb-8 leading-relaxed">
                                Connect your Bungie account to manage inventory, optimize loadouts, and organize your vault with advanced tools.
                            </p>

                            <a
                                href="/api/auth/login"
                                className="block w-full py-4 px-6 bg-[#f5dc56] hover:bg-[#e6ce4b] text-black font-bold text-lg rounded-lg transition-all transform hover:scale-[1.02] shadow-[0_0_20px_rgba(245,220,86,0.3)] hover:shadow-[0_0_30px_rgba(245,220,86,0.5)]"
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
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="h-screen bg-[#11111b] text-[#e8e9ed] font-sans flex flex-col overflow-y-auto selection:bg-[#f5dc56] selection:text-black scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {/* Top Bar */}
                <div className="sticky top-0 h-12 bg-[#0d0d15] border-b border-white/5 flex items-center px-4 justify-between flex-shrink-0 z-50 shadow-md">
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-xl tracking-tight text-white">Guardian<span className="text-[#f5dc56]">Nexus</span></span>
                        <nav className="flex gap-4 text-sm font-medium text-gray-400">
                            <button className="text-white hover:text-white transition-colors bg-[#292929] px-3 py-1 rounded">Inventory</button>
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

                {/* Horizontal Content */}
                <div className="flex-1 flex divide-x divide-[#333]">
                    {characters.map((char: any) => {
                        const { equipment, inventory, postmaster, maxPower } = getItemsForCharacter(char.characterId);
                        return (
                            <DroppableZone key={char.characterId} id={char.characterId} className="flex-shrink-0 h-full relative">
                                <CharacterColumn
                                    character={char}
                                    equipment={equipment}
                                    inventory={inventory}
                                    postmaster={postmaster}
                                    maxPower={maxPower}
                                    definitions={definitions}
                                    artifactPower={profile?.artifactPower || 0}
                                    onItemContextMenu={handleContextMenu}
                                    onItemClick={handleItemClick}
                                />
                            </DroppableZone>
                        );
                    })}

                    {/* Vault Column */}
                    <DroppableZone id="vault" className="flex-1 min-w-[400px] bg-[#11111b] flex flex-col h-full relative">
                        {/* 1. Header (Matches Character Emblem: h-[48px]) */}
                        <div className="h-[48px] flex items-center px-4 bg-[#0d0d15] border-b border-white/5 justify-between flex-shrink-0 shadow-md relative z-20">
                            <div className="flex flex-col leading-none">
                                <span className="font-bold text-lg text-[#ccc] tracking-wide">Vault</span>
                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Storage</span>
                            </div>
                            <div className="text-xl font-bold text-[#ccc] font-mono tracking-tighter">
                                {vaultItems.length} <span className="text-[#666] text-sm">/ 600</span>
                            </div>
                        </div>

                        {/* 2. Stats Block Placeholder (Matches Character Stats: ~102px) */}
                        {/* Height Calc: p-1(8px) + 6 rows(84px) + 5 gaps(10px) = 102px */}
                        <div className="flex flex-col bg-[#0a0a10] border-b border-white/5 p-1 gap-0.5 z-10 relative shadow-sm h-[103px] justify-center">
                            {/* Mock Currency / Info Display to fill space */}
                            <div className="flex items-center justify-between px-2 py-1 opacity-40">
                                <span className="text-[10px] uppercase font-bold text-gray-500">Glimmer</span>
                                <span className="text-xs font-mono text-[#f5dc56]">250,000</span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1 opacity-40">
                                <span className="text-[10px] uppercase font-bold text-gray-500">Shards</span>
                                <span className="text-xs font-mono text-purple-400">42,000</span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1 opacity-40">
                                <span className="text-[10px] uppercase font-bold text-gray-500">Dust</span>
                                <span className="text-xs font-mono text-blue-400">15,400</span>
                            </div>
                        </div>

                        {/* 3. Responsive Vault Grid (Added mt-2 to match Character Column) */}
                        <div className="flex-1 overflow-hidden relative p-1 mt-2">
                            <VirtualVaultGrid
                                items={vaultItems}
                                definitions={definitions}
                                onItemContextMenu={handleContextMenu}
                                onItemClick={handleItemClick}
                            />
                        </div>
                    </DroppableZone>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeDragItem ? (
                        <div className="w-[48px] h-[48px] shadow-2xl scale-110 pointer-events-none cursor-grabbing">
                            <DestinyItemTile
                                item={activeDragItem.item}
                                definition={activeDragItem.definition}
                                className="border-[#f5dc56] shadow-[0_0_15px_rgba(245,220,86,0.5)]"
                            />
                        </div>
                    ) : null}
                </DragOverlay>

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
                        onClose={() => setSelectedItem(null)}
                    />
                )}
            </div>
        </DndContext>
    );
}
