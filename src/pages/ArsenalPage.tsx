import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { CharacterColumn } from '../components/dim/CharacterColumn';
import ItemCard from '../components/common/ItemCard';

export function ArsenalPage() {
    const [searchQuery, setSearchQuery] = useState('');

    // Data State
    const [profile, setProfile] = useState<any>(null);
    const [definitions, setDefinitions] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Profile
                const res = await fetch('/api/profile');
                if (!res.ok) throw new Error('Failed to fetch profile');
                const data = await res.json();
                setProfile(data);

                // 2. Extract Item Hashes
                const allItems: any[] = [];
                Object.values(data.characterEquipment?.data || {}).forEach((char: any) => allItems.push(...char.items));
                Object.values(data.characterInventories?.data || {}).forEach((char: any) => allItems.push(...char.items));
                allItems.push(...(data.profileInventory?.data?.items || []));

                // 3. Fetch Manifest Definitions (Optimized with Client-Side Chunking)
                // Filter out non-instanced items (Materials, Shaders, etc.) to prevent API rate limiting
                const instancedItems = allItems.filter((i: any) => i.itemInstanceId);
                const uniqueHashes = [...new Set(instancedItems.map((i: any) => i.itemHash))];



                // Helper to fetch in chunks
                const chunkArray = (arr: any[], size: number) => {
                    return Array.from({ length: Math.ceil(arr.length / size) }, (_v, i) =>
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
    const getItemsForCharacter = (charId: string) => {
        if (!profile) return { equipment: [], inventory: [] };

        const equipment = profile.characterEquipment?.data?.[charId]?.items || [];
        const inventory = profile.characterInventories?.data?.[charId]?.items || [];
        const itemInstances = profile.itemComponents?.instances?.data || {};

        const enhance = (items: any[]) => items.map(item => ({
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

        const filtered = vault.map((item: any) => ({
            ...item,
            instanceData: itemInstances[item.itemInstanceId],
            def: definitions[item.itemHash]
        })).filter((i: any) => i.def);

        return filtered;
    };

    if (loading) return <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-mono animate-pulse">Initializing Guardian_Nexus...</div>;

    const characters = profile?.characters?.data ? Object.values(profile.characters.data) : [];
    const vaultItems = getVaultItems();

    return (
        <div className="h-screen bg-[#11111b] text-[#e8e9ed] font-sans flex flex-col overflow-hidden selection:bg-[#f5dc56] selection:text-black">
            {/* Top Bar (DIM Style) */}
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
