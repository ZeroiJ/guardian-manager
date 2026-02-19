/**
 * Loadouts Page — The Hub
 *
 * A clean, centered list of LoadoutCard "Tactical Briefing" cards.
 * No accordion, no inline editing — just the card grid with class filters.
 *
 * Void theme: monochrome chrome, Rajdhani headers, loot-only color.
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    useLoadoutStore,
    ILoadout,
    CLASS_NAMES,
    selectLoadoutsGroupedByClass,
    validateLoadout,
} from '@/store/loadoutStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { applyLoadout } from '@/lib/bungie/equipManager';
import { Navigation } from '@/components/Navigation';
import { LoadoutCard, type EquipState, type LoadoutValidation } from '@/components/loadouts/LoadoutCard';

// ============================================================================
// CLASS FILTER COLORS
// ============================================================================

const CLASS_COLORS: Record<number, { text: string; border: string; bg: string }> = {
    0: { text: 'text-orange-400', border: 'border-orange-400/30', bg: 'bg-orange-400/10' },
    1: { text: 'text-cyan-400', border: 'border-cyan-400/30', bg: 'bg-cyan-400/10' },
    2: { text: 'text-purple-400', border: 'border-purple-400/30', bg: 'bg-purple-400/10' },
};

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Swords size={28} className="text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-300 font-rajdhani tracking-wide uppercase mb-2">
            No Saved Loadouts
        </h2>
        <p className="text-sm text-gray-600 text-center max-w-sm leading-relaxed">
            Head to the{' '}
            <Link to="/" className="text-white underline underline-offset-2 hover:no-underline">
                Inventory
            </Link>{' '}
            page, equip the gear you want, then open the Loadouts sidebar to snapshot your setup.
        </p>
    </div>
);

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Loadouts() {
    // ── Store ──────────────────────────────────────────────
    const loadouts = useLoadoutStore((s) => s.loadouts);
    const deleteLoadout = useLoadoutStore((s) => s.deleteLoadout);
    const updateNotes = useLoadoutStore((s) => s.updateNotes);

    const manifest = useInventoryStore((s) => s.manifest);
    const characters = useInventoryStore((s) => s.characters);
    const allItems = useInventoryStore((s) => s.items);

    // ── Local state ────────────────────────────────────────
    const [equipState, setEquipState] = useState<EquipState>({ status: 'idle' });
    const [filterClass, setFilterClass] = useState<number | null>(null);

    // Reset equip feedback after 5s
    useEffect(() => {
        if (equipState.status === 'success' || equipState.status === 'error') {
            const timer = setTimeout(() => setEquipState({ status: 'idle' }), 5000);
            return () => clearTimeout(timer);
        }
    }, [equipState]);

    // ── Derived data ───────────────────────────────────────
    const grouped = useMemo(() => selectLoadoutsGroupedByClass(loadouts), [loadouts]);
    const availableClasses = useMemo(
        () =>
            Object.keys(grouped)
                .map(Number)
                .filter((c) => c >= 0)
                .sort(),
        [grouped],
    );

    const filteredLoadouts = useMemo(() => {
        if (filterClass === null) return loadouts;
        return loadouts.filter((l) => l.characterClass === filterClass);
    }, [loadouts, filterClass]);

    // Pre-compute validation for all visible loadouts
    const validations = useMemo(() => {
        const map: Record<string, LoadoutValidation> = {};
        for (const loadout of filteredLoadouts) {
            map[loadout.id] = validateLoadout(loadout, allItems);
        }
        return map;
    }, [filteredLoadouts, allItems]);

    // ── Handlers ───────────────────────────────────────────
    const handleEquip = useCallback(
        async (loadout: ILoadout, targetCharacterId: string) => {
            setEquipState({ status: 'loading', loadoutId: loadout.id });
            try {
                const result = await applyLoadout(targetCharacterId, loadout);
                setEquipState({ status: 'success', loadoutId: loadout.id, result });
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown equip error';
                setEquipState({ status: 'error', loadoutId: loadout.id, message });
            }
        },
        [],
    );

    const handleEdit = useCallback((_loadout: ILoadout) => {
        // Phase 6 Step 2 — will open an edit drawer / modal
        // For now, no-op placeholder
    }, []);

    const handleDelete = useCallback(
        (loadout: ILoadout) => {
            deleteLoadout(loadout.id);
        },
        [deleteLoadout],
    );

    const handleUpdateNotes = useCallback(
        (loadout: ILoadout, notes: string) => {
            updateNotes(loadout.id, notes);
        },
        [updateNotes],
    );

    // ── Render ─────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-white selection:text-black">
            {/* ── Top Bar ─────────────────────────────────────── */}
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
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="size-6 bg-gradient-to-tr from-[#f5dc56] to-[#f5dc56]/50 rounded-full border border-white/10" />
                </div>
            </div>

            {/* ── Page Content ────────────────────────────────── */}
            <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
                {/* Page Header */}
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold uppercase tracking-[0.15em] text-white font-rajdhani leading-none">
                            Loadouts
                        </h1>
                        <p className="text-[11px] text-gray-600 font-mono mt-2">
                            {loadouts.length} saved build{loadouts.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Class filter pills */}
                    {availableClasses.length > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setFilterClass(null)}
                                className={cn(
                                    'px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm border transition-all font-rajdhani',
                                    filterClass === null
                                        ? 'border-white/30 text-white bg-white/10'
                                        : 'border-white/10 text-gray-500 hover:text-white hover:border-white/20',
                                )}
                            >
                                All
                            </button>
                            {availableClasses.map((cls) => {
                                const colors = CLASS_COLORS[cls];
                                const isActive = filterClass === cls;
                                return (
                                    <button
                                        key={cls}
                                        onClick={() => setFilterClass(isActive ? null : cls)}
                                        className={cn(
                                            'px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm border transition-all font-rajdhani',
                                            isActive && colors
                                                ? `${colors.border} ${colors.text} ${colors.bg}`
                                                : 'border-white/10 text-gray-500 hover:text-white hover:border-white/20',
                                        )}
                                    >
                                        {CLASS_NAMES[cls] ?? 'Unknown'}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Loadout Card List */}
                {filteredLoadouts.length === 0 ? (
                    loadouts.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16">
                            <p className="text-sm text-gray-500 font-mono">
                                No loadouts match the selected class filter.
                            </p>
                            <button
                                onClick={() => setFilterClass(null)}
                                className="mt-3 text-xs text-gray-400 hover:text-white underline underline-offset-2 font-mono"
                            >
                                Clear filter
                            </button>
                        </div>
                    )
                ) : (
                    <div className="space-y-3">
                        {filteredLoadouts.map((loadout) => (
                            <LoadoutCard
                                key={loadout.id}
                                loadout={loadout}
                                manifest={manifest}
                                characters={characters}
                                equipState={equipState}
                                validation={validations[loadout.id]}
                                onEquip={handleEquip}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                onUpdateNotes={handleUpdateNotes}
                            />
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-10 py-4 border-t border-white/5 text-center">
                    <p className="text-[10px] text-gray-700 font-mono">
                        Loadouts are saved locally. Items must be on your character to equip.
                    </p>
                </div>
            </div>
        </div>
    );
}
