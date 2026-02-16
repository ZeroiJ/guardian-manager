import { useMemo } from 'react';
import { Navigation } from '@/components/Navigation';
import { useProfile } from '@/hooks/useProfile';
import { useDefinitions } from '@/hooks/useDefinitions';
import { InventoryItem } from '@/components/inventory/InventoryItem';

const BUCKET_BOUNTIES = 1784235469;
const BUCKET_QUESTS = 1345459588;

export default function Progress() {
    const { profile, loading: profileLoading, error: profileError } = useProfile();

    // 1. Filter Items
    const bounties = useMemo(() => {
        if (!profile?.items) return [];
        return profile.items.filter(item => item.bucketHash === BUCKET_BOUNTIES);
    }, [profile?.items]);

    const quests = useMemo(() => {
        if (!profile?.items) return [];
        return profile.items.filter(item => item.bucketHash === BUCKET_QUESTS);
    }, [profile?.items]);

    // 2. Extract Hashes for Definitions
    const itemHashes = useMemo(() => {
        const hashes = new Set<number>();
        bounties.forEach(item => hashes.add(item.itemHash));
        quests.forEach(item => hashes.add(item.itemHash));
        return Array.from(hashes);
    }, [bounties, quests]);

    // 3. Fetch Definitions
    const { definitions, loading: defsLoading } = useDefinitions('DestinyInventoryItemDefinition', itemHashes);

    const isLoading = profileLoading || (itemHashes.length > 0 && defsLoading);

    if (profileError) {
        return (
            <div className="h-screen bg-black text-red-500 flex flex-col items-center justify-center p-4">
                <div className="text-xl mb-4">Error Loading Profile</div>
                <div className="bg-red-900/20 border border-red-500/50 p-4 rounded max-w-md break-words">
                    {profileError.message}
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-black text-white font-sans flex flex-col overflow-y-auto selection:bg-white selection:text-black scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {/* Top Bar */}
            <div className="sticky top-0 h-12 bg-black border-b border-void-border flex items-center px-4 justify-between flex-shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-xl tracking-tight text-white">GuardianNexus</span>
                    <Navigation />
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto w-full space-y-12">
                
                {isLoading && (
                    <div className="flex items-center justify-center py-20">
                         <div className="animate-pulse text-[#f5dc56]">LOADING PROGRESS DATA...</div>
                    </div>
                )}

                {!isLoading && (
                    <>
                        {/* Bounties Section */}
                        <section>
                            <h2 className="text-2xl font-rajdhani font-bold text-[#f5dc56] mb-6 border-b border-white/10 pb-2">
                                Active Bounties ({bounties.length})
                            </h2>
                            {bounties.length === 0 ? (
                                <p className="text-gray-500 italic">No active bounties.</p>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                                    {bounties.map(item => (
                                        <InventoryItem
                                            key={item.itemInstanceId || item.itemHash} // Bounties have instance IDs usually
                                            item={item}
                                            definition={definitions[item.itemHash]}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Quests Section */}
                        <section>
                            <h2 className="text-2xl font-rajdhani font-bold text-[#f5dc56] mb-6 border-b border-white/10 pb-2">
                                Active Quests ({quests.length})
                            </h2>
                            {quests.length === 0 ? (
                                <p className="text-gray-500 italic">No active quests.</p>
                            ) : (
                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                                    {quests.map(item => (
                                        <InventoryItem
                                            key={item.itemInstanceId || item.itemHash}
                                            item={item}
                                            definition={definitions[item.itemHash]}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}

            </div>
        </div>
    );
}
