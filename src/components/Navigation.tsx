import { Link, useLocation } from 'react-router-dom';
import {
    autoUpdate,
    FloatingPortal,
    flip,
    offset,
    shift,
    useClick,
    useDismiss,
    useFloating,
    useInteractions,
    useRole,
} from '@floating-ui/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { ItemFeedButton } from '@/components/ui/ItemFeedPanel';
import { useFeed } from '@/App';
import { useNavigationFit } from '@/hooks/useNavigationFit';

type SecondaryDef = {
    path: string;
    label: string;
    badge?: 'beta' | 'settings';
};

/** Order matches width estimates in useNavigationFit (highest priority first). */
const SECONDARY_LINKS: SecondaryDef[] = [
    { path: '/progress', label: 'Progress', badge: 'beta' },
    { path: '/organizer', label: 'Organizer' },
    { path: '/vendors', label: 'Vendors' },
    { path: '/collections', label: 'Collections' },
    { path: '/settings', label: 'Settings', badge: 'settings' },
];

export function Navigation() {
    const location = useLocation();
    const { onOpenFeed } = useFeed();
    const { containerRef, visibleSecondaryCount } = useNavigationFit();

    const isActive = (path: string) => location.pathname === path;
    const linkClass = (active: boolean) =>
        `transition-colors whitespace-nowrap ${active ? 'text-white bg-void-surface px-3 py-1 border border-void-border rounded-sm' : 'hover:text-white'}`;

    const visibleSecondary = SECONDARY_LINKS.slice(0, visibleSecondaryCount);
    const overflowSecondary = SECONDARY_LINKS.slice(visibleSecondaryCount);
    const overflowActive = overflowSecondary.some((l) => isActive(l.path));

    const [moreOpen, setMoreOpen] = useState(false);

    const { refs, floatingStyles, context } = useFloating({
        open: moreOpen,
        onOpenChange: setMoreOpen,
        placement: 'bottom-start',
        middleware: [offset(6), flip(), shift({ padding: 8 })],
        whileElementsMounted: autoUpdate,
    });

    const click = useClick(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: 'menu' });
    const { getReferenceProps, getFloatingProps } = useInteractions([
        click,
        dismiss,
        role,
    ]);

    const renderSecondaryLink = (def: SecondaryDef) => (
        <Link
            key={def.path}
            to={def.path}
            className={linkClass(isActive(def.path))}
        >
            {def.badge === 'settings' ? (
                <>⚙ {def.label}</>
            ) : (
                def.label
            )}
            {def.badge === 'beta' && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-[#f5dc56] text-black rounded leading-none align-text-top">
                    BETA
                </span>
            )}
        </Link>
    );

    return (
        <div
            ref={containerRef}
            className="flex min-w-0 flex-1 items-center overflow-hidden"
        >
            <nav className="flex min-w-0 items-center gap-4 text-sm font-medium text-gray-400">
                <ItemFeedButton onClick={onOpenFeed} />
                <Link
                    to="/"
                    className={linkClass(isActive('/'))}
                >
                    Inventory
                </Link>
                <Link
                    to="/loadouts"
                    className={linkClass(
                        isActive('/loadouts') || isActive('/optimizer'),
                    )}
                >
                    Loadouts
                </Link>
                <Link
                    to="/optimizer"
                    className={linkClass(isActive('/optimizer'))}
                >
                    Optimizer
                    <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-[#7af48b] text-black rounded leading-none align-text-top">
                        NEW
                    </span>
                </Link>

                {visibleSecondary.map(renderSecondaryLink)}

                {overflowSecondary.length > 0 && (
                    <>
                        <button
                            type="button"
                            ref={refs.setReference}
                            className={`inline-flex items-center gap-0.5 rounded-sm px-2 py-1 text-sm font-medium transition-colors ${overflowActive ? 'border border-void-border bg-void-surface text-white' : 'text-gray-400 hover:text-white'}`}
                            {...getReferenceProps()}
                        >
                            More
                            <ChevronDown
                                className={`size-4 shrink-0 transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                                aria-hidden
                            />
                        </button>
                        {moreOpen && (
                            <FloatingPortal>
                                <div
                                    ref={refs.setFloating}
                                    style={floatingStyles}
                                    className="z-[100] min-w-[180px] rounded-md border border-white/10 bg-[#121218] py-1 shadow-2xl"
                                    {...getFloatingProps()}
                                >
                                    {overflowSecondary.map((def) => (
                                        <Link
                                            key={def.path}
                                            to={def.path}
                                            className={`flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-white/10 ${isActive(def.path) ? 'text-white' : 'text-gray-300'}`}
                                            onClick={() => setMoreOpen(false)}
                                        >
                                            {def.badge === 'settings' ? (
                                                <>
                                                    <span aria-hidden>⚙</span>
                                                    <span>{def.label}</span>
                                                </>
                                            ) : (
                                                def.label
                                            )}
                                            {def.badge === 'beta' && (
                                                <span className="ml-auto rounded bg-[#f5dc56] px-1.5 py-0.5 text-[10px] font-bold text-black">
                                                    BETA
                                                </span>
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </FloatingPortal>
                        )}
                    </>
                )}
            </nav>
        </div>
    );
}
