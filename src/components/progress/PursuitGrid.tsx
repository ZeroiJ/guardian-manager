import React from 'react';
import { GuardianItem } from '@/services/profile/types';
import { PursuitCard } from './PursuitCard';

interface PursuitGridProps {
    items: GuardianItem[];
    definitions: Record<number, any>;
    title: string;
}

export function PursuitGrid({ items, definitions, title }: PursuitGridProps) {
    if (items.length === 0) return null;

    return (
        <section className="space-y-4">
            <h2 className="text-2xl font-rajdhani font-bold text-[#f5dc56] border-b border-white/10 pb-2">
                {title} <span className="text-gray-500 text-lg">({items.length})</span>
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
                {items.map(item => (
                    <PursuitCard 
                        key={item.itemInstanceId || item.itemHash} 
                        item={item} 
                        definition={definitions[item.itemHash]} 
                    />
                ))}
            </div>
        </section>
    );
}
