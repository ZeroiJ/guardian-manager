import React, { useEffect, useState } from 'react';

const Dashboard = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch('/api/profile', {
                    credentials: 'include' // Important for sending cookies
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        // Redirect to login if unauthorized
                        window.location.href = '/';
                        return;
                    }
                    throw new Error('Failed to fetch profile');
                }

                const data = await response.json();
                setProfile(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        import React, { useEffect, useState } from 'react';
        import { useNavigate } from 'react-router-dom';
        import InventoryGrid from './InventoryGrid';

        const Dashboard = () => {
            const [profile, setProfile] = useState(null);
            const [definitions, setDefinitions] = useState({});
            const [loading, setLoading] = useState(true);
            const [activeCharacterId, setActiveCharacterId] = useState(null);
            const navigate = useNavigate();

            useEffect(() => {
                const fetchData = async () => {
                    try {
                        // 1. Fetch Profile
                        const res = await fetch('/api/profile');
                        if (!res.ok) {
                            if (res.status === 401) navigate('/');
                            throw new Error('Failed to fetch profile');
                        }
                        const data = await res.json();
                        setProfile(data);

                        // Set initial active character
                        const charIds = Object.keys(data.characters.data || {});
                        if (charIds.length > 0) setActiveCharacterId(charIds[0]);

                        // 2. Extract Item Hashes
                        const allItems = [];
                        // From Character Equipment
                        Object.values(data.characterEquipment?.data || {}).forEach(char => {
                            allItems.push(...char.items);
                        });
                        // From Character Inventories
                        Object.values(data.characterInventories?.data || {}).forEach(char => {
                            allItems.push(...char.items);
                        });
                        // From Profile Inventory (Vault/Consumables - optional for now)
                        // if (data.profileInventory?.data?.items) allItems.push(...data.profileInventory.data.items);

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
            }, [navigate]);

            if (loading) return <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">Loading Guardian Data...</div>;
            if (!profile) return <div className="min-h-screen bg-[#0f0f0f] text-white flex items-center justify-center">Error loading data.</div>;

            const characters = profile.characters.data;
            const activeChar = characters[activeCharacterId];

            // Helper to get items for the active character
            const getCharacterItems = () => {
                const equipment = profile.characterEquipment.data[activeCharacterId].items;
                const inventory = profile.characterInventories.data[activeCharacterId].items;
                return [...equipment, ...inventory];
            };

            const allCharItems = getCharacterItems();

            // Filter items by bucket (Weapons, Armor)
            // Note: We need bucket hashes from definitions to do this properly.
            // For now, let's just dump them all to see if it works, or try to categorize if we have bucketHash in definition.
            // Actually, the item definition has `inventory.bucketTypeHash`.
            // Common Buckets:
            // Kinetic: 1498876634, Energy: 2465295065, Power: 953998645
            // Helmet: 3448274439, Arms: 3551918588, Chest: 14239492, Legs: 20886954, Class: 1585787867

            const BUCKETS = {
                'Kinetic Weapons': 1498876634,
                'Energy Weapons': 2465295065,
                'Power Weapons': 953998645,
                'Helmet': 3448274439,
                'Gauntlets': 3551918588,
                'Chest Armor': 14239492,
                'Leg Armor': 20886954,
                'Class Armor': 1585787867
            };

            const filterByBucket = (bucketHash) => {
                return allCharItems.filter(item => {
                    const def = definitions[item.itemHash];
                    return def && def.inventory && def.inventory.bucketTypeHash === bucketHash;
                });
            };

            return (
                <div className="min-h-screen bg-[#0f0f0f] text-gray-100 font-sans selection:bg-yellow-500/30">
                    {/* Header / Character Tabs */}
                    <div className="bg-[#1a1a1a] border-b border-gray-800 sticky top-0 z-10">
                        <div className="max-w-7xl mx-auto px-4">
                            <div className="flex space-x-1 overflow-x-auto py-2">
                                {Object.values(characters).map(char => (
                                    <button
                                        key={char.characterId}
                                        onClick={() => setActiveCharacterId(char.characterId)}
                                        className={`relative h-16 w-48 flex-shrink-0 overflow-hidden border-b-2 transition-all ${activeCharacterId === char.characterId
                                                ? 'border-yellow-500 opacity-100'
                                                : 'border-transparent opacity-50 hover:opacity-80'
                                            }`}
                                    >
                                        {/* Emblem Background */}
                                        <img
                                            src={`https://www.bungie.net${char.emblemBackgroundPath}`}
                                            alt="Emblem"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                        {/* Class & Light */}
                                        <div className="absolute inset-0 flex flex-col justify-center px-4 bg-black/20 backdrop-blur-[1px]">
                                            <span className="font-bold text-white text-shadow uppercase tracking-widest text-sm">
                                                {['Titan', 'Hunter', 'Warlock'][char.classType]}
                                            </span>
                                            <span className="text-yellow-400 font-bold text-xl">
                                                ✧ {char.light}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="max-w-7xl mx-auto px-4 py-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Weapons Column */}
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-yellow-500 pl-3">Weapons</h2>
                                <InventoryGrid
                                    bucketName="Kinetic"
                                    items={filterByBucket(BUCKETS['Kinetic Weapons'])}
                                    definitions={definitions}
                                />
                                <InventoryGrid
                                    bucketName="Energy"
                                    items={filterByBucket(BUCKETS['Energy Weapons'])}
                                    definitions={definitions}
                                />
                                <InventoryGrid
                                    bucketName="Power"
                                    items={filterByBucket(BUCKETS['Power Weapons'])}
                                    definitions={definitions}
                                />
                            </div>

                            {/* Armor Column */}
                            <div>
                                <h2 className="text-2xl font-bold text-white mb-6 border-l-4 border-purple-500 pl-3">Armor</h2>
                                <InventoryGrid
                                    bucketName="Helmet"
                                    items={filterByBucket(BUCKETS['Helmet'])}
                                    definitions={definitions}
                                />
                                <InventoryGrid
                                    bucketName="Gauntlets"
                                    items={filterByBucket(BUCKETS['Gauntlets'])}
                                    definitions={definitions}
                                />
                                <InventoryGrid
                                    bucketName="Chest"
                                    items={filterByBucket(BUCKETS['Chest Armor'])}
                                    definitions={definitions}
                                />
                                <InventoryGrid
                                    bucketName="Legs"
                                    items={filterByBucket(BUCKETS['Leg Armor'])}
                                    definitions={definitions}
                                />
                                <InventoryGrid
                                    bucketName="Class Item"
                                    items={filterByBucket(BUCKETS['Class Armor'])}
                                    definitions={definitions}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        export default Dashboard;
