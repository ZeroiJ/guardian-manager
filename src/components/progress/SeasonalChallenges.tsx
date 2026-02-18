import React, { useState } from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { BungieImage } from '@/components/ui/BungieImage';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react';

interface ChallengeNodeProps {
    nodeHash: number;
    depth?: number;
}

function ChallengeNode({ nodeHash, depth = 0 }: ChallengeNodeProps) {
    const { definitions, loading } = useDefinitions('DestinyPresentationNodeDefinition', [nodeHash]);
    const nodeDef = definitions?.[nodeHash];

    // Get child nodes (Weeks)
    const childNodeHashes = nodeDef?.children?.presentationNodes?.map((c: any) => c.presentationNodeHash) || [];

    // Get child records (Challenges)
    const childRecordHashes = nodeDef?.children?.records?.map((r: any) => r.recordHash) || [];

    // Load records definitions
    const { definitions: recordDefs } = useDefinitions('DestinyRecordDefinition', childRecordHashes);

    const [isExpanded, setIsExpanded] = useState(depth < 1);

    const rawProfile = useInventoryStore(state => state.profile);

    if (!nodeDef) return null;

    let completedCount = 0;
    let totalCount = childRecordHashes.length;

    if (totalCount > 0 && recordDefs) {
        childRecordHashes.forEach((hash: number) => {
            const recordComp = rawProfile?.profileRecords?.data?.records?.[hash];
            // If record exists and is NOT objective-incomplete (state & 4)
            if (recordComp && !((recordComp.state || 0) & 4)) {
                completedCount++;
            }
        });
    }

    const toggle = () => setIsExpanded(!isExpanded);

    return (
        <div className={cn("border-l-2 ml-2 pl-4 my-2 transition-all", isExpanded ? "border-gray-700" : "border-transparent")}>
            <button
                onClick={toggle}
                className="flex items-center gap-2 w-full text-left hover:bg-gray-800/50 p-2 rounded group"
            >
                {childNodeHashes.length > 0 ? (
                    isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
                ) : (
                    <div className="w-4" />
                )}

                {nodeDef.displayProperties?.icon && (
                    <div className="w-8 h-8 relative">
                        <BungieImage src={nodeDef.displayProperties.icon} className="w-full h-full object-contain" />
                    </div>
                )}

                <div className="flex-1">
                    <h4 className={cn("font-rajdhani font-bold", depth === 0 ? "text-lg text-white" : "text-md text-gray-300")}>
                        {nodeDef.displayProperties?.name}
                    </h4>
                    {totalCount > 0 && (
                        <div className="text-xs text-gray-500">
                            {completedCount} / {totalCount} Completed
                        </div>
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="mt-2 pl-2">
                    {/* Render Child Nodes (Weeks) */}
                    {childNodeHashes.map((hash: number) => (
                        <ChallengeNode key={hash} nodeHash={hash} depth={depth + 1} />
                    ))}

                    {/* Render Child Records (Challenges) */}
                    {childRecordHashes.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                            {childRecordHashes.map((hash: number) => (
                                <ChallengeRecord key={hash} recordHash={hash} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ChallengeRecord({ recordHash }: { recordHash: number }) {
    const { definitions } = useDefinitions('DestinyRecordDefinition', [recordHash]);
    const recordDef = definitions?.[recordHash];

    const rawProfile = useInventoryStore(state => state.profile);
    const recordComp = rawProfile?.profileRecords?.data?.records?.[recordHash];

    const state = recordComp?.state || 0;
    const isCompleted = !((state & 4) === 4);
    const isRedeemed = (state & 1) === 1;
    const isInvisible = (state & 16) === 16;

    if (!recordDef || isInvisible || isRedeemed) return null;

    const objectives = recordComp?.objectives || [];

    return (
        <div className={cn(
            "bg-gray-900/40 border rounded p-3 flex gap-3 relative overflow-hidden group hover:bg-gray-800/40 transition-colors",
            isCompleted ? "border-green-900/30 bg-green-900/5" : "border-gray-800"
        )}>
            <div className="w-10 h-10 shrink-0 bg-black/40 rounded flex items-center justify-center border border-gray-800/50">
                <BungieImage src={recordDef.displayProperties?.icon} className="w-full h-full object-contain opacity-80" />
            </div>

            <div className="flex-1 min-w-0 z-10">
                <div className="flex justify-between items-start gap-2">
                    <h5 className={cn("font-bold text-sm leading-tight mb-1 font-rajdhani", isCompleted ? "text-green-400" : "text-gray-200")}>
                        {recordDef.displayProperties?.name}
                    </h5>
                    {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                </div>

                <p className="text-xs text-gray-500 mb-2 line-clamp-2 leading-relaxed">{recordDef.displayProperties?.description}</p>

                <div className="space-y-1.5">
                    {objectives.map((obj: any) => {
                        const percent = obj.completionValue > 0 ? Math.min(100, (obj.progress / obj.completionValue) * 100) : 0;
                        return (
                            <div key={obj.objectiveHash} className="h-1.5 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800/30">
                                <div
                                    className={cn("h-full transition-all duration-500", isCompleted ? "bg-green-600" : "bg-[#f5dc56]")}
                                    style={{ width: `${percent}%` }}
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

export function SeasonalChallenges() {
    const rawProfile = useInventoryStore(state => state.profile);

    // Attempt to get Current Season from profile.seasonHashes
    // This assumes the last one is current.
    const currentSeasonHash = rawProfile?.profile?.data?.seasonHashes?.[(rawProfile.profile.data.seasonHashes?.length || 0) - 1];

    const { definitions: seasonDefs, loading: seasonLoading } = useDefinitions('DestinySeasonDefinition', currentSeasonHash ? [currentSeasonHash] : []);
    const seasonDef = currentSeasonHash ? seasonDefs?.[currentSeasonHash] : null;

    // Get the Challenges Node Hash
    const challengesHash = seasonDef?.seasonalChallengesPresentationNodeHash;

    if (!currentSeasonHash || seasonLoading) return null; // Loading
    if (!challengesHash) return null; // No challenges for this season or definition not loaded yet

    return (
        <div className="mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <h2 className="text-xl font-bold text-gray-200 border-b border-gray-800 pb-2 mb-4">
                Seasonal Challenges
            </h2>
            <div className="bg-gray-950/20 border border-gray-900/50 rounded-lg p-4">
                <ChallengeNode nodeHash={challengesHash} />
            </div>
        </div>
    );
}
