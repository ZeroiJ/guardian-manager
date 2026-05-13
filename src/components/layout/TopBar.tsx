import { Link } from 'react-router-dom';
import { Navigation } from '../Navigation';
import { ReactNode } from 'react';

interface TopBarProps {
    centerContent?: ReactNode;
    rightContent?: ReactNode;
}

export function TopBar({ centerContent, rightContent }: TopBarProps) {
    return (
        <div className="sticky top-0 z-50 flex h-12 min-w-0 flex-shrink-0 items-center gap-4 border-b border-void-border bg-black px-4">
            <div className="flex min-w-0 flex-1 basis-0 items-center gap-4 overflow-hidden">
                <Link
                    to="/"
                    className="shrink-0 font-rajdhani text-xl font-bold uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-80"
                >
                    GM
                </Link>
                <Navigation />
            </div>

            <div className="flex min-w-0 max-w-xl flex-1 items-center justify-center px-4">
                {centerContent}
            </div>

            <div className="flex shrink-0 items-center gap-4 text-sm text-gray-400">
                {rightContent}
                <div className="size-6 rounded-full border border-white/10 bg-gradient-to-tr from-[#f5dc56] to-[#f5dc56]/50" />
            </div>
        </div>
    );
}
