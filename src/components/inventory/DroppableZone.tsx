import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '../../utils/cn';

interface DroppableZoneProps {
    id: string;
    children: React.ReactNode;
    className?: string;
    data?: any;
}

export function DroppableZone({ id, children, className, data }: DroppableZoneProps) {
    const { setNodeRef, isOver } = useDroppable({
        id,
        data
    });

    return (
        <div ref={setNodeRef} className={cn(className, "relative")}>
            {children}
            {isOver && (
                <div className="absolute inset-0 bg-[#f5dc56]/10 pointer-events-none z-50 border-2 border-[#f5dc56]" />
            )}
        </div>
    );
}
