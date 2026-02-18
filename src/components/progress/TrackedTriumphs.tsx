import React from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useDefinitions } from '@/hooks/useDefinitions';
import { BungieImage } from '@/components/ui/BungieImage';
import { cn } from '@/lib/utils';

export function TrackedTriumphs() {
    const rawProfile = useInventoryStore(state => state.profile);
    // Profile-wide tracked record
    const trackedRecordHash = rawProfile?.profileRecords?.data?.trackedRecordHash;

    const { definitions, loading } = useDefinitions('DestinyRecordDefinition', trackedRecordHash ? [trackedRecordHash] : []);

    if (!trackedRecordHash) return null;
    if (loading || !definitions) return null;

    const recordDef = definitions[trackedRecordHash];
    if (!recordDef) return null;

    // Get Record Component State
    const recordComponent = rawProfile?.profileRecords?.data?.records?.[trackedRecordHash];

    // Calculate progress from objectives
    // Note: Record components use `objectives` property, but definition has `objectiveHashes`.
    // The component usually has progress data.
    const objectives = recordComponent?.objectives || [];

    return (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
            <h2 className="text-xl font-bold text-gray-200 border-b border-gray-800 pb-2 mb-4">
                Tracked Triumph
            </h2>

            <div className="bg-gray-900/80 border border-gray-800 rounded-lg p-4 flex flex-col md:flex-row gap-4 items-start">
                <div className="w-16 h-16 shrink-0 bg-gray-950 rounded border border-gray-800 p-1">
                    <BungieImage src={recordDef.displayProperties?.icon} className="w-full h-full object-contain" />
                </div>

                <div className="flex-1 min-w-0 w-full">
                    <h3 className="text-lg font-rajdhani font-bold text-white leading-none mb-1">
                        {recordDef.displayProperties?.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                        {recordDef.displayProperties?.description}
                    </p>

                    {/* Objectives */}
                    <div className="space-y-2">
                        {objectives.length > 0 ? objectives.map((obj: any, idx: number) => {
                            const percent = obj.completionValue > 0 ? Math.min(100, (obj.progress / obj.completionValue) * 100) : 0;
                            const isComplete = obj.complete;

                            return (
                                <div key={obj.objectiveHash} className="space-y-1">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>Objective {idx + 1}</span>
                                        <span>{obj.progress} / {obj.completionValue}</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-950 rounded-full overflow-hidden border border-gray-800">
                                        <div
                                            className={cn("h-full transition-all duration-500 ease-out", isComplete ? "bg-green-500" : "bg-[#f5dc56]")}
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className={cn("text-sm font-bold", ((recordComponent?.state || 0) & 4) ? "text-green-500" : "text-yellow-500")}>
                                {((recordComponent?.state || 0) & 4) ? "Objective Completed" : "In Progress"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
