import React, { useEffect, useState } from 'react';

const Dashboard = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch('http://localhost:5000/api/profile', {
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

        fetchProfile();
    }, []);

    if (loading) return <div className="text-white text-center mt-10">Loading Guardian Data...</div>;
    if (error) return <div className="text-red-500 text-center mt-10">Error: {error}</div>;
    if (!profile) return <div className="text-white text-center mt-10">No profile data found.</div>;

    const characters = profile.characters.data;
    const characterIds = Object.keys(characters);

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Guardian Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {characterIds.map(charId => {
                    const char = characters[charId];
                    const emblemPath = `https://www.bungie.net${char.emblemBackgroundPath}`;

                    // Class Hash Mapping (Simple version)
                    const classNames = {
                        671679327: 'Hunter',
                        2271682572: 'Warlock',
                        3655393761: 'Titan'
                    };

                    return (
                        <div key={charId} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg relative h-24">
                            <img
                                src={emblemPath}
                                alt="Emblem"
                                className="absolute inset-0 w-full h-full object-cover opacity-50"
                            />
                            <div className="relative z-10 p-4 flex justify-between items-center h-full">
                                <div>
                                    <h2 className="text-xl font-bold">{classNames[char.classHash] || 'Unknown'}</h2>
                                    <p className="text-yellow-400 font-bold text-2xl">✦ {char.light}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-300">Race: {char.raceType}</p>
                                    <p className="text-sm text-gray-300">Gender: {char.genderType}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Inventory Snapshot</h2>
                <p className="text-gray-400">Inventory display coming soon...</p>
            </div>
        </div>
    );
};

export default Dashboard;
