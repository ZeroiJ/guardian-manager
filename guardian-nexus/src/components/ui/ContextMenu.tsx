import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../utils/cn';

interface ContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, children, className }) => {
    const ref = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleScroll = () => onClose(); // Close on scroll
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('scroll', handleScroll, true);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('scroll', handleScroll, true);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [onClose]);

    // Portal to body to avoid z-index issues
    return createPortal(
        <div
            ref={ref}
            className={cn(
                "fixed z-[9999] min-w-[180px] bg-[#1a1a1a] border border-white/10 rounded shadow-xl py-1 text-sm text-[#e8e9ed]",
                "flex flex-col animate-in fade-in zoom-in-95 duration-100",
                className
            )}
            style={{ 
                top: Math.min(y, window.innerHeight - 300), // Prevent going off bottom
                left: Math.min(x, window.innerWidth - 200) // Prevent going off right
            }}
            onContextMenu={(e) => e.preventDefault()} // Prevent native menu
        >
            {children}
        </div>,
        document.body
    );
};

interface ContextMenuItemProps {
    icon?: React.ReactNode;
    label: string;
    shortcut?: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
    className?: string;
}

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ icon, label, shortcut, onClick, danger, disabled, className }) => {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (!disabled) onClick();
            }}
            disabled={disabled}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 w-full text-left transition-colors",
                "hover:bg-[#292929]",
                danger ? "text-red-400 hover:text-red-300" : "text-gray-200",
                disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
                className
            )}
        >
            {icon && <span className="w-4 h-4 flex items-center justify-center">{icon}</span>}
            <span className="flex-1">{label}</span>
            {shortcut && <span className="text-xs text-gray-500 font-mono ml-2">{shortcut}</span>}
        </button>
    );
};

export const ContextMenuSeparator = () => <div className="h-px bg-white/10 my-1 mx-2" />;
