import { useState } from 'react';
import { Search } from 'lucide-react';
import { DndContext, DragOverlay, DragStartEvent, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { CharacterColumn } from '../components/inventory/CharacterColumn';
import DestinyItemTile from '../components/destiny/DestinyItemTile';
import { DraggableInventoryItem } from '../components/inventory/DraggableInventoryItem';
import { useProfile } from '../hooks/useProfile';
import { useDefinitions } from '../hooks/useDefinitions';
import { filterItems } from '../utils/search/itemFilter';

export function ArsenalPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDragItem, setActiveDragItem] = useState<{ item: any, definition: any } | null>(null);
    
    // ... sensors ...

    // Use the new Zipper hook
    const { profile, loading: profileLoading, error: profileError } = useProfile();
    
    // ... definitions ...

    // Filter Items Logic
    const allItems = profile?.items || [];
    const filteredItems = filterItems(allItems, searchQuery, definitions);

    // Filter Items for Vault
    // Location 1020252227 is Vault
    const vaultItems = filteredItems.filter(i => i.location === 1020252227);

    const characters = profile?.characters ? Object.values(profile.characters) : [];

    // Helper to get items for character
    const getItemsForCharacter = (charId: string) => {
        // We filter from the SEARCH results
        const charItems = filteredItems.filter(i => i.owner === charId);
        
        return {
            equipment: charItems.filter(i => i.instanceData?.isEquipped),
            inventory: charItems.filter(i => !i.instanceData?.isEquipped)
        };
    };
    
    // ... render ...

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="h-screen bg-[#11111b] text-[#e8e9ed] font-sans flex flex-col overflow-hidden selection:bg-[#f5dc56] selection:text-black">
                {/* Top Bar */}
                <div className="h-12 bg-[#0d0d15] border-b border-white/5 flex items-center px-4 justify-between flex-shrink-0 z-50 shadow-md">
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
                        <button className="hover:text-white">Settings</button>
                        <div className="size-6 bg-gradient-to-tr from-[#f5dc56] to-[#f5dc56]/50 rounded-full border border-white/10" />
                    </div>
                </div>

                {/* Horizontal Scroll Content */}
                <div className="flex-1 overflow-x-auto flex divide-x divide-[#333]">
                    {characters.map((char: any) => {
                        const { equipment, inventory } = getItemsForCharacter(char.characterId);
                        return (
                            <CharacterColumn
                                key={char.characterId}
                                character={char}
                                equipment={equipment}
                                inventory={inventory}
                                definitions={definitions}
                                artifactPower={profile?.artifactPower || 0}
                            />
                        );
                    })}

                    {/* Vault Column */}
                    <div className="flex-shrink-0 w-[400px] bg-[#11111b] flex flex-col h-full">
                        <div className="h-[48px] flex items-center px-4 bg-[#0d0d15] border-b border-white/5 justify-between flex-shrink-0 shadow-md">
                            <span className="font-bold text-lg text-[#ccc]">Vault</span>
                            <span className="text-sm font-mono text-[#666]">{vaultItems.length} / 600</span>
                        </div>
                        {/* Stats Placeholder Row for Vault */}
                        <div className="h-[25px] bg-[#0a0a10] border-b border-white/5" />

                        <div className="flex-1 p-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            <div className="flex flex-wrap gap-[2px] content-start">
                                {vaultItems.map((item: any) => (
                                    <div key={item.itemInstanceId || item.itemHash} className="w-[48px] h-[48px] border border-white/5 bg-[#1a1a1a]">
                                        <DraggableInventoryItem item={item} definition={definitions[item.itemHash]} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
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
            </div>
        </DndContext>
    );
}