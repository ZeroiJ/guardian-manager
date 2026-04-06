import { cn } from '../../lib/utils';

export const FILTER_CATEGORIES = [
    { key: 'all', label: 'All' },
    { key: 'weapons', label: 'Weapons' },
    { key: 'armor', label: 'Armor' },
    { key: 'ghosts', label: 'Ghosts' },
] as const;

export const FILTER_BUCKET_HASHES: Record<string, number[]> = {
    weapons: [1498876634, 2465295065, 953998645], // Kinetic, Energy, Power
    armor: [3448274436, 3551918588, 14239492, 20886954, 158489786], // Helmet, Gauntlets, Chest, Legs, Class Item
    ghosts: [4023201246, 284967800, 375726501], // Ghosts, Ships, Sparrows
};

interface FilterPillsProps {
    activeFilter: string;
    onFilterChange: (filter: string) => void;
    className?: string;
}

export function FilterPills({ activeFilter, onFilterChange, className }: FilterPillsProps) {
    return (
        <div className={cn('flex items-center gap-2', className)}>
            {FILTER_CATEGORIES.map(({ key, label }) => {
                const isActive = activeFilter === key;
                return (
                    <button
                        key={key}
                        type="button"
                        onClick={() => onFilterChange(key)}
                        className={cn(
                            'px-3 py-1 rounded-sm text-xs font-bold uppercase tracking-widest font-rajdhani',
                            'border transition-all cursor-pointer',
                            isActive
                                ? 'border-void/50 bg-void/10 text-void-text'
                                : 'border-void-border bg-void-surface text-void-text-secondary hover:border-void-border-light hover:text-void-text',
                        )}
                        aria-pressed={isActive}
                    >
                        {label}
                    </button>
                );
            })}
        </div>
    );
}