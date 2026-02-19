/**
 * LoadoutCard — "Tactical Briefing" Card
 *
 * An always-expanded loadout card that shows all gear at a glance.
 * Layout:
 *   ┌─────────────────────────────────────────────────┐
 *   │  HEADER: Name · Class Badge · Timestamp         │
 *   ├─────────────────────────────────────────────────┤
 *   │  BODY:  [Subclass]  [Kin][Ene][Pow]  [H][A][C][L][Cl] │
 *   │         [Aspects/Fragments row if subclass]     │
 *   │         [Mods row if armor mods captured]       │
 *   ├─────────────────────────────────────────────────┤
 *   │  FOOTER:  [⚡ Equip]  [✏ Edit]  [🗑 Delete]     │
 *   └─────────────────────────────────────────────────┘
 *
 * Void theme: monochrome chrome, loot-only color (rarity borders, damage).
 * Typography: Rajdhani headers, JetBrains Mono data, Inter body.
 */
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
    Zap,
    Pencil,
    Trash2,
    ChevronDown,
    Loader2,
    Package,
    Shield,
    X,
    AlertTriangle,
    ArrowRight,
    FileText,
    Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ILoadout,
    ILoadoutItem,
    CLASS_NAMES,
    formatLoadoutDate,
} from '@/store/loadoutStore';
import { BUCKETS } from '@/data/constants';
import { BucketHashes } from '@/lib/destiny-constants';
import { useDefinitions } from '@/hooks/useDefinitions';
import type { ApplyLoadoutResult } from '@/lib/bungie/equipManager';

// ============================================================================
// CONSTANTS
// ============================================================================

const WEAPON_BUCKETS = [BUCKETS.Kinetic, BUCKETS.Energy, BUCKETS.Power];
const WEAPON_LABELS: Record<number, string> = {
    [BUCKETS.Kinetic]: 'KIN',
    [BUCKETS.Energy]: 'ENE',
    [BUCKETS.Power]: 'PWR',
};

const ARMOR_BUCKETS = [
    BUCKETS.Helmet,
    BUCKETS.Gauntlets,
    BUCKETS.Chest,
    BUCKETS.Legs,
    BUCKETS.Class,
];
const ARMOR_LABELS: Record<number, string> = {
    [BUCKETS.Helmet]: 'HELM',
    [BUCKETS.Gauntlets]: 'ARMS',
    [BUCKETS.Chest]: 'CHEST',
    [BUCKETS.Legs]: 'LEGS',
    [BUCKETS.Class]: 'CLASS',
};

/** Class accent colors — the only non-loot color allowed. */
const CLASS_COLORS: Record<number, { text: string; border: string; bg: string }> = {
    0: { text: 'text-orange-400', border: 'border-orange-400/30', bg: 'bg-orange-400/10' },
    1: { text: 'text-cyan-400', border: 'border-cyan-400/30', bg: 'bg-cyan-400/10' },
    2: { text: 'text-purple-400', border: 'border-purple-400/30', bg: 'bg-purple-400/10' },
};
const DEFAULT_CLASS = { text: 'text-gray-400', border: 'border-gray-400/30', bg: 'bg-gray-400/10' };

// ============================================================================
// TYPES
// ============================================================================

/** Validation status for a single loadout item. */
export type ItemValidation =
    | { status: 'ok' }
    | { status: 'missing' }           // Item no longer exists in inventory
    | { status: 'remote'; owner: string }; // Item is on another character or vault

/** Full loadout validation result. */
export interface LoadoutValidation {
    items: Record<string, ItemValidation>; // keyed by itemInstanceId
    classMismatch: boolean;                // loadout class != target character class
}

export type EquipState =
    | { status: 'idle' }
    | { status: 'loading'; loadoutId: string }
    | { status: 'success'; loadoutId: string; result: ApplyLoadoutResult }
    | { status: 'error'; loadoutId: string; message: string };

export interface LoadoutCardProps {
    loadout: ILoadout;
    manifest: Record<number, any>;
    characters: Record<string, any>;
    equipState: EquipState;
    validation?: LoadoutValidation;
    onEquip: (loadout: ILoadout, targetCharacterId: string) => void;
    onEdit: (loadout: ILoadout) => void;
    onDelete: (loadout: ILoadout) => void;
    onUpdateNotes?: (loadout: ILoadout, notes: string) => void;
}

// ============================================================================
// ITEM TILE — Shows a single gear icon with rarity border + power badge
// ============================================================================

const ItemTile: React.FC<{
    item: ILoadoutItem;
    manifest: Record<number, any>;
    size?: 'sm' | 'lg';
    validation?: ItemValidation;
}> = ({ item, manifest, size = 'sm', validation }) => {
    const def = manifest[item.itemHash];
    const icon = def?.displayProperties?.icon;
    const name = def?.displayProperties?.name || item.label || 'Unknown';
    const tierType = def?.inventory?.tierType;

    const rarityBorder =
        tierType === 6
            ? 'border-rarity-exotic'
            : tierType === 5
            ? 'border-rarity-legendary'
            : tierType === 4
            ? 'border-rarity-rare'
            : 'border-white/15';

    const sizeClass = size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';

    // Validation overlay
    const isMissing = validation?.status === 'missing';
    const isRemote = validation?.status === 'remote';

    return (
        <div className="group/tile relative" title={isMissing ? `${name} — MISSING` : isRemote ? `${name} — on another character` : name}>
            <div
                className={cn(
                    sizeClass,
                    'rounded border bg-void-surface overflow-hidden flex-shrink-0 transition-all',
                    'group-hover/tile:brightness-110',
                    isMissing ? 'border-red-500/60 opacity-50' : isRemote ? 'border-amber-500/40' : rarityBorder,
                )}
            >
                {icon ? (
                    <img
                        src={`https://www.bungie.net${icon}`}
                        alt={name}
                        className={cn('w-full h-full object-cover', isMissing && 'grayscale')}
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Package size={size === 'lg' ? 20 : 14} />
                    </div>
                )}
            </div>
            {/* Power badge */}
            {item.power && item.power > 0 && !isMissing && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-px text-[7px] font-mono font-bold text-white/80 bg-black/90 border border-white/10 rounded-sm leading-none whitespace-nowrap">
                    {item.power}
                </span>
            )}
            {/* Missing indicator */}
            {isMissing && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500/90 rounded-full flex items-center justify-center">
                    <AlertTriangle size={7} className="text-white" />
                </div>
            )}
            {/* Remote indicator */}
            {isRemote && (
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500/90 rounded-full flex items-center justify-center">
                    <ArrowRight size={7} className="text-white" />
                </div>
            )}
        </div>
    );
};

// ============================================================================
// EMPTY SLOT — Dashed placeholder for a missing bucket
// ============================================================================

const EmptySlot: React.FC<{ size?: 'sm' | 'lg' }> = ({ size = 'sm' }) => {
    const sizeClass = size === 'lg' ? 'w-14 h-14' : 'w-11 h-11';
    return (
        <div
            className={cn(
                sizeClass,
                'rounded border border-dashed border-white/8 bg-white/[0.02] flex items-center justify-center flex-shrink-0',
            )}
        >
            <div className="w-1.5 h-1.5 rounded-full bg-white/8" />
        </div>
    );
};

// ============================================================================
// SECTION — Reusable label for Weapons / Armor / Subclass strips
// ============================================================================

const SectionTag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span className="text-[8px] text-gray-600 uppercase tracking-[0.25em] font-bold font-rajdhani">
        {children}
    </span>
);

// ============================================================================
// PLUG ICON ROW — Shows a row of socket plug icons (Aspects, Fragments, Mods)
// ============================================================================

const PlugIconRow: React.FC<{
    plugHashes: number[];
    definitions: Record<string, any>;
    label: string;
    maxDisplay?: number;
}> = ({ plugHashes, definitions, label, maxDisplay = 10 }) => {
    if (plugHashes.length === 0) return null;

    const displayHashes = plugHashes.slice(0, maxDisplay);
    const overflow = plugHashes.length - maxDisplay;

    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[7px] text-gray-600 uppercase tracking-[0.2em] font-bold font-rajdhani w-14 flex-shrink-0 text-right">
                {label}
            </span>
            <div className="flex items-center gap-1 flex-wrap">
                {displayHashes.map((hash, idx) => {
                    const def = definitions[hash.toString()];
                    const icon = def?.displayProperties?.icon;
                    const name = def?.displayProperties?.name || `Plug ${hash}`;
                    return (
                        <div
                            key={`${hash}-${idx}`}
                            className="w-6 h-6 rounded-sm border border-white/10 bg-void-surface overflow-hidden flex-shrink-0"
                            title={name}
                        >
                            {icon ? (
                                <img
                                    src={`https://www.bungie.net${icon}`}
                                    alt={name}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                    <div className="w-1 h-1 rounded-full bg-white/20" />
                                </div>
                            )}
                        </div>
                    );
                })}
                {overflow > 0 && (
                    <span className="text-[8px] text-gray-600 font-mono">
                        +{overflow}
                    </span>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// LOADOUT CARD
// ============================================================================

export const LoadoutCard: React.FC<LoadoutCardProps> = ({
    loadout,
    manifest,
    characters,
    equipState,
    validation,
    onEquip,
    onEdit,
    onDelete,
    onUpdateNotes,
}) => {
    const [showEquipPicker, setShowEquipPicker] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [editingNotes, setEditingNotes] = useState(false);
    const [notesValue, setNotesValue] = useState(loadout.notes || '');
    const pickerRef = useRef<HTMLDivElement>(null);
    const notesRef = useRef<HTMLTextAreaElement>(null);

    const isThisEquipping =
        equipState.status === 'loading' && equipState.loadoutId === loadout.id;
    const thisResult =
        (equipState.status === 'success' || equipState.status === 'error') &&
        equipState.loadoutId === loadout.id
            ? equipState
            : null;

    const classColors = CLASS_COLORS[loadout.characterClass] || DEFAULT_CLASS;
    const charList = useMemo(() => Object.values(characters) as any[], [characters]);

    // ── Collect all plug hashes that need definition lookups ──
    const subclassItem = useMemo(
        () => loadout.items.find((i) => i.bucketHash === BucketHashes.Subclass) || null,
        [loadout.items],
    );

    const subclassPlugHashes = useMemo(() => {
        if (!subclassItem?.socketOverrides) return [];
        return Object.values(subclassItem.socketOverrides);
    }, [subclassItem]);

    const modHashes = useMemo(() => {
        if (!loadout.modsByBucket) return [];
        return Object.values(loadout.modsByBucket).flat();
    }, [loadout.modsByBucket]);

    // Fashion plug hashes: socketOverrides on non-subclass items (ornaments, shaders)
    const fashionHashes = useMemo(() => {
        const hashes: number[] = [];
        for (const item of loadout.items) {
            if (item.bucketHash === BucketHashes.Subclass) continue;
            if (!item.socketOverrides) continue;
            for (const hash of Object.values(item.socketOverrides)) {
                hashes.push(hash);
            }
        }
        return hashes;
    }, [loadout.items]);

    // All unique plug hashes for JIT definition fetch
    const allPlugHashes = useMemo(() => {
        const set = new Set([...subclassPlugHashes, ...modHashes, ...fashionHashes]);
        return Array.from(set);
    }, [subclassPlugHashes, modHashes, fashionHashes]);

    // Hydrate definitions for socket plugs (subclass aspects/fragments + mods)
    const { definitions: plugDefs } = useDefinitions(
        'DestinyInventoryItemDefinition',
        allPlugHashes,
    );

    // ── Validation summary ──
    const validationSummary = useMemo(() => {
        if (!validation) return null;
        const missingCount = Object.values(validation.items).filter(v => v.status === 'missing').length;
        const remoteCount = Object.values(validation.items).filter(v => v.status === 'remote').length;
        return { missingCount, remoteCount, classMismatch: validation.classMismatch };
    }, [validation]);

    // Categorize items
    const weapons = useMemo(
        () =>
            WEAPON_BUCKETS.map((bucket) => ({
                bucket,
                label: WEAPON_LABELS[bucket],
                item: loadout.items.find((i) => i.bucketHash === bucket) || null,
            })),
        [loadout.items],
    );

    const armor = useMemo(
        () =>
            ARMOR_BUCKETS.map((bucket) => ({
                bucket,
                label: ARMOR_LABELS[bucket],
                item: loadout.items.find((i) => i.bucketHash === bucket) || null,
            })),
        [loadout.items],
    );

    // Close equip picker on outside click
    useEffect(() => {
        if (!showEquipPicker) return;
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowEquipPicker(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showEquipPicker]);

    // Auto-dismiss delete confirmation after 4s
    useEffect(() => {
        if (!confirmDelete) return;
        const timer = setTimeout(() => setConfirmDelete(false), 4000);
        return () => clearTimeout(timer);
    }, [confirmDelete]);

    // Focus notes textarea when editing starts
    useEffect(() => {
        if (editingNotes && notesRef.current) {
            notesRef.current.focus();
            notesRef.current.selectionStart = notesRef.current.value.length;
        }
    }, [editingNotes]);

    const handleEquipOnChar = useCallback(
        (charId: string) => {
            setShowEquipPicker(false);
            onEquip(loadout, charId);
        },
        [loadout, onEquip],
    );

    const handleSaveNotes = useCallback(() => {
        const trimmed = notesValue.trim();
        onUpdateNotes?.(loadout, trimmed);
        setEditingNotes(false);
    }, [loadout, notesValue, onUpdateNotes]);

    const handleCancelNotes = useCallback(() => {
        setNotesValue(loadout.notes || '');
        setEditingNotes(false);
    }, [loadout.notes]);

    // Resolve subclass name for display
    const subclassName = subclassItem
        ? manifest[subclassItem.itemHash]?.displayProperties?.name || subclassItem.label || 'Unknown'
        : null;

    return (
        <div
            className={cn(
                'rounded-sm border transition-all duration-200',
                // Result flash states
                thisResult?.status === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                    : thisResult?.status === 'error'
                    ? 'border-red-500/30 bg-red-500/[0.03]'
                    : 'border-white/10 bg-void-surface hover:border-white/15',
            )}
        >
            {/* ── HEADER ────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                {/* Class accent bar */}
                <div
                    className={cn(
                        'w-0.5 self-stretch rounded-full flex-shrink-0 opacity-60',
                        classColors.bg.replace('bg-', 'bg-').replace('/10', '/40'),
                    )}
                    style={{
                        backgroundColor:
                            loadout.characterClass === 0
                                ? 'rgba(251,146,60,0.4)'
                                : loadout.characterClass === 1
                                ? 'rgba(34,211,238,0.4)'
                                : loadout.characterClass === 2
                                ? 'rgba(192,132,252,0.4)'
                                : 'rgba(156,163,175,0.3)',
                    }}
                />

                {/* Name and meta */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-white truncate font-rajdhani uppercase tracking-[0.1em] leading-tight">
                        {loadout.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        {/* Class pill */}
                        <span
                            className={cn(
                                'inline-flex items-center px-1.5 py-px text-[9px] font-bold uppercase tracking-widest rounded-sm border leading-none',
                                classColors.text,
                                classColors.border,
                                classColors.bg,
                            )}
                        >
                            {CLASS_NAMES[loadout.characterClass] ?? '???'}
                        </span>
                        {/* Item count */}
                        <span className="text-[9px] text-gray-600 font-mono">
                            {loadout.items.length} items
                        </span>
                        {/* Separator dot */}
                        <span className="text-[9px] text-gray-700">&#xB7;</span>
                        {/* Timestamp */}
                        <span className="text-[9px] text-gray-600 font-mono">
                            {formatLoadoutDate(loadout.updatedAt)}
                        </span>
                    </div>
                </div>

                {/* Equip result feedback (inline in header when visible) */}
                {thisResult?.status === 'success' && (
                    <span className="text-[10px] text-emerald-400 font-mono font-bold flex-shrink-0">
                        EQUIPPED
                    </span>
                )}
                {thisResult?.status === 'error' && (
                    <span className="text-[10px] text-red-400 font-mono font-bold flex-shrink-0 truncate max-w-[120px]">
                        FAILED
                    </span>
                )}
            </div>

            {/* ── VALIDATION WARNINGS ───────────────────────────── */}
            {validationSummary && (validationSummary.missingCount > 0 || validationSummary.remoteCount > 0 || validationSummary.classMismatch) && (
                <div className="px-4 py-2 border-b border-white/5 flex items-center gap-3 flex-wrap">
                    {validationSummary.classMismatch && (
                        <span className="flex items-center gap-1 text-[9px] text-red-400 font-mono font-bold">
                            <AlertTriangle size={10} />
                            Class mismatch
                        </span>
                    )}
                    {validationSummary.missingCount > 0 && (
                        <span className="flex items-center gap-1 text-[9px] text-red-400 font-mono">
                            <AlertTriangle size={10} />
                            {validationSummary.missingCount} missing
                        </span>
                    )}
                    {validationSummary.remoteCount > 0 && (
                        <span className="flex items-center gap-1 text-[9px] text-amber-400 font-mono">
                            <ArrowRight size={10} />
                            {validationSummary.remoteCount} need transfer
                        </span>
                    )}
                </div>
            )}

            {/* ── BODY: Gear Grid ───────────────────────────────── */}
            <div className="px-4 py-4">
                <div className="flex items-start gap-6">
                    {/* Subclass — large icon */}
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <SectionTag>Subclass</SectionTag>
                        {subclassItem ? (
                            <>
                                <ItemTile
                                    item={subclassItem}
                                    manifest={manifest}
                                    size="lg"
                                    validation={validation?.items[subclassItem.itemInstanceId]}
                                />
                                <span className="text-[8px] text-gray-500 font-mono truncate max-w-[56px] text-center leading-tight">
                                    {subclassName}
                                </span>
                            </>
                        ) : (
                            <EmptySlot size="lg" />
                        )}
                    </div>

                    {/* Divider */}
                    <div className="w-px self-stretch bg-white/5 flex-shrink-0 mt-4" />

                    {/* Weapons strip */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <SectionTag>Weapons</SectionTag>
                        <div className="flex items-center gap-1.5">
                            {weapons.map(({ bucket, label, item }) => (
                                <div key={bucket} className="flex flex-col items-center gap-1">
                                    {item ? (
                                        <ItemTile
                                            item={item}
                                            manifest={manifest}
                                            validation={validation?.items[item.itemInstanceId]}
                                        />
                                    ) : (
                                        <EmptySlot />
                                    )}
                                    <span className="text-[7px] text-gray-700 font-mono">
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="w-px self-stretch bg-white/5 flex-shrink-0 mt-4" />

                    {/* Armor strip */}
                    <div className="flex flex-col gap-1.5 flex-shrink-0">
                        <SectionTag>Armor</SectionTag>
                        <div className="flex items-center gap-1.5">
                            {armor.map(({ bucket, label, item }) => (
                                <div key={bucket} className="flex flex-col items-center gap-1">
                                    {item ? (
                                        <ItemTile
                                            item={item}
                                            manifest={manifest}
                                            validation={validation?.items[item.itemInstanceId]}
                                        />
                                    ) : (
                                        <EmptySlot />
                                    )}
                                    <span className="text-[7px] text-gray-700 font-mono">
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Subclass Socket Overrides (Aspects / Fragments) ── */}
                {subclassPlugHashes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                        <PlugIconRow
                            plugHashes={subclassPlugHashes}
                            definitions={plugDefs}
                            label="Config"
                        />
                    </div>
                )}

                {/* ── Armor Mods ── */}
                {modHashes.length > 0 && (
                    <div className={cn('mt-3 pt-3 border-t border-white/5 space-y-1.5', !subclassPlugHashes.length && 'mt-3')}>
                        <PlugIconRow
                            plugHashes={modHashes}
                            definitions={plugDefs}
                            label="Mods"
                        />
                    </div>
                )}

                {/* ── Fashion (Ornaments + Shaders) ── */}
                {fashionHashes.length > 0 && (
                    <div className={cn('mt-3 pt-3 border-t border-white/5 space-y-1.5', !subclassPlugHashes.length && !modHashes.length && 'mt-3')}>
                        <PlugIconRow
                            plugHashes={fashionHashes}
                            definitions={plugDefs}
                            label="Fashion"
                        />
                    </div>
                )}
            </div>

            {/* ── NOTES ─────────────────────────────────────────── */}
            {(loadout.notes || editingNotes) && (
                <div className="px-4 pb-3">
                    {editingNotes ? (
                        <div className="space-y-2">
                            <textarea
                                ref={notesRef}
                                value={notesValue}
                                onChange={(e) => setNotesValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSaveNotes();
                                    if (e.key === 'Escape') handleCancelNotes();
                                }}
                                placeholder="Add notes about this loadout..."
                                maxLength={500}
                                rows={3}
                                className="w-full bg-white/5 border border-white/15 rounded-sm px-2.5 py-2 text-[11px] text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono resize-none"
                            />
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={handleSaveNotes}
                                    className="flex items-center gap-1 px-2 py-1 text-[9px] font-bold text-emerald-400 border border-emerald-400/30 rounded-sm hover:bg-emerald-400/10 transition-colors uppercase tracking-wider font-rajdhani"
                                >
                                    <Save size={9} />
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelNotes}
                                    className="px-2 py-1 text-[9px] font-bold text-gray-500 border border-white/10 rounded-sm hover:text-white hover:bg-white/5 transition-colors uppercase tracking-wider font-rajdhani"
                                >
                                    Cancel
                                </button>
                                <span className="ml-auto text-[8px] text-gray-700 font-mono">
                                    {notesValue.length}/500 · Ctrl+Enter to save
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="flex items-start gap-2 group/notes cursor-pointer"
                            onClick={() => { setNotesValue(loadout.notes || ''); setEditingNotes(true); }}
                            title="Click to edit notes"
                        >
                            <FileText size={10} className="text-gray-600 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-gray-500 font-mono leading-relaxed break-words group-hover/notes:text-gray-400 transition-colors">
                                {loadout.notes}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── FOOTER: Actions ───────────────────────────────── */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-t border-white/5">
                {/* Equip button (or character picker) */}
                <div ref={pickerRef} className="relative">
                    {charList.length <= 1 ? (
                        <button
                            onClick={() =>
                                charList[0] && handleEquipOnChar(charList[0].characterId)
                            }
                            disabled={isThisEquipping || charList.length === 0 || !!validationSummary?.classMismatch}
                            title={validationSummary?.classMismatch ? 'Cannot equip: class mismatch' : undefined}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all font-rajdhani',
                                'border border-white/10 text-gray-300 bg-white/[0.03]',
                                'hover:border-white/25 hover:text-white hover:bg-white/[0.06]',
                                'disabled:opacity-30 disabled:cursor-not-allowed',
                            )}
                        >
                            {isThisEquipping ? (
                                <Loader2 size={11} className="animate-spin" />
                            ) : (
                                <Zap size={11} />
                            )}
                            {isThisEquipping ? 'Equipping...' : 'Equip'}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => setShowEquipPicker((v) => !v)}
                                disabled={isThisEquipping}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all font-rajdhani',
                                    'border border-white/10 text-gray-300 bg-white/[0.03]',
                                    'hover:border-white/25 hover:text-white hover:bg-white/[0.06]',
                                    'disabled:opacity-30 disabled:cursor-not-allowed',
                                )}
                            >
                                {isThisEquipping ? (
                                    <Loader2 size={11} className="animate-spin" />
                                ) : (
                                    <Zap size={11} />
                                )}
                                {isThisEquipping ? 'Equipping...' : 'Equip'}
                                {!isThisEquipping && <ChevronDown size={9} />}
                            </button>

                            {showEquipPicker && (
                                <div className="absolute bottom-full left-0 mb-1 bg-[#0a0a0a] border border-white/15 rounded-sm shadow-2xl overflow-hidden z-10 min-w-[170px]">
                                    {charList.map((char: any) => {
                                        const isMismatch = loadout.characterClass >= 0 && char.classType !== loadout.characterClass;
                                        return (
                                            <button
                                                key={char.characterId}
                                                onClick={() =>
                                                    handleEquipOnChar(char.characterId)
                                                }
                                                disabled={isMismatch}
                                                className={cn(
                                                    'w-full flex items-center gap-2.5 px-3 py-2 text-[10px] transition-colors text-left',
                                                    isMismatch
                                                        ? 'text-gray-600 cursor-not-allowed'
                                                        : 'text-gray-400 hover:bg-white/5 hover:text-white',
                                                )}
                                                title={isMismatch ? 'Class mismatch' : undefined}
                                            >
                                                {char.emblemPath ? (
                                                    <img
                                                        src={`https://www.bungie.net${char.emblemPath}`}
                                                        className={cn('w-5 h-5 rounded-sm object-cover bg-gray-800', isMismatch && 'opacity-30')}
                                                        alt=""
                                                    />
                                                ) : (
                                                    <Shield size={14} className="text-gray-600" />
                                                )}
                                                <span className="font-bold font-rajdhani tracking-wide uppercase">
                                                    {CLASS_NAMES[char.classType] ?? 'Guardian'}
                                                </span>
                                                {isMismatch && (
                                                    <span className="text-[8px] text-red-400/60 font-mono ml-1">mismatch</span>
                                                )}
                                                <span className="ml-auto text-[9px] text-gray-600 font-mono">
                                                    {char.light}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Edit */}
                <button
                    onClick={() => onEdit(loadout)}
                    className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all font-rajdhani',
                        'border border-white/10 text-gray-500',
                        'hover:text-white hover:border-white/20 hover:bg-white/5',
                    )}
                >
                    <Pencil size={10} />
                    Edit
                </button>

                {/* Notes toggle */}
                {onUpdateNotes && !editingNotes && (
                    <button
                        onClick={() => { setNotesValue(loadout.notes || ''); setEditingNotes(true); }}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all font-rajdhani',
                            'border border-white/10 text-gray-500',
                            'hover:text-white hover:border-white/20 hover:bg-white/5',
                            loadout.notes && 'text-gray-400',
                        )}
                        title={loadout.notes ? 'Edit notes' : 'Add notes'}
                    >
                        <FileText size={10} />
                        Notes
                    </button>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Delete */}
                {!confirmDelete ? (
                    <button
                        onClick={() => setConfirmDelete(true)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] font-bold uppercase tracking-widest transition-all font-rajdhani',
                            'border border-white/10 text-gray-600',
                            'hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5',
                        )}
                    >
                        <Trash2 size={10} />
                        Delete
                    </button>
                ) : (
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                onDelete(loadout);
                                setConfirmDelete(false);
                            }}
                            className="px-2.5 py-1.5 text-[9px] font-bold text-red-400 border border-red-400/40 rounded-sm hover:bg-red-400/15 transition-colors uppercase tracking-wider font-rajdhani"
                        >
                            Confirm
                        </button>
                        <button
                            onClick={() => setConfirmDelete(false)}
                            className="p-1.5 rounded-sm text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            <X size={11} />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoadoutCard;
