import React from 'react';
import { useDrop } from 'react-dnd';
import { DRAG_TYPE } from './DraggableInventoryItem';
import { cn } from '../../lib/utils';

interface DroppableBucketProps {
    id: string; // The target ID (e.g. 'vault', '123456', '123456_1498876634')
    children: React.ReactNode;
    className?: string;
    onDrop: (item: any, sourceId: string, targetId: string) => void;
    accepts?: string[]; // Optional: restrict drop types if needed
}

export const DroppableBucket: React.FC<DroppableBucketProps> = ({ id, children, className, onDrop }) => {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: DRAG_TYPE,
        drop: (draggedItem: any, monitor) => {
            if (monitor.didDrop()) return; // Already handled by nested drop target

            // Invoke the callback
            onDrop(draggedItem.item, draggedItem.owner, id);
        },
        collect: (monitor) => ({
            isOver: monitor.isOver({ shallow: true }), // Only trigger if directly over THIS component, not parent
            canDrop: monitor.canDrop(),
        }),
    }), [id, onDrop]);

    // Visual feedback logic
    const isActive = canDrop && isOver;

    return (
        <div
            ref={drop}
            className={cn(
                className,
                "relative transition-colors duration-150",
                isActive && "bg-yellow-500/10 ring-2 ring-inset ring-yellow-500/50 z-10"
            )}
        >
            {children}

            {/* Optional Overlay for clearer feedback */}
            {isActive && (
                <div className="absolute inset-0 bg-yellow-400/5 pointer-events-none animate-pulse rounded-sm" />
            )}
        </div>
    );
};
