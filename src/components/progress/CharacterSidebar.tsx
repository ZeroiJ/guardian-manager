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
        <div className="w-20 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-6 gap-4 h-full sticky top-0 overflow-y-auto shrink-0">
            {/* Account Scope (Optional - for Triumphs/Collections later) */}
            <button 
                className={cn(
                    "w-12 h-12 rounded-full bg-gray-800 border-2 flex items-center justify-center transition-all hover:bg-gray-700",
                    selectedCharacterId === 'account' ? "border-[#f5dc56] scale-110 shadow-[0_0_10px_#f5dc56]" : "border-gray-600"
                )}
                onClick={() => onSelect('account')}
                title="Account Wide"
            >
                <User className="w-6 h-6 text-gray-400" />
            </button>

            <div className="w-8 h-px bg-gray-800 my-2" />

            {/* Characters */}
            {sortedCharacters.map((char: any) => {
                const isSelected = selectedCharacterId === char.characterId;
                
                return (
                    <button
                        key={char.characterId}
                        onClick={() => onSelect(char.characterId)}
                        className={cn(
                            "relative group w-12 h-12 rounded-full overflow-hidden border-2 transition-all duration-200",
                            isSelected 
                                ? "border-[#f5dc56] scale-110 shadow-[0_0_15px_rgba(245,220,86,0.3)] z-10" 
                                : "border-gray-600 hover:border-gray-400 hover:scale-105 opacity-80 hover:opacity-100"
                        )}
                        title={`${CLASS_NAMES[char.classType]} (${char.light})`}
                    >
                        <BungieImage 
                            src={char.emblemPath} 
                            className="w-full h-full object-cover" 
                        />
                        
                        {/* Class Icon Overlay (Optional) */}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                        
                        {/* Light Level Badge */}
                        {isSelected && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-black/80 px-1 rounded text-[9px] text-[#f5dc56] font-bold font-rajdhani border border-[#f5dc56]/30 leading-none">
                                {char.light}
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
