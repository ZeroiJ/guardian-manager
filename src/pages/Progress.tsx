import React, { useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useProfile } from '@/hooks/useProfile';
import { useDefinitions } from '@/hooks/useDefinitions';
import { RankSection } from '@/components/progress/RankSection';
import { PursuitGrid } from '@/components/progress/PursuitGrid';
import { CharacterSidebar } from '@/components/progress/CharacterSidebar';
import { MilestoneSection } from '@/components/progress/MilestoneSection';
import { PathfinderSection } from '@/components/progress/PathfinderSection';
import { RaidSection } from '@/components/progress/RaidSection';
import { ITEM_CATEGORY_QUEST_STEP } from '@/data/constants';
import { ProgressItem, ProgressObjective } from '@/services/profile/types';

// Bucket Hash for Quests (contains both Bounties and Quests)
const BUCKET_QUESTS = 1345459588; 

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
            item.bucketHash === BUCKET_QUESTS
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

            const isQuestStep = def.itemCategoryHashes?.includes(ITEM_CATEGORY_QUEST_STEP);
            const isQuestLine = def.objectives?.questlineItemHash;
            const isQuestTrait = def.traitHashes?.includes(1861210184);
            const isBountyTrait = def.traitHashes?.includes(201433599);

            if (isQuestStep || isQuestLine || isQuestTrait) {
                result.quests.push(toProgressItem(item, def, 'Quest'));
            } else if (isBountyTrait) {
                result.bounties.push(toProgressItem(item, def, 'Bounty'));
            } else {
                result.bounties.push(toProgressItem(item, def, 'Bounty'));
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
                    <span className="font-bold text-xl tracking-tight text-white">GuardianNexus</span>
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
                                        {/* Ranks */}
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <RankSection characterId={selectedCharacterId} />
                                        </div>

                                        {/* Milestones & Pathfinder */}
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-600 delay-100">
                                            <MilestoneSection characterId={selectedCharacterId} />
                                            <PathfinderSection characterId={selectedCharacterId} />
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
                                            title="Bounties" 
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
