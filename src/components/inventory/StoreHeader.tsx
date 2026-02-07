import React from 'react';
import { bungieNetPath } from '../ui/BungieImage';

interface StoreHeaderProps {
    storeId: string;
    character?: any;
    vaultCount?: number;
    vaultMax?: number;
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({ storeId, character, vaultCount, vaultMax = 600 }) => {
    // 1. Vault Header
    if (storeId === 'vault') {
        return (
            <div className="flex-shrink-0 w-[300px] md:w-[400px] flex-1 min-w-[300px] bg-dim-surface border border-dim-border-light flex flex-col relative select-none">
                {/* Header (Matches Character Emblem: h-[56px]) */}
                <div className="h-[56px] flex items-center px-4 bg-dim-bg border-b border-dim-border justify-between flex-shrink-0 shadow-md relative z-20">
                    <div className="flex flex-col leading-tight">
                        <span className="font-bold text-xl text-dim-text tracking-wide">Vault</span>
                        <span className="text-[10px] text-dim-text-muted font-medium uppercase tracking-wider">Storage</span>
                    </div>
                    <div className="text-2xl font-bold text-dim-text font-mono tracking-tighter font-tabular">
                        {vaultCount} <span className="text-dim-text-muted text-sm">/ {vaultMax}</span>
                    </div>
                </div>

                {/* Stats Block Placeholder (Matches Character Stats: ~102px) */}
                <div className="flex flex-col bg-dim-bg border-b border-dim-border p-3 gap-1 z-10 relative shadow-sm h-[103px] justify-center">
                    {/* Currency Display */}
                    <div className="flex items-center justify-between px-1 py-0.5">
                        <span className="text-[10px] uppercase font-semibold text-dim-text-muted">Glimmer</span>
                        <span className="text-xs font-mono text-power-gold font-tabular">250,000</span>
                    </div>
                    <div className="flex items-center justify-between px-1 py-0.5">
                        <span className="text-[10px] uppercase font-semibold text-dim-text-muted">Shards</span>
                        <span className="text-xs font-mono text-void font-tabular">42,000</span>
                    </div>
                    <div className="flex items-center justify-between px-1 py-0.5">
                        <span className="text-[10px] uppercase font-semibold text-dim-text-muted">Dust</span>
                        <span className="text-xs font-mono text-arc font-tabular">15,400</span>
                    </div>
                </div>
            </div>
        );
    }

    // 2. Character Header
    if (!character) return null;

    const { light, raceType, classType, emblemBackgroundPath, stats, artifactPower } = character;
    const raceNames: Record<number, string> = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
    const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
    const classNameText = classNames[classType];
    const basePower = light - (artifactPower || 0);

    return (
        <div className="flex-shrink-0 w-[260px] bg-dim-surface border border-dim-border-light flex flex-col select-none relative">
            {/* Header / Emblem - Clean Overlay Style */}
            <div
                className="relative h-[56px] w-full bg-cover bg-center flex items-center justify-between px-4 bg-no-repeat z-20 shadow-md"
                style={{ backgroundImage: `url(${bungieNetPath(emblemBackgroundPath)})` }}
            >
                {/* Solid Dark Overlay (not gradient) */}
                <div className="absolute inset-0 bg-black/70" />

                {/* Left: Class + Race */}
                <div className="relative z-10 flex flex-col leading-tight">
                    <span className="font-semibold text-lg text-gray-200 uppercase tracking-wide">{classNameText}</span>
                    <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider">{raceNames[raceType]}</span>
                </div>

                {/* Right: POWER LEVEL IS KING */}
                <div className="relative z-10 flex flex-col items-end leading-tight">
                    <div className="text-2xl font-bold text-white drop-shadow-lg font-mono tracking-tight font-tabular">
                        {light}
                    </div>
                    {/* Sub Power: Base + Artifact */}
                    <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1 font-tabular">
                        <span>{basePower}</span>
                        <span className="text-arc">+{artifactPower}</span>
                    </div>
                </div>
            </div>

            {/* Stats Row - Gray Bars, Gold only for T10 */}
            <div className="flex flex-col bg-dim-bg border-b border-dim-border p-3 gap-1 z-10 relative shadow-sm h-[103px]">
                {[
                    { label: 'Mobility', hash: 2996146975 },
                    { label: 'Resilience', hash: 392767087 },
                    { label: 'Recovery', hash: 1943323491 },
                    { label: 'Discipline', hash: 1735777505 },
                    { label: 'Intellect', hash: 144602215 },
                    { label: 'Strength', hash: 4244567218 },
                ].map((statConfig) => {
                    const value = stats[statConfig.hash] || 0;
                    const isTierMax = value >= 100; // Tier 10+

                    return (
                        <div key={statConfig.label} className="flex items-center h-[14px]">
                            {/* Label */}
                            <span className="w-16 text-[10px] text-dim-text-muted font-medium uppercase tracking-wide text-right mr-2">
                                {statConfig.label}
                            </span>

                            {/* Value */}
                            <span className={`w-6 text-[11px] font-bold font-mono text-right mr-2 font-tabular ${isTierMax ? 'text-masterwork' : 'text-dim-text'}`}>
                                {value}
                            </span>

                            {/* Bar - 4px height, Gray default, Gold for T10 */}
                            <div className="flex-1 h-1 bg-dim-border relative rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${isTierMax ? 'bg-masterwork' : 'bg-gray-500'}`}
                                    style={{ width: `${Math.min(100, value)}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

