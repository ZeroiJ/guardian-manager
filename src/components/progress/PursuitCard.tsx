import React, { useState } from 'react';
import { GuardianItem } from '@/services/profile/types';
import { BungieImage } from '@/components/ui/BungieImage';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';

interface PursuitCardProps {
    item: GuardianItem;
    definition: any; // DestinyInventoryItemDefinition
    onClick?: () => void;
}

export function PursuitCard({ item, definition, onClick }: PursuitCardProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const objectives = item.objectives?.objectives || [];
    // Just grab the first objective for the progress bar for now
    const firstObjective = objectives[0];
    
    const progress = firstObjective?.progress || 0;
    const total = firstObjective?.completionValue || 100;
    const percent = Math.min(100, (progress / total) * 100);
    const isComplete = firstObjective?.complete;
    
    // Check if tracked
    const isTracked = (item.state & 2) !== 0; // ItemState.Tracked = 2

    // Expiration Logic
    const expirationDate = item.expirationDate ? new Date(item.expirationDate) : null;
    const now = new Date();
    const isExpired = expirationDate && expirationDate < now;
    
    let expirationLabel = '';
    let expirationColor = 'text-gray-400';

    if (expirationDate && !isExpired) {
        const diffMs = expirationDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        if (diffHours < 1) {
            expirationLabel = '<1h';
            expirationColor = 'text-red-500';
        } else if (diffHours < 24) {
            expirationLabel = `${Math.floor(diffHours)}h`;
            expirationColor = 'text-orange-400';
        } else {
            expirationLabel = `${Math.floor(diffHours / 24)}d`;
        }
    }

    return (
        <div 
            className={cn(
                "relative group w-[72px] h-[72px] bg-gray-900 border overflow-visible cursor-pointer transition-all",
                isTracked ? "border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.3)]" : "border-gray-700 hover:border-gray-500",
                isComplete && "border-yellow-500",
                isExpired && "opacity-50 grayscale"
            )}
            onClick={onClick}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
             <BungieImage 
                src={definition?.displayProperties?.icon} 
                className={cn("w-full h-full object-cover", isComplete && "opacity-80")} 
            />
             
             {/* Tracked Indicator (Top Right Corner) */}
             {isTracked && (
                 <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 skew-x-12 transform translate-x-1 -translate-y-1 z-10" />
             )}

             {/* Complete Indicator */}
             {isComplete && (
                 <div className="absolute inset-0 border-2 border-yellow-500/50 pointer-events-none z-10" />
             )}

             {/* Expiration Badge */}
             {expirationLabel && !isComplete && (
                 <div className="absolute top-0.5 right-0.5 bg-black/80 rounded px-1 flex items-center gap-0.5 z-10">
                     <Clock className={cn("w-2.5 h-2.5", expirationColor)} />
                     <span className={cn("text-[9px] font-mono leading-none", expirationColor)}>
                        {expirationLabel}
                     </span>
                 </div>
             )}

             {/* Progress Bar (Bottom) */}
             {!isComplete && objectives.length > 0 && (
                 <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gray-800/80 z-10">
                     <div 
                        className="h-full bg-green-500" 
                        style={{ width: `${percent}%` }}
                     />
                 </div>
             )}
             
             {/* Tooltip */}
             {showTooltip && (
                 <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 z-50 pointer-events-none">
                     <div className="bg-[#1a1a1a] border border-gray-600 shadow-2xl rounded-sm p-3 text-left">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-2 border-b border-gray-700 pb-2">
                            <div className="w-8 h-8 flex-shrink-0">
                                <BungieImage src={definition?.displayProperties?.icon} className="w-full h-full" />
                            </div>
                            <div>
                                <div className="font-bold text-sm text-gray-100 leading-tight">
                                    {definition?.displayProperties?.name}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                    {definition?.itemTypeDisplayName}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        {definition?.displayProperties?.description && (
                            <div className="text-xs text-gray-400 italic mb-3">
                                {definition.displayProperties.description}
                            </div>
                        )}

                        {/* Objectives */}
                        <div className="space-y-1.5">
                            {objectives.map((obj: any, idx: number) => {
                                const defObj = definition?.objectives?.objectiveHashes ? 
                                    definition.objectives.objectiveHashes[idx] : null;
                                // We'd need objective definitions to get the text description here properly, 
                                // but for now let's use what we can or just show progress
                                
                                const progress = obj.progress || 0;
                                const total = obj.completionValue || 100;
                                const isObjComplete = obj.complete;
                                
                                return (
                                    <div key={idx} className="text-xs">
                                        <div className="flex justify-between text-gray-300 mb-0.5">
                                            <span>Objective {idx + 1}</span>
                                            <span className={isObjComplete ? "text-yellow-400" : "text-gray-400"}>
                                                {progress} / {total}
                                            </span>
                                        </div>
                                        <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                                            <div 
                                                className={cn("h-full", isObjComplete ? "bg-yellow-500" : "bg-green-500")}
                                                style={{ width: `${Math.min(100, (progress/total)*100)}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Expiration Footer */}
                        {expirationDate && (
                             <div className="mt-3 pt-2 border-t border-gray-700 text-xs flex items-center gap-1.5 text-gray-400">
                                 <Clock className="w-3 h-3" />
                                 <span>Expires: {expirationDate.toLocaleString()}</span>
                             </div>
                        )}
                     </div>
                     {/* Arrow */}
                     <div className="w-3 h-3 bg-[#1a1a1a] border-r border-b border-gray-600 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5"></div>
                 </div>
             )}
        </div>
    );
}
