import React from 'react';
import { useProfile } from '@/hooks/useProfile';
import { BungieImage } from '@/components/ui/BungieImage';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

const CLASS_NAMES: Record<number, string> = {
    0: 'Titan',
    1: 'Hunter',
    2: 'Warlock'
};

interface CharacterSidebarProps {
    selectedCharacterId: string | null;
    onSelect: (characterId: string) => void;
}

export function CharacterSidebar({ selectedCharacterId, onSelect }: CharacterSidebarProps) {
    const { profile } = useProfile();
    const characters = profile?.characters || {};

    // Sort characters by last played (usually order in object implies creation, let's sort by dateLastPlayed if available)
    const sortedCharacters = Object.values(characters).sort((a: any, b: any) => {
        return new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime();
    });

    return (
        <div className="w-[200px] bg-gray-950 border-r border-gray-800 flex flex-col py-6 gap-2 h-full sticky top-0 overflow-y-auto shrink-0 px-3">
            {/* Account Scope (Optional - for Triumphs/Collections later) */}
            <button
                className={cn(
                    "w-full h-16 rounded-md bg-gray-800 border flex items-center justify-center transition-all hover:bg-gray-700 mb-4",
                    selectedCharacterId === 'account' ? "border-[#f5dc56] shadow-[0_0_10px_rgba(245,220,86,0.3)]" : "border-gray-600"
                )}
                onClick={() => onSelect('account')}
                title="Account Wide"
            >
                <div className="flex items-center gap-3">
                    <User className="w-6 h-6 text-gray-400" />
                    <span className="font-rajdhani font-bold text-gray-300">Account Wide</span>
                </div>
            </button>

            <div className="w-full h-px bg-gray-800 mb-4" />

            {/* Characters */}
            {sortedCharacters.map((char: any) => {
                const isSelected = selectedCharacterId === char.characterId;

                return (
                    <button
                        key={char.characterId}
                        onClick={() => onSelect(char.characterId)}
                        className={cn(
                            "relative group w-full h-16 rounded-md overflow-hidden border transition-all duration-200 text-left",
                            isSelected
                                ? "border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)] z-10"
                                : "border-gray-700 hover:border-gray-500 opacity-80 hover:opacity-100"
                        )}
                    >
                        {/* Background Image */}
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(https://www.bungie.net${char.emblemBackgroundPath})` }}
                        />

                        {/* Gradient Overlay for Text Readability */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

                        {/* Content */}
                        <div className="relative z-10 h-full flex flex-col justify-center px-4">
                            <span className={cn(
                                "font-rajdhani font-bold text-lg leading-none",
                                isSelected ? "text-[#f5dc56]" : "text-gray-200"
                            )}>
                                {CLASS_NAMES[char.classType]}
                            </span>
                            <span className="font-rajdhani text-2xl font-light text-[#f5dc56] leading-none mt-1">
                                {char.light}
                            </span>
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                );
            })}
        </div>
    );
}
