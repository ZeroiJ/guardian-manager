import React, { useMemo } from 'react';
import { DestinyProgression, DestinyProgressionDefinition } from 'bungie-api-ts/destiny2';
import { cn } from '@/lib/utils';
import { BungieImage } from '@/components/ui/BungieImage';

interface RankCardProps {
    progression: DestinyProgression;
    definition: DestinyProgressionDefinition;
}

export function RankCard({ progression, definition }: RankCardProps) {
    const {
        currentProgress,
        level,
        progressToNextLevel,
        nextLevelAt,
        currentResetCount
    } = progression;

    const step = definition.steps[Math.min(level, definition.steps.length - 1)];
    const stepName = step.stepName;
    const rankIcon = definition.rankIcon; // Or step icon? DIM uses definition.rankIcon usually.

    // Calculate Totals for Prestige Ring
    const totalPointsInRank = useMemo(() => {
        return definition.steps.reduce((acc, s) => acc + s.progressTotal, 0);
    }, [definition]);
    
    // Percentages
    const levelPercent = nextLevelAt > 0 ? (progressToNextLevel / nextLevelAt) * 100 : 100;
    const totalPercent = totalPointsInRank > 0 ? (currentProgress / totalPointsInRank) * 100 : 0;

    // SVG Geometry
    const size = 54;
    const center = size / 2;
    const innerRadius = 22.5;
    const outerRadius = 25.5;
    const innerCircumference = 2 * Math.PI * innerRadius;
    const outerCircumference = 2 * Math.PI * outerRadius;

    // Stroke Color from Definition (or fallback)
    const color = definition.color 
        ? `rgb(${definition.color.red}, ${definition.color.green}, ${definition.color.blue})`
        : '#e2e8f0'; // slate-200

    return (
        <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-900/50 hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-700/50 group">
            {/* Rank Icon + Progress Rings */}
            <div className="relative w-[54px] h-[54px] flex-shrink-0">
                <svg viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90 w-full h-full">
                    {/* Background Circles */}
                    <circle cx={center} cy={center} r={outerRadius} fill="none" stroke="#333" strokeWidth={3} />
                    <circle cx={center} cy={center} r={innerRadius} fill="none" stroke="#222" strokeWidth={3} />
                    
                    {/* Inner Ring (Level Progress) */}
                    <circle 
                        cx={center} 
                        cy={center} 
                        r={innerRadius} 
                        fill="none" 
                        stroke={color} 
                        strokeWidth={3} 
                        strokeDasharray={innerCircumference}
                        strokeDashoffset={innerCircumference - (levelPercent / 100) * innerCircumference}
                        className="transition-all duration-500 ease-out"
                    />

                    {/* Outer Ring (Prestige Progress) */}
                    {currentResetCount !== undefined && (
                        <circle 
                            cx={center} 
                            cy={center} 
                            r={outerRadius} 
                            fill="none" 
                            stroke={color} 
                            strokeWidth={3} 
                            opacity={0.5}
                            strokeDasharray={outerCircumference}
                            strokeDashoffset={outerCircumference - (totalPercent / 100) * outerCircumference}
                             className="transition-all duration-500 ease-out"
                        />
                    )}
                </svg>
                
                {/* Center Icon */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     {rankIcon && (
                        <BungieImage 
                            src={rankIcon} 
                            className="w-10 h-10 object-contain" 
                            alt={stepName}
                        />
                     )}
                </div>
                
                {/* Reset Count Badge */}
                {currentResetCount > 0 && (
                    <div className="absolute -bottom-1 -right-1 bg-black text-white text-[10px] font-bold px-1 rounded border border-gray-700">
                        {currentResetCount}
                    </div>
                )}
            </div>

            {/* Text Details */}
            <div className="flex flex-col min-w-0">
                <div className="text-sm font-bold text-gray-200 truncate group-hover:text-white transition-colors">
                    {definition.displayProperties.name}
                </div>
                <div className="text-xs text-[#f5dc56] font-medium truncate">
                    {stepName} <span className="text-gray-500">({level + 1})</span>
                </div>
                <div className="text-xs text-gray-400">
                    {progressToNextLevel.toLocaleString()} / {nextLevelAt.toLocaleString()}
                </div>
            </div>
        </div>
    );
}
