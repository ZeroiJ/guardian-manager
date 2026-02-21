import { X } from 'lucide-react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { CLASS_NAMES } from '@/store/loadoutStore';
import { createPortal } from 'react-dom';

interface CreateLoadoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectCharacter: (characterId: string) => void;
}

export function CreateLoadoutModal({ isOpen, onClose, onSelectCharacter }: CreateLoadoutModalProps) {
    const characters = useInventoryStore((s) => s.characters);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-bold font-rajdhani tracking-widest uppercase text-white">
                        Create Loadout
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-sm transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className="text-sm text-gray-400 mb-6 font-mono">
                        Select a character to snapshot their currently equipped gear, ghost, and subclass.
                    </p>

                    <div className="space-y-3">
                        {Object.values(characters).map((char: any) => {
                            const className = CLASS_NAMES[char.classType] || 'Unknown';
                            return (
                                <button
                                    key={char.characterId}
                                    onClick={() => {
                                        onSelectCharacter(char.characterId);
                                        onClose();
                                    }}
                                    className="w-full flex items-center justify-between p-3 rounded-sm border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/30 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-10 h-10 rounded-sm bg-cover bg-center border border-white/10 group-hover:border-white/30 transition-colors"
                                            style={{
                                                backgroundImage: `url(https://www.bungie.net${char.emblemPath})`,
                                            }}
                                        />
                                        <div className="text-left">
                                            <div className="text-sm font-bold text-white font-rajdhani tracking-wider uppercase">
                                                {className}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">
                                                {char.raceName} {char.genderName} ✨ {char.light}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold text-gray-500 font-rajdhani uppercase tracking-widest group-hover:text-white transition-colors">
                                        Select
                                    </div>
                                </button>
                            );
                        })}

                        {characters.length === 0 && (
                            <div className="text-center py-4 text-sm text-gray-500 font-mono">
                                No characters found. Please sign in or equip items first.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}
