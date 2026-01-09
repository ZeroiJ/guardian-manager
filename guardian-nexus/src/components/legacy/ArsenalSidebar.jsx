import React from 'react';
import { Sword, Shield, Ghost, Users, Trophy } from 'lucide-react';

export function ArsenalSidebar({ selectedCategory, onCategoryChange }) {
    const categories = [
        { id: 'weapons', label: 'Weapons', icon: Sword },
        { id: 'armor', label: 'Armor', icon: Shield },
        { id: 'ghosts', label: 'Ghosts', icon: Ghost },
        { id: 'clan', label: 'Clan', icon: Users },
        { id: 'triumphs', label: 'Triumphs', icon: Trophy },
    ];

    return (
        <div className="space-y-2 sticky top-24">
            {categories.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory === category.id;

                return (
                    <button
                        key={category.id}
                        onClick={() => onCategoryChange(category.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isSelected
                                ? 'bg-[#4a9eff]/10 text-[#4a9eff] border border-[#4a9eff]/20'
                                : 'text-[#9199a8] hover:bg-[#252a38]/50 hover:text-[#e8e9ed]'
                            }`}
                    >
                        <Icon className="size-5" />
                        <span className="font-medium">{category.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
