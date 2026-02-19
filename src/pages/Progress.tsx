/**
 * PROGRESS PAGE (v0.23.0 - Maintenance Mode)
 * Status: Beta / Partial Feature Parity with DIM
 *
 * ACTIVE FEATURES:
 * - Seasonal Rank: Fully functional (Backend 202 + 100).
 * - Tracked Triumphs: Working (Backend 900).
 * - Seasonal Challenges: Working (Backend 1100).
 * - Event Cards: Working (Backend 100 + 1100).
 * - Quests/Bounties: Basic list working (Bucket Headers verified).
 *
 * TODO / MISSING:
 * - Faction Reputation: Logic exists (useProgressStore) but UI needs detailed "diamond" progress bars.
 * - Item Objectives: "Yellow Bar" overlay on inventory items is missing.
 * - Milestones: Logic exists but needs precise "Challenge" filtering.
 * - Pathfinder: Placeholder only.
 *
 * API DEPENDENCIES:
 * - Components: 100, 102, 104, 200, 201, 202, 205, 300, 302, 304, 305, 700, 900, 1100, 1200
 * - Manifest: DestinyProgressionDefinition, DestinySeasonDefinition, DestinyRecordDefinition
 */
import React, { useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useProfile } from '@/hooks/useProfile';
import { useDefinitions } from '@/hooks/useDefinitions';
import { RankSection } from '@/components/progress/RankSection';
import { FactionRanks } from '@/components/progress/FactionRanks';
import { PursuitGrid } from '@/components/progress/PursuitGrid';
import { CharacterSidebar } from '@/components/progress/CharacterSidebar';
import { SeasonalRank } from '@/components/progress/SeasonalRank';
import { TrackedTriumphs } from '@/components/progress/TrackedTriumphs';
import { EventCard } from '@/components/progress/EventCard';
import { SeasonalChallenges } from '@/components/progress/SeasonalChallenges';
import { MilestoneSection } from '@/components/progress/MilestoneSection';
import { PathfinderSection } from '@/components/progress/PathfinderSection';
import { RaidSection } from '@/components/progress/RaidSection';
import { ITEM_CATEGORY_QUEST_STEP } from '@/data/constants';
import { ProgressItem, ProgressObjective } from '@/services/profile/types';

// Bucket Hash for Quests (contains both Bounties and Quests)
const BUCKET_QUESTS = 1345459588;
const BUCKET_BOUNTIES = 1784235469;

export default function Progress() {
    const { profile, loading: profileLoading, error: profileError } = useProfile();
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

    // Set initial character
    React.useEffect(() => {
        if (!selectedCharacterId && profile?.characters) {
            const charIds = Object.keys(profile.characters);
            if (charIds.length > 0) {
                setSelectedCharacterId(charIds[0]);
            }
        }
    }, [profile?.characters, selectedCharacterId]);

    // 1. Get Character Items
    const characterItems = useMemo(() => {
        if (!profile?.items || !selectedCharacterId) return [];
        return profile.items.filter(item =>
            item.owner === selectedCharacterId &&
            (item.bucketHash === BUCKET_QUESTS || item.bucketHash === BUCKET_BOUNTIES)
        );
    }, [profile?.items, selectedCharacterId]);

    // 2. Extract Hashes
    const itemHashes = useMemo(() => {
        return Array.from(new Set(characterItems.map(i => i.itemHash)));
    }, [characterItems]);

    // 3. Fetch Definitions
    const { definitions, loading: defsLoading } = useDefinitions('DestinyInventoryItemDefinition', itemHashes);

    // 4. Categorize Items & Map to ProgressItem
    const { bounties, quests, items } = useMemo(() => {
        const result = { bounties: [] as ProgressItem[], quests: [] as ProgressItem[], items: [] as ProgressItem[] };
        if (defsLoading || !definitions || characterItems.length === 0) return result;

        const allItems: { item: any, def: any }[] = [];

        characterItems.forEach(item => {
            const def = definitions[item.itemHash];
            if (!def) return;
            allItems.push({ item, def });
        });

        // Sort Function
        const sortPursuits = (a: { item: any, def: any }, b: { item: any, def: any }) => {
            const itemA = a.item;
            const itemB = b.item;
            const defA = a.def;
            const defB = b.def;

            // 1. Completion (Redeemable first)
            const isCompleteA = itemA.objectives?.objectives?.every((o: any) => o.complete);
            const isCompleteB = itemB.objectives?.objectives?.every((o: any) => o.complete);
            if (isCompleteA && !isCompleteB) return -1;
            if (!isCompleteA && isCompleteB) return 1;

            // 2. Tracked (Tracked first)
            const isTrackedA = (itemA.state & 2) !== 0;
            const isTrackedB = (itemB.state & 2) !== 0;
            if (isTrackedA && !isTrackedB) return -1;
            if (!isTrackedA && isTrackedB) return 1;

            // 3. Expiration (Expiring soonest first)
            const expA = itemA.expirationDate ? new Date(itemA.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
            const expB = itemB.expirationDate ? new Date(itemB.expirationDate).getTime() : Number.MAX_SAFE_INTEGER;
            if (expA !== expB) return expA - expB;

            // 4. Rarity/Tier (Higher tier first)
            const tierA = defA.inventory?.tierType || 0;
            const tierB = defB.inventory?.tierType || 0;
            if (tierA !== tierB) return tierB - tierA; // Descending

            // 5. Name (Alphabetical)
            const nameA = defA.displayProperties?.name || "";
            const nameB = defB.displayProperties?.name || "";
            return nameA.localeCompare(nameB);
        };

        // Helper to Map
        const toProgressItem = (item: any, def: any, type: 'Bounty' | 'Quest' | 'Item'): ProgressItem => {
            const objectives: ProgressObjective[] = item.objectives?.objectives?.map((o: any, idx: number) => ({
                objectiveHash: o.objectiveHash,
                progress: o.progress || 0,
                completionValue: o.completionValue || 1,
                complete: o.complete,
                description: `Objective ${idx + 1}` // Simplification
            })) || [];

            const totalProgress = objectives.reduce((acc, o) => acc + (o.progress / o.completionValue), 0);
            const percent = objectives.length > 0 ? (totalProgress / objectives.length) * 100 : 0;
            const isComplete = objectives.length > 0 && objectives.every(o => o.complete);

            return {
                hash: item.itemHash,
                instanceId: item.itemInstanceId,
                name: def.displayProperties?.name,
                icon: def.displayProperties?.icon,
                description: def.displayProperties?.description,
                type,
                percent,
                isComplete,
                isTracked: (item.state & 2) !== 0,
                expirationDate: item.expirationDate ? new Date(item.expirationDate) : undefined,
                objectives,
                rewards: []
            };
        };

        // Categorize
        allItems.sort(sortPursuits).forEach(({ item, def }) => {
            const hasObjectives = item.objectives?.objectives?.length > 0;

            if (!hasObjectives) {
                result.items.push(toProgressItem(item, def, 'Item'));
                return;
            }

            if (item.bucketHash === BUCKET_BOUNTIES) {
                result.bounties.push(toProgressItem(item, def, 'Bounty'));
            } else if (item.bucketHash === BUCKET_QUESTS) {
                result.quests.push(toProgressItem(item, def, 'Quest'));
            } else {
                result.items.push(toProgressItem(item, def, 'Item'));
            }
        });

        return result;
    }, [characterItems, definitions, defsLoading]);

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
        <div className="h-screen bg-black text-white font-sans flex flex-col overflow-hidden selection:bg-white selection:text-black">
            {/* Top Bar */}
            <div className="h-12 bg-black border-b border-void-border flex items-center px-4 justify-between flex-shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-xl tracking-[0.15em] text-white font-rajdhani uppercase">GM</span>
                    <Navigation />
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar */}
                <CharacterSidebar
                    selectedCharacterId={selectedCharacterId}
                    onSelect={setSelectedCharacterId}
                />

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                    <div className="p-8 max-w-7xl mx-auto w-full space-y-12 pb-32">

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                                <div className="animate-pulse text-[#f5dc56] font-rajdhani text-2xl font-bold tracking-widest">
                                    CONTACTING DESTINY SERVERS...
                                </div>
                                <div className="text-gray-500 text-sm">Synchronizing Progress Data</div>
                            </div>
                        ) : (
                            <>
                                {selectedCharacterId && selectedCharacterId !== 'account' && (
                                    <>
                                        {/* Faction Ranks (New) */}
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <FactionRanks characterId={selectedCharacterId} />
                                        </div>

                                        {/* Seasonal Rank (New) */}
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
                                            <SeasonalRank characterId={selectedCharacterId} />
                                        </div>

                                        {/* Tracked Triumphs (New) */}
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                                            <TrackedTriumphs />
                                        </div>

                                        {/* Event Card (New - Conditional) */}
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                                            <EventCard />
                                        </div>

                                        {/* Ranks (Legacy/Other) - kept for completeness but below */}
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <RankSection characterId={selectedCharacterId} />
                                        </div>

                                        {/* Milestones & Pathfinder */}
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-600 delay-100">
                                            <MilestoneSection characterId={selectedCharacterId} />
                                            <PathfinderSection characterId={selectedCharacterId} />
                                        </div>

                                        {/* Pathfinder (Pale Heart) */}
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
                                            <PathfinderSection characterId={selectedCharacterId} />
                                        </div>

                                        {/* Seasonal Challenges (New) */}
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                                            <SeasonalChallenges />
                                        </div>

                                        {/* Raids */}
                                        <div className="animate-in fade-in slide-in-from-bottom-6 duration-600 delay-150">
                                            <RaidSection characterId={selectedCharacterId} />
                                        </div>
                                    </>
                                )}

                                {/* Pursuits Grid */}
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                                    {bounties.length > 0 && (
                                        <PursuitGrid
                                            title="Active Bounties"
                                            items={bounties}
                                        />
                                    )}

                                    {quests.length > 0 && (
                                        <PursuitGrid
                                            title="Quests"
                                            items={quests}
                                        />
                                    )}

                                    {items.length > 0 && (
                                        <PursuitGrid
                                            title="Items"
                                            items={items}
                                        />
                                    )}

                                    {bounties.length === 0 && quests.length === 0 && items.length === 0 && (
                                        <div className="text-gray-500 italic py-20 text-center border border-dashed border-gray-800 rounded-lg">
                                            No active pursuits found for this character.
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
