import React, { useMemo, useState } from 'react';
import { Navigation } from '@/components/Navigation';
import { useProfile } from '@/hooks/useProfile';
import { useDefinitions } from '@/hooks/useDefinitions';
import { RankSection } from '@/components/progress/RankSection';
import { PursuitGrid } from '@/components/progress/PursuitGrid';
import { BungieImage } from '@/components/ui/BungieImage';
import { cn } from '@/lib/utils';
import { ITEM_CATEGORY_QUEST_STEP } from '@/data/constants';

// Bucket Hash for Quests (contains both Bounties and Quests)
const BUCKET_QUESTS = 1345459588; 

const CLASS_NAMES: Record<number, string> = {
    0: 'Titan',
    1: 'Hunter',
    2: 'Warlock'
};

export default function Progress() {
    const { profile, loading: profileLoading, error: profileError } = useProfile();
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

    // Set initial character
    React.useEffect(() => {
        if (!selectedCharacterId && profile?.characters) {
            const charIds = Object.keys(profile.characters);
            if (charIds.length > 0) {
                // Try to find last played? Or just first.
                // Profile characters are usually unsorted keys, but let's just pick one.
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

    // 4. Categorize Items
    const { bounties, quests, items } = useMemo(() => {
        const result = { bounties: [], quests: [], items: [] };
        if (defsLoading || !definitions || characterItems.length === 0) return result;

        const allItems = [];

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

        // Categorize
        allItems.sort(sortPursuits).forEach(({ item, def }) => {
            // DIM Logic simplified
            // Check for objectives
            const hasObjectives = item.objectives?.objectives?.length > 0;
            
            // Check categorization
            // Some "Items" are just quest steps with no objectives (rare) or weird items.
            // DIM checks: if (!objectives || length==0 || sockets) => Items.
            
            // For now, if no objectives, put in Items.
            if (!hasObjectives) {
                 result.items.push(item);
                 return;
            }

            // If it has objectives, check if it's a Quest Step or Bounty
            // Check category hashes on definition
            const isQuestStep = def.itemCategoryHashes?.includes(ITEM_CATEGORY_QUEST_STEP);
            const isQuestLine = def.objectives?.questlineItemHash;
            
            // Also check Trait hashes if available?
            // "InventoryFilteringQuest" = 1861210184
            // "InventoryFilteringBounty" = 201433599
            
            const isQuestTrait = def.traitHashes?.includes(1861210184);
            const isBountyTrait = def.traitHashes?.includes(201433599);

            if (isQuestStep || isQuestLine || isQuestTrait) {
                result.quests.push(item);
            } else if (isBountyTrait) {
                result.bounties.push(item);
            } else {
                // Fallback: If it's in Quests bucket but not explicitly Quest/Bounty trait...
                // Usually bounties have expiration.
                // Bounties are usually green/blue rarity?
                // Default to Bounty if it has objectives and isn't a Quest?
                // Or maybe Quest if it's high value?
                // Let's default to Bounty for now as they are more common.
                result.bounties.push(item);
            }
        });
        
        return result;
    }, [characterItems, definitions, defsLoading]);

    const isLoading = profileLoading || (itemHashes.length > 0 && defsLoading);
    const characters = profile?.characters || {};

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
    
    // Character Tabs Render Helper
    const renderCharacterTabs = () => (
        <div className="flex gap-4 border-b border-gray-800 pb-4 overflow-x-auto">
            {Object.entries(characters).map(([id, char]: [string, any]) => (
                <button
                    key={id}
                    onClick={() => setSelectedCharacterId(id)}
                    className={cn(
                        "flex items-center gap-3 p-2 pr-4 rounded transition-colors border min-w-[160px]",
                        selectedCharacterId === id 
                            ? "bg-gray-800 border-gray-600" 
                            : "bg-transparent border-transparent hover:bg-gray-900"
                    )}
                >
                    <div className="w-10 h-10 relative bg-gray-700 rounded-sm overflow-hidden">
                         {char.emblemPath && <BungieImage src={char.emblemPath} className="w-full h-full object-cover" />}
                    </div>
                    <div className="text-left flex flex-col">
                        <span className="text-sm font-bold leading-tight text-gray-200">
                            {CLASS_NAMES[char.classType] || 'Guardian'}
                        </span>
                        <span className="text-xs text-[#f5dc56] leading-tight font-rajdhani font-semibold">
                            {char.light} Light
                        </span>
                    </div>
                </button>
            ))}
        </div>
    );

    return (
        <div className="h-screen bg-black text-white font-sans flex flex-col overflow-y-auto selection:bg-white selection:text-black scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
            {/* Top Bar */}
            <div className="sticky top-0 h-12 bg-black border-b border-void-border flex items-center px-4 justify-between flex-shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <span className="font-bold text-xl tracking-tight text-white">GuardianNexus</span>
                    <Navigation />
                </div>
            </div>

            <div className="p-8 max-w-7xl mx-auto w-full space-y-8 pb-20">
                {/* Character Select */}
                {Object.keys(characters).length > 0 && renderCharacterTabs()}

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-32 space-y-4">
                         <div className="animate-pulse text-[#f5dc56] font-rajdhani text-2xl font-bold tracking-widest">
                             CONTACTING DESTINY SERVERS...
                         </div>
                         <div className="text-gray-500 text-sm">Synchronizing Progress Data</div>
                    </div>
                ) : (
                    <>
                        {selectedCharacterId && (
                            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <RankSection characterId={selectedCharacterId} />
                            </div>
                        )}
                        
                        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
                             {bounties.length > 0 && (
                                 <PursuitGrid 
                                    title="Bounties" 
                                    items={bounties} 
                                    definitions={definitions} 
                                 />
                             )}
                             
                             {quests.length > 0 && (
                                 <PursuitGrid 
                                    title="Quests" 
                                    items={quests} 
                                    definitions={definitions} 
                                 />
                             )}
                             
                             {items.length > 0 && (
                                 <PursuitGrid 
                                    title="Items" 
                                    items={items} 
                                    definitions={definitions} 
                                 />
                             )}
                             
                             {bounties.length === 0 && quests.length === 0 && items.length === 0 && (
                                 <div className="text-gray-500 italic py-20 text-center border border-dashed border-gray-800 rounded-lg">
                                     No active pursuits found for this character.
                                     <br/>
                                     <span className="text-xs">Go pick up some bounties, Guardian!</span>
                                 </div>
                             )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
