import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { CharacterColumn } from '../components/dim/CharacterColumn';
import ItemCard from '../components/common/ItemCard';

export function ArsenalPage() {
    const [searchQuery, setSearchQuery] = useState('');

    // Data State
    const [profile, setProfile] = useState(null);
    const [definitions, setDefinitions] = useState({});
    const [loading, setLoading] = useState(true);
    const [activeCharacterId, setActiveCharacterId] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Profile
                const res = await fetch('/api/profile');
                if (!res.ok) throw new Error('Failed to fetch profile');
                const data = await res.json();
                setProfile(data);

                // Set initial active character
                const charIds = Object.keys(data.characters.data || {});
                if (charIds.length > 0) setActiveCharacterId(charIds[0]);

                // 2. Extract Item Hashes
                const allItems = [];
                Object.values(data.characterEquipment?.data || {}).forEach(char => allItems.push(...char.items));
                Object.values(data.characterInventories?.data || {}).forEach(char => allItems.push(...char.items));
                allItems.push(...(data.profileInventory?.data?.items || []));

                // 3. Fetch Manifest Definitions (Optimized with Client-Side Chunking)
                // Filter out non-instanced items (Materials, Shaders, etc.) to prevent API rate limiting
                const instancedItems = allItems.filter(i => i.itemInstanceId);
                const uniqueHashes = [...new Set(instancedItems.map(i => i.itemHash))];



                // Helper to fetch in chunks
                const chunkArray = (arr, size) => {
                    return Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
                        arr.slice(i * size, i * size + size)
                    );
                };

                const chunks = chunkArray(uniqueHashes, 50); // 50 items per request to avoid backend timeout
                let loadedCount = 0;

                // Process chunks sequentially to avoid overwhelming the backend
                for (const chunk of chunks) {
                    try {
                        const res = await fetch('/api/manifest/definitions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ hashes: chunk })
                        });

                        if (res.ok) {
                            const data = await res.json();
                            loadedCount += Object.keys(data).length;
                            setDefinitions(prev => ({ ...prev, ...data })); // Incremental update
                        } else {
                            console.warn('Failed to fetch chunk', res.status);
                        }
                    } catch (e) {
                        console.error('Error fetching chunk:', e);
                    }
                }



            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helper to get items for a specific character
    const getItemsForCharacter = (charId) => {
        if (!profile) return { equipment: [], inventory: [] };

        const equipment = profile.characterEquipment?.data?.[charId]?.items || [];
        const inventory = profile.characterInventories?.data?.[charId]?.items || [];
        const itemInstances = profile.itemComponents?.instances?.data || {};

        const enhance = (items) => items.map(item => ({
            ...item,
            instanceData: itemInstances[item.itemInstanceId],
            def: definitions[item.itemHash]
        })).filter(i => i.def); // Only show if definition exists

        return {
            equipment: enhance(equipment),
            inventory: enhance(inventory)
        };
    };

    const getVaultItems = () => {
        if (!profile) return [];
        const vault = profile.profileInventory?.data?.items || [];
        const itemInstances = profile.itemComponents?.instances?.data || {};

        const filtered = vault.map(item => ({
            ...item,
            instanceData: itemInstances[item.itemInstanceId],
            def: definitions[item.itemHash]
        })).filter(i => i.def);

        return filtered;
    };

    if (loading) return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-mono animate-pulse">Initializing Guardian_Nexus...</div>;

    const characters = profile?.characters?.data ? Object.values(profile.characters.data) : [];
    const vaultItems = getVaultItems();

    return (
        <div className="h-screen bg-[#050505] text-[#e8e9ed] font-sans flex flex-col overflow-hidden">
            {/* Top Bar (DIM Style) */}
            <div className="h-12 bg-[#141414] border-b border-white/10 flex items-center px-4 justify-between flex-shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-xl tracking-tight text-white">Guardian<span className="text-[#e1c564]">Nexus</span></span>
                    <nav className="flex gap-4 text-sm font-medium text-gray-400">
                        <button className="text-white hover:text-white transition-colors">Inventory</button>
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
                            className="w-full bg-black/50 border border-white/10 rounded-sm py-1.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <button className="hover:text-white">Settings</button>
                    <div className="size-6 bg-gradient-to-tr from-yellow-500 to-orange-500 rounded-full" />
                </div>
            </div>

            {/* Horizontal Scroll Content */}
            <div className="flex-1 overflow-x-auto flex">
                {characters.map(char => {
                    const { equipment, inventory } = getItemsForCharacter(char.characterId);
                    return (
                        <CharacterColumn
                            key={char.characterId}
                            character={char}
                            equipment={equipment}
                            inventory={inventory}
                            definitions={definitions}
                        />
                    );
                })}

                {/* Vault Column */}
                <div className="flex-shrink-0 w-[400px] bg-[#101010] flex flex-col h-full border-r border-white/10">
                    <div className="h-12 flex items-center px-4 bg-[#141414] border-b border-white/10 justify-between">
                        <span className="font-bold text-gray-300">Vault</span>
                        <span className="text-sm font-mono text-gray-500">{vaultItems.length} / 600</span>
                    </div>
                    <div className="flex-1 p-2 overflow-y-auto">
                        <div className="flex flex-wrap gap-1 content-start">
                            {vaultItems.map(item => (
                                <div key={item.itemInstanceId || item.itemHash} className="w-[48px] h-[48px]">
                                    <ItemCard item={item} definition={item.def} compact={true} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
