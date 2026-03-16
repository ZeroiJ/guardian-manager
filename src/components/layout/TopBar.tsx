import { Link } from 'react-router-dom';
import { Navigation } from '../Navigation';
import { ReactNode } from 'react';

interface TopBarProps {
    centerContent?: ReactNode;
    rightContent?: ReactNode;
}

export function TopBar({ centerContent, rightContent }: TopBarProps) {
    return (
        <div className="sticky top-0 h-12 bg-black border-b border-void-border flex items-center px-4 justify-between flex-shrink-0 z-50">
            <div className="flex items-center gap-4">
                <Link
                    to="/"
                    className="font-bold text-xl tracking-[0.15em] text-white font-rajdhani uppercase hover:opacity-80 transition-opacity"
                >
                    GM
                </Link>
                <Navigation />
            </div>

            <div className="flex-1 max-w-xl px-8 flex items-center justify-center">
                {centerContent}
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400">
                {rightContent}
                <div className="size-6 bg-gradient-to-tr from-[#f5dc56] to-[#f5dc56]/50 rounded-full border border-white/10" />
            </div>
        </div>
    );
}
