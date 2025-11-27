import React, { useState, useEffect } from 'react';
import { ArsenalSidebar } from './ArsenalSidebar';
import { WeaponGrid } from './WeaponGrid';
import { Search } from 'lucide-react';
import { filterItems } from '../utils/itemFilter';

// Simple Input Mock
const Input = ({ className, ...props }) => (
    <input className={`px-4 py-2 rounded ${className}`} {...props} />
);

export function Arsenal() {
    const [selectedCategory, setSelectedCategory] = useState('weapons');
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

                const hashes = [...new Set(allItems.map(i => i.itemHash))];

                // 3. Fetch Manifest Definitions
                const manifestRes = await fetch('/api/manifest/definitions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ hashes })
                });
                const manifestData = await manifestRes.json();
                setDefinitions(manifestData);

            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helper to get items for the active character
    const getCharacterItems = () => {
        if (!profile || !activeCharacterId) return [];

        const equipment = profile.characterEquipment?.data?.[activeCharacterId]?.items || [];
        const inventory = profile.characterInventories?.data?.[activeCharacterId]?.items || [];
        const vault = profile.profileInventory?.data?.items || [];

        // Merge Instance Data (Power Level, Perks, etc.)
        const itemInstances = profile.itemComponents?.instances?.data || {};

        const processItems = (items, location) => items.map(item => ({
            ...item,
            instanceData: {
                ...itemInstances[item.itemInstanceId],
                location // 'equipped', 'inHand', 'vault'
            },
            def: definitions[item.itemHash]
        })).filter(item => item.def);

        const equippedItems = processItems(equipment, 'equipped');
        const inventoryItems = processItems(inventory, 'inHand');
        const vaultItems = processItems(vault, 'vault');

        return [...equippedItems, ...inventoryItems, ...vaultItems];
    };

    const allItems = getCharacterItems();
    console.log('All Items:', allItems.length);
    console.log('Vault Items (Raw):', profile?.profileInventory?.data?.items?.length);
    console.log('Vault Items (Processed):', allItems.filter(i => i.instanceData.location === 'vault').length);

    // Filter by Search (Advanced)
    const filteredItems = filterItems(allItems, searchQuery);
    console.log('Filtered Items:', filteredItems.length);

    // Buckets
    const BUCKETS = {
        Kinetic: 1498876634,
        Energy: 2465295065,
        Power: 953998645,
        Helmet: 3448274439,
        Gauntlets: 3551918588,
        Chest: 14239492,
        Legs: 20886954,
        Class: 1585787867
    };

    const kineticWeapons = filteredItems.filter(i => i.def.inventory.bucketTypeHash === BUCKETS.Kinetic);
    const energyWeapons = filteredItems.filter(i => i.def.inventory.bucketTypeHash === BUCKETS.Energy);
    const powerWeapons = filteredItems.filter(i => i.def.inventory.bucketTypeHash === BUCKETS.Power);

    if (loading) return <div className="min-h-screen bg-[#0a0e14] text-white flex items-center justify-center">Loading Arsenal...</div>;

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-void selection:text-white">
            {/* Header Window */}
            <div className="sticky top-4 z-50 px-4 mb-8">
                <div className="container mx-auto bg-surface/80 backdrop-blur-md border border-white/20 shadow-neo">
                    {/* Title Bar */}
                    <div className="flex items-center justify-between px-2 py-1 bg-white/5 border-b border-white/10">
                        <div className="flex gap-2">
                            <div className="w-3 h-3 bg-red-500 border border-black/50" />
                            <div className="w-3 h-3 bg-yellow-500 border border-black/50" />
                            <div className="w-3 h-3 bg-green-500 border border-black/50" />
                        </div>
                        <span className="text-xs font-mono text-gray-500 uppercase tracking-widest">Guardian_Nexus.exe</span>
                        <div className="w-12" /> {/* Spacer */}
                    </div>

                    {/* Header Content */}
                    <div className="px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="size-12 bg-void flex items-center justify-center border border-white shadow-neo-hover">
                                <span className="font-serif text-2xl text-white font-bold">G</span>
                            </div>
                            <div>
                                <h1 className="text-4xl font-serif tracking-tight">Guardian</h1>
                                <div className="flex items-center gap-2 text-sm font-mono text-gray-400 mt-1">
                                    <span className="text-solar">⚡ {profile?.characters?.data?.[activeCharacterId]?.light}</span>
                                    <span>// LIGHT_LEVEL</span>
                                </div>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative w-96">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
                            <Input
                                type="text"
                                placeholder="SEARCH_DATABASE..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-black border border-white/20 text-white placeholder:text-gray-600 focus:border-void focus:outline-none font-mono text-sm shadow-neo-hover transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="container mx-auto px-4 py-6">
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Sidebar */}
                    <div className="col-span-2">
                        <div className="sticky top-32 bg-surface/50 border border-white/10 p-4 shadow-neo backdrop-blur-sm">
                            <div className="mb-4 pb-2 border-b border-white/10">
                                <span className="text-xs font-mono text-gray-500">NAVIGATION</span>
                            </div>
                            <ArsenalSidebar
                                selectedCategory={selectedCategory}
                                onCategoryChange={setSelectedCategory}
                            />
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="col-span-10">
                        <div className="space-y-6">
                            {/* Kinetic Weapons */}
                            <WeaponGrid
                                title="Kinetic Weapons"
                                items={kineticWeapons}
                            />

                            {/* Energy Weapons */}
                            <WeaponGrid
                                title="Energy Weapons"
                                items={energyWeapons}
                            />

                            {/* Power Weapons */}
                            <WeaponGrid
                                title="Power Weapons"
                                items={powerWeapons}
                            />

                            {/* Armor Section Divider */}
                            <div className="pt-8 border-t border-[#252a38]">
                                <h2 className="text-2xl font-bold mb-6 text-[#e8e9ed]">Armor</h2>
                            </div>

                            <WeaponGrid title="Helmet" items={filteredItems.filter(i => i.def.inventory.bucketTypeHash === BUCKETS.Helmet)} />
                            <WeaponGrid title="Gauntlets" items={filteredItems.filter(i => i.def.inventory.bucketTypeHash === BUCKETS.Gauntlets)} />
                            <WeaponGrid title="Chest Armor" items={filteredItems.filter(i => i.def.inventory.bucketTypeHash === BUCKETS.Chest)} />
                            <WeaponGrid title="Leg Armor" items={filteredItems.filter(i => i.def.inventory.bucketTypeHash === BUCKETS.Legs)} />
                            <WeaponGrid title="Class Armor" items={filteredItems.filter(i => i.def.inventory.bucketTypeHash === BUCKETS.Class)} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
