import React from 'react';
import { ProgressItem } from '@/services/profile/types';
import { PursuitCard } from './PursuitCard';

interface PursuitGridProps {
    title: string;
    items: ProgressItem[];
    // definitions are no longer needed as ProgressItem is fully hydrated
}

export function PursuitGrid({ title, items }: PursuitGridProps) {
    return (
        <div className="flex flex-col gap-4">
            <h2 className="text-xl font-bold text-gray-200 border-b border-gray-800 pb-2">
                {title} <span className="text-gray-500 text-sm ml-2">({items.length})</span>
            </h2>
            
            <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                    <PursuitCard 
                        key={item.instanceId || item.hash} 
                        item={item} 
                    />
                ))}
            </div>
        </div>
    );
}
