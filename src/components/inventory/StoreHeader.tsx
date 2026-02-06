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
            <div className="flex-shrink-0 w-[300px] md:w-[400px] flex-1 min-w-[300px] bg-[#11111b] border border-[#333] flex flex-col relative select-none">
                {/* Header (Matches Character Emblem: h-[48px]) */}
                <div className="h-[48px] flex items-center px-4 bg-[#0d0d15] border-b border-white/5 justify-between flex-shrink-0 shadow-md relative z-20">
                    <div className="flex flex-col leading-none">
                        <span className="font-bold text-lg text-[#ccc] tracking-wide">Vault</span>
                        <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Storage</span>
                    </div>
                    <div className="text-xl font-bold text-[#ccc] font-mono tracking-tighter">
                        {vaultCount} <span className="text-[#666] text-sm">/ {vaultMax}</span>
                    </div>
                </div>

                {/* Stats Block Placeholder (Matches Character Stats: ~102px) */}
                <div className="flex flex-col bg-[#0a0a10] border-b border-white/5 p-1 gap-0.5 z-10 relative shadow-sm h-[103px] justify-center">
                    {/* Mock Currency / Info Display to fill space */}
                    <div className="flex items-center justify-between px-2 py-1 opacity-40">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Glimmer</span>
                        <span className="text-xs font-mono text-[#f5dc56]">250,000</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1 opacity-40">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Shards</span>
                        <span className="text-xs font-mono text-purple-400">42,000</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1 opacity-40">
                        <span className="text-[10px] uppercase font-bold text-gray-500">Dust</span>
                        <span className="text-xs font-mono text-blue-400">15,400</span>
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
    // E.g. 1800.125 -> 1800.1
    // Need to safely calculate maxPower if passed in, otherwise default? 
    // For header, we display current light.

    return (
        <div className="flex-shrink-0 w-[240px] bg-[#11111b] border border-[#333] flex flex-col select-none relative">
            {/* Header / Emblem */}
            <div
                className="relative h-[48px] w-full bg-cover bg-center flex items-center justify-between px-2 bg-no-repeat z-20 shadow-md"
                style={{ backgroundImage: `url(${bungieNetPath(emblemBackgroundPath)})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                <div className="relative z-10 flex flex-col leading-none">
                    <span className="font-bold text-lg text-[#f5f5f5] tracking-wide drop-shadow-md">{classNameText}</span>
                    <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wider opacity-80">{raceNames[raceType]}</span>
                </div>
                <div className="relative z-10 flex flex-col items-end leading-none">
                    <div className="text-xl font-bold text-[#f5dc56] drop-shadow-lg font-mono tracking-tighter shadow-black">
                        {light}
                    </div>
                    {/* Sub Power Display */}
                    <div className="text-[9px] text-[#f5dc56]/80 font-mono flex items-center gap-1">
                        <span>{basePower}</span>
                        <span className="text-[#50c8ce]">+{artifactPower}</span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex flex-col bg-[#0a0a10] border-b border-white/5 p-1 gap-0.5 z-10 relative shadow-sm h-[103px]">
                {[
                    { label: 'Health', hash: 392767087 }, // Resilience
                    { label: 'Melee', hash: 4244567218 }, // Strength
                    { label: 'Grenade', hash: 1735777505 }, // Discipline
                    { label: 'Super', hash: 144602215 }, // Intellect
                    { label: 'Class', hash: 1943323491 }, // Recovery
                    { label: 'Weapons', hash: 2996146975 }, // Mobility
                ].map((statConfig) => {
                    const value = stats[statConfig.hash] || 0;
                    const isTierMax = value >= 100;

                    return (
                        <div key={statConfig.label} className="flex items-center h-[14px]">
                            {/* Label */}
                            <span className="w-12 text-[9px] text-gray-400 font-bold uppercase tracking-wider text-right mr-2">{statConfig.label}</span>

                            {/* Value (Hero) */}
                            <span className={`w-6 text-[11px] font-bold font-mono text-right mr-2 ${isTierMax ? 'text-[#f5dc56]' : 'text-white'}`}>
                                {value}
                            </span>

                            {/* Visual Bar (Secondary) */}
                            <div className="flex-1 h-1.5 bg-[#1a1a1a] relative rounded-sm overflow-hidden opacity-80">
                                <div
                                    className={`h-full ${isTierMax ? 'bg-[#f5dc56]' : 'bg-white/40'}`}
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
