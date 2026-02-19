/**
 * Loadouts Page — Phase 6: Dedicated Loadout Dashboard
 *
 * A full-page view for managing saved loadouts, inspired by DIM's Loadouts.tsx
 * and LoadoutView.tsx layout. Renders loadout cards in a vertical stack with:
 *   - Header: Name, Class icon, Total Stat Tiers (e.g. "T32")
 *   - Body:   Weapons | Armor | Subclass sections with item icons
 *   - Actions: Equip, Edit (rename/notes), Delete, Re-snapshot
 *
 * Void theme: monochrome chrome, loot-only color, Rajdhani headers.
 */
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
    Zap,
    Pencil,
    Trash2,
    ChevronDown,
    Check,
    AlertTriangle,
    Loader2,
    Package,
    Shield,
    Swords,
    X,
    StickyNote,
    RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    useLoadoutStore,
    ILoadout,
    ILoadoutItem,
    CLASS_NAMES,
    formatLoadoutDate,
    calculateStats,
    selectLoadoutsGroupedByClass,
} from '@/store/loadoutStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { applyLoadout, ApplyLoadoutResult } from '@/lib/bungie/equipManager';
import { Navigation } from '@/components/Navigation';
import { BUCKETS } from '@/data/constants';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Weapon bucket hashes in display order: Kinetic, Energy, Power */
const WEAPON_BUCKETS = [BUCKETS.Kinetic, BUCKETS.Energy, BUCKETS.Power];
const WEAPON_BUCKET_LABELS: Record<number, string> = {
    [BUCKETS.Kinetic]: 'Kinetic',
    [BUCKETS.Energy]: 'Energy',
    [BUCKETS.Power]: 'Power',
};

/** Armor bucket hashes in display order */
const ARMOR_BUCKETS = [
    BUCKETS.Helmet,
    BUCKETS.Gauntlets,
    BUCKETS.Chest,
    BUCKETS.Legs,
    BUCKETS.Class,
];
const ARMOR_BUCKET_LABELS: Record<number, string> = {
    [BUCKETS.Helmet]: 'Helmet',
    [BUCKETS.Gauntlets]: 'Arms',
    [BUCKETS.Chest]: 'Chest',
    [BUCKETS.Legs]: 'Legs',
    [BUCKETS.Class]: 'Class',
};

/** All known gear buckets (weapon + armor) */
const ALL_GEAR_BUCKETS = new Set([...WEAPON_BUCKETS, ...ARMOR_BUCKETS]);

/** Class color schemes for headers and accents */
const CLASS_COLORS: Record<number, { text: string; border: string; bg: string; accent: string }> = {
    0: { text: 'text-orange-400', border: 'border-orange-400/30', bg: 'bg-orange-400/10', accent: 'orange' },
    1: { text: 'text-cyan-400', border: 'border-cyan-400/30', bg: 'bg-cyan-400/10', accent: 'cyan' },
    2: { text: 'text-purple-400', border: 'border-purple-400/30', bg: 'bg-purple-400/10', accent: 'purple' },
};

const DEFAULT_CLASS_COLORS = { text: 'text-gray-400', border: 'border-gray-400/30', bg: 'bg-gray-400/10', accent: 'gray' };

// ============================================================================
// TYPES
// ============================================================================

type EquipState =
    | { status: 'idle' }
    | { status: 'loading'; loadoutId: string }
    | { status: 'success'; loadoutId: string; result: ApplyLoadoutResult }
    | { status: 'error'; loadoutId: string; message: string };

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Item thumbnail tile — shows the item icon from Bungie manifest */
const ItemTile: React.FC<{
    item: ILoadoutItem;
    manifest: Record<number, any>;
    size?: 'sm' | 'md';
}> = ({ item, manifest, size = 'md' }) => {
    const def = manifest[item.itemHash];
    const icon = def?.displayProperties?.icon;
    const name = def?.displayProperties?.name || item.label || 'Unknown';
    const tierType = def?.inventory?.tierType;

    // Rarity border color
    const rarityBorder =
        tierType === 6
            ? 'border-rarity-exotic'
            : tierType === 5
            ? 'border-rarity-legendary'
            : tierType === 4
            ? 'border-rarity-rare'
            : 'border-white/15';

    const sizeClass = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';

    return (
        <div className="group/tile relative" title={name}>
            <div
                className={cn(
                    sizeClass,
                    'rounded border bg-void-surface overflow-hidden flex-shrink-0',
                    rarityBorder,
                )}
            >
                {icon ? (
                    <img
                        src={`https://www.bungie.net${icon}`}
                        alt={name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                        <Package size={size === 'sm' ? 14 : 18} />
                    </div>
                )}
            </div>
            {/* Power badge */}
            {item.power && item.power > 0 && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-px text-[8px] font-mono font-bold text-white bg-black/80 border border-white/10 rounded-sm leading-none">
                    {item.power}
                </span>
            )}
        </div>
    );
};

/** Empty slot placeholder for a missing bucket */
const EmptySlot: React.FC<{ label: string; size?: 'sm' | 'md' }> = ({ label, size = 'md' }) => {
    const sizeClass = size === 'sm' ? 'w-10 h-10' : 'w-12 h-12';
    return (
        <div
            className={cn(
                sizeClass,
                'rounded border border-dashed border-white/10 bg-white/[0.02] flex items-center justify-center flex-shrink-0',
            )}
            title={`Empty ${label}`}
        >
            <div className="w-2 h-2 rounded-full bg-white/10" />
        </div>
    );
};

/** Stat tier bar — shows a single stat with its tier value */
const StatTierBar: React.FC<{
    name: string;
    value: number;
    tier: number;
}> = ({ name, value, tier }) => {
    // 10 segments representing tiers 1-10
    const segments = Array.from({ length: 10 }, (_, i) => i < tier);

    return (
        <div className="flex items-center gap-2 text-[11px]">
            <span className="w-[72px] text-right text-gray-500 font-mono truncate">{name}</span>
            <div className="flex gap-[2px]">
                {segments.map((filled, i) => (
                    <div
                        key={i}
                        className={cn(
                            'w-[6px] h-3 rounded-[1px] transition-colors',
                            filled ? 'bg-white/70' : 'bg-white/8',
                        )}
                    />
                ))}
            </div>
            <span className="w-6 text-right font-mono font-bold text-gray-300">{value}</span>
            <span className="text-[9px] text-gray-600 font-mono">T{tier}</span>
        </div>
    );
};

/** Total tier badge (e.g. "T32") */
const TotalTierBadge: React.FC<{ totalTier: number; classType: number }> = ({
    totalTier,
    classType,
}) => {
    const colors = CLASS_COLORS[classType] || DEFAULT_CLASS_COLORS;
    return (
        <span
            className={cn(
                'inline-flex items-center px-2 py-0.5 text-xs font-bold font-mono rounded-sm border leading-none',
                colors.text,
                colors.border,
                colors.bg,
            )}
        >
            T{totalTier}
        </span>
    );
};

/** Class badge pill (reused from drawer but larger for the page) */
const ClassBadge: React.FC<{ classType: number; size?: 'sm' | 'md' }> = ({
    classType,
    size = 'md',
}) => {
    const colors = CLASS_COLORS[classType] || DEFAULT_CLASS_COLORS;
    const name = CLASS_NAMES[classType] ?? 'Unknown';
    const sizeClasses =
        size === 'sm'
            ? 'px-1.5 py-0.5 text-[10px]'
            : 'px-2 py-1 text-[11px]';
    return (
        <span
            className={cn(
                'inline-flex items-center font-bold uppercase tracking-widest border rounded-sm leading-none',
                sizeClasses,
                colors.text,
                colors.border,
                colors.bg,
            )}
        >
            {name}
        </span>
    );
};

/** Section header label inside a loadout card */
const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <h4 className="text-[9px] text-gray-600 uppercase tracking-[0.2em] font-bold font-rajdhani mb-2">
        {children}
    </h4>
);

// ============================================================================
// EQUIP RESULT BADGE
// ============================================================================

const EquipResultBadge: React.FC<{ result: ApplyLoadoutResult }> = ({ result }) => {
    if (result.success) {
        return (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                <Check size={14} strokeWidth={3} />
                <span>All {result.equipped.length} items equipped</span>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {result.equipped.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                    <Check size={14} strokeWidth={3} />
                    <span>{result.equipped.length} equipped</span>
                </div>
            )}
            {result.failed.map((f, i) => (
                <div
                    key={i}
                    className="flex items-start gap-1.5 text-xs text-amber-400 font-mono"
                >
                    <AlertTriangle size={14} className="mt-px flex-shrink-0" />
                    <span className="leading-tight">{f.reason}</span>
                </div>
            ))}
        </div>
    );
};

// ============================================================================
// LOADOUT CARD (Full-page version)
// ============================================================================

interface LoadoutCardProps {
    loadout: ILoadout;
    manifest: Record<number, any>;
    characters: Record<string, any>;
    equipState: EquipState;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onEquip: (loadout: ILoadout, targetCharacterId: string) => void;
    onRename: (loadout: ILoadout, newName: string) => void;
    onUpdateNotes: (loadout: ILoadout, notes: string) => void;
    onDelete: (loadout: ILoadout) => void;
    onResnapshot: (loadout: ILoadout) => void;
}

const LoadoutCard: React.FC<LoadoutCardProps> = ({
    loadout,
    manifest,
    characters,
    equipState,
    isExpanded,
    onToggleExpand,
    onEquip,
    onRename,
    onUpdateNotes,
    onDelete,
    onResnapshot,
}) => {
    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(loadout.name);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [editNotes, setEditNotes] = useState(loadout.notes || '');
    const [showEquipPicker, setShowEquipPicker] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const nameInputRef = useRef<HTMLInputElement>(null);
    const notesRef = useRef<HTMLTextAreaElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const isThisEquipping =
        equipState.status === 'loading' && equipState.loadoutId === loadout.id;
    const thisResult =
        (equipState.status === 'success' || equipState.status === 'error') &&
        equipState.loadoutId === loadout.id
            ? equipState
            : null;

    const charList = Object.values(characters) as any[];
    const classColors = CLASS_COLORS[loadout.characterClass] || DEFAULT_CLASS_COLORS;

    // Compute stat tiers
    const statTiers = useMemo(() => calculateStats(loadout), [loadout]);

    // Categorize items
    const weapons = useMemo(
        () =>
            WEAPON_BUCKETS.map((bucket) => ({
                bucket,
                label: WEAPON_BUCKET_LABELS[bucket],
                item: loadout.items.find((i) => i.bucketHash === bucket) || null,
            })),
        [loadout.items],
    );

    const armor = useMemo(
        () =>
            ARMOR_BUCKETS.map((bucket) => ({
                bucket,
                label: ARMOR_BUCKET_LABELS[bucket],
                item: loadout.items.find((i) => i.bucketHash === bucket) || null,
            })),
        [loadout.items],
    );

    // Subclass is any item NOT in a weapon or armor bucket
    const subclassItem = useMemo(
        () => loadout.items.find((i) => !ALL_GEAR_BUCKETS.has(i.bucketHash)) || null,
        [loadout.items],
    );

    // Focus inputs
    useEffect(() => {
        if (isEditingName) nameInputRef.current?.focus();
    }, [isEditingName]);
    useEffect(() => {
        if (isEditingNotes) notesRef.current?.focus();
    }, [isEditingNotes]);

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

    const handleRenameSubmit = () => {
        const trimmed = editName.trim();
        if (trimmed && trimmed !== loadout.name) {
            onRename(loadout, trimmed);
        } else {
            setEditName(loadout.name);
        }
        setIsEditingName(false);
    };

    const handleNotesSubmit = () => {
        onUpdateNotes(loadout, editNotes.trim());
        setIsEditingNotes(false);
    };

    const handleEquipOnChar = (charId: string) => {
        setShowEquipPicker(false);
        onEquip(loadout, charId);
    };

    return (
        <div
            className={cn(
                'rounded border transition-all duration-200',
                thisResult?.status === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : thisResult?.status === 'error'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-void-border bg-void-surface hover:border-void-border-light',
            )}
        >
            {/* ── Card Header ─────────────────────────────────── */}
            <button
                onClick={onToggleExpand}
                className="w-full flex items-center gap-3 p-4 text-left group"
            >
                {/* Class accent bar */}
                <div
                    className={cn(
                        'w-1 self-stretch rounded-full flex-shrink-0',
                        classColors.bg,
                    )}
                />

                {/* Name + meta */}
                <div className="flex-1 min-w-0">
                    {isEditingName ? (
                        <input
                            ref={nameInputRef}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit();
                                if (e.key === 'Escape') {
                                    setEditName(loadout.name);
                                    setIsEditingName(false);
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full bg-transparent border-b border-white/30 text-lg font-bold text-white outline-none pb-px font-rajdhani tracking-wide"
                        />
                    ) : (
                        <h3 className="text-lg font-bold text-white truncate font-rajdhani tracking-wide leading-tight">
                            {loadout.name}
                        </h3>
                    )}
                    <div className="flex items-center gap-2.5 mt-1.5">
                        <ClassBadge classType={loadout.characterClass} size="sm" />
                        <TotalTierBadge
                            totalTier={statTiers.totalTier}
                            classType={loadout.characterClass}
                        />
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                            <Package size={10} />
                            {loadout.items.length} items
                        </span>
                        <span className="text-[10px] text-gray-600 font-mono">
                            {formatLoadoutDate(loadout.updatedAt)}
                        </span>
                    </div>
                </div>

                {/* Quick weapon preview (collapsed) */}
                {!isExpanded && (
                    <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                        {weapons.map(({ bucket, item }) =>
                            item ? (
                                <ItemTile
                                    key={bucket}
                                    item={item}
                                    manifest={manifest}
                                    size="sm"
                                />
                            ) : (
                                <EmptySlot key={bucket} label={WEAPON_BUCKET_LABELS[bucket]} size="sm" />
                            ),
                        )}
                    </div>
                )}

                {/* Expand chevron */}
                <ChevronDown
                    size={16}
                    className={cn(
                        'text-gray-600 group-hover:text-gray-400 transition-transform flex-shrink-0',
                        isExpanded && 'rotate-180',
                    )}
                />
            </button>

            {/* ── Expanded Body ────────────────────────────────── */}
            {isExpanded && (
                <div className="border-t border-white/5">
                    {/* Item Sections */}
                    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Weapons */}
                        <div>
                            <SectionLabel>Weapons</SectionLabel>
                            <div className="flex gap-2">
                                {weapons.map(({ bucket, label, item }) =>
                                    item ? (
                                        <div key={bucket} className="flex flex-col items-center gap-1">
                                            <ItemTile item={item} manifest={manifest} />
                                            <span className="text-[8px] text-gray-600 font-mono uppercase">
                                                {label}
                                            </span>
                                        </div>
                                    ) : (
                                        <div key={bucket} className="flex flex-col items-center gap-1">
                                            <EmptySlot label={label} />
                                            <span className="text-[8px] text-gray-600 font-mono uppercase">
                                                {label}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>

                        {/* Armor */}
                        <div>
                            <SectionLabel>Armor</SectionLabel>
                            <div className="flex gap-2">
                                {armor.map(({ bucket, label, item }) =>
                                    item ? (
                                        <div key={bucket} className="flex flex-col items-center gap-1">
                                            <ItemTile item={item} manifest={manifest} />
                                            <span className="text-[8px] text-gray-600 font-mono uppercase">
                                                {label}
                                            </span>
                                        </div>
                                    ) : (
                                        <div key={bucket} className="flex flex-col items-center gap-1">
                                            <EmptySlot label={label} />
                                            <span className="text-[8px] text-gray-600 font-mono uppercase">
                                                {label}
                                            </span>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>

                        {/* Subclass */}
                        <div>
                            <SectionLabel>Subclass</SectionLabel>
                            {subclassItem ? (
                                <div className="flex items-center gap-3">
                                    <ItemTile item={subclassItem} manifest={manifest} />
                                    <div className="min-w-0">
                                        <p className="text-sm text-white font-rajdhani tracking-wide truncate">
                                            {manifest[subclassItem.itemHash]?.displayProperties?.name ||
                                                subclassItem.label ||
                                                'Unknown'}
                                        </p>
                                        <p className="text-[10px] text-gray-600 font-mono">
                                            {manifest[subclassItem.itemHash]?.itemTypeDisplayName || 'Subclass'}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <EmptySlot label="Subclass" />
                                    <span className="text-[11px] font-mono">No subclass captured</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stat Tiers */}
                    <div className="px-4 pb-4">
                        <SectionLabel>Predicted Stat Tiers</SectionLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
                            {Object.entries(statTiers.tiers).map(([name, tier]) => (
                                <StatTierBar
                                    key={name}
                                    name={name}
                                    value={statTiers.stats[name]}
                                    tier={tier}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="px-4 pb-4">
                        {isEditingNotes ? (
                            <div className="space-y-2">
                                <SectionLabel>Notes</SectionLabel>
                                <textarea
                                    ref={notesRef}
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setEditNotes(loadout.notes || '');
                                            setIsEditingNotes(false);
                                        }
                                    }}
                                    placeholder="Add notes about this loadout..."
                                    rows={3}
                                    className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono resize-none"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleNotesSubmit}
                                        className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white border border-white/20 rounded hover:bg-white/10 transition-colors font-rajdhani"
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditNotes(loadout.notes || '');
                                            setIsEditingNotes(false);
                                        }}
                                        className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-gray-500 border border-white/10 rounded hover:bg-white/5 transition-colors font-rajdhani"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : loadout.notes ? (
                            <div>
                                <SectionLabel>Notes</SectionLabel>
                                <p className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">
                                    {loadout.notes}
                                </p>
                            </div>
                        ) : null}
                    </div>

                    {/* Equip Result (if any) */}
                    {thisResult?.status === 'success' && (
                        <div className="px-4 pb-3">
                            <EquipResultBadge result={thisResult.result} />
                        </div>
                    )}
                    {thisResult?.status === 'error' && (
                        <div className="px-4 pb-3 flex items-center gap-1.5 text-xs text-red-400 font-mono">
                            <AlertTriangle size={14} />
                            <span>{thisResult.message}</span>
                        </div>
                    )}

                    {/* ── Actions Bar ─────────────────────────────── */}
                    <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                        {/* Equip */}
                        <div ref={pickerRef} className="relative">
                            {charList.length <= 1 ? (
                                <button
                                    onClick={() =>
                                        charList[0] && handleEquipOnChar(charList[0].characterId)
                                    }
                                    disabled={isThisEquipping || charList.length === 0}
                                    className={cn(
                                        'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all font-rajdhani',
                                        'border border-white/15 text-gray-300 bg-white/5',
                                        'hover:border-white/30 hover:text-white hover:bg-white/10',
                                        'disabled:opacity-40 disabled:cursor-not-allowed',
                                    )}
                                >
                                    {isThisEquipping ? (
                                        <Loader2 size={12} className="animate-spin" />
                                    ) : (
                                        <Zap size={12} />
                                    )}
                                    {isThisEquipping ? 'Equipping...' : 'Equip'}
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => setShowEquipPicker((v) => !v)}
                                        disabled={isThisEquipping}
                                        className={cn(
                                            'flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all font-rajdhani',
                                            'border border-white/15 text-gray-300 bg-white/5',
                                            'hover:border-white/30 hover:text-white hover:bg-white/10',
                                            'disabled:opacity-40 disabled:cursor-not-allowed',
                                        )}
                                    >
                                        {isThisEquipping ? (
                                            <Loader2 size={12} className="animate-spin" />
                                        ) : (
                                            <Zap size={12} />
                                        )}
                                        {isThisEquipping ? 'Equipping...' : 'Equip On'}
                                        {!isThisEquipping && <ChevronDown size={10} />}
                                    </button>

                                    {showEquipPicker && (
                                        <div className="absolute bottom-full left-0 mb-1 bg-[#0d0d0d] border border-white/15 rounded shadow-2xl overflow-hidden z-10 min-w-[180px]">
                                            {charList.map((char: any) => (
                                                <button
                                                    key={char.characterId}
                                                    onClick={() => handleEquipOnChar(char.characterId)}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-gray-300 hover:bg-white/8 hover:text-white transition-colors text-left"
                                                >
                                                    {char.emblemPath ? (
                                                        <img
                                                            src={`https://www.bungie.net${char.emblemPath}`}
                                                            className="w-5 h-5 rounded-sm object-cover bg-gray-800"
                                                            alt=""
                                                        />
                                                    ) : (
                                                        <Shield size={16} className="text-gray-600" />
                                                    )}
                                                    <span className="font-bold font-rajdhani tracking-wide">
                                                        {CLASS_NAMES[char.classType] ?? 'Guardian'}
                                                    </span>
                                                    <span className="ml-auto text-[10px] text-gray-600 font-mono">
                                                        {char.light}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Edit Name */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingName(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all font-rajdhani border border-white/10 text-gray-500 hover:text-white hover:border-white/20 hover:bg-white/5"
                            title="Rename"
                        >
                            <Pencil size={11} />
                            Rename
                        </button>

                        {/* Notes */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingNotes(true);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all font-rajdhani border border-white/10 text-gray-500 hover:text-white hover:border-white/20 hover:bg-white/5"
                            title="Edit Notes"
                        >
                            <StickyNote size={11} />
                            Notes
                        </button>

                        {/* Re-snapshot */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onResnapshot(loadout);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all font-rajdhani border border-white/10 text-gray-500 hover:text-white hover:border-white/20 hover:bg-white/5"
                            title="Re-snapshot current gear into this loadout"
                        >
                            <RefreshCw size={11} />
                            Sync
                        </button>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Delete */}
                        {!confirmDelete ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setConfirmDelete(true);
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all font-rajdhani border border-white/10 text-gray-500 hover:text-red-400 hover:border-red-400/30 hover:bg-red-400/5"
                                title="Delete"
                            >
                                <Trash2 size={11} />
                                Delete
                            </button>
                        ) : (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(loadout);
                                        setConfirmDelete(false);
                                    }}
                                    className="px-2.5 py-1.5 text-[10px] font-bold text-red-400 border border-red-400/40 rounded hover:bg-red-400/20 transition-colors uppercase tracking-wider font-rajdhani"
                                >
                                    Confirm Delete
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setConfirmDelete(false);
                                    }}
                                    className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// EMPTY STATE
// ============================================================================

const EmptyState: React.FC = () => (
    <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <Swords size={28} className="text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-300 font-rajdhani tracking-wide mb-2">
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
    const loadouts = useLoadoutStore((s) => s.loadouts);
    const selectedLoadoutId = useLoadoutStore((s) => s.selectedLoadoutId);
    const setSelectedLoadout = useLoadoutStore((s) => s.setSelectedLoadout);
    const deleteLoadout = useLoadoutStore((s) => s.deleteLoadout);
    const renameLoadout = useLoadoutStore((s) => s.renameLoadout);
    const updateNotes = useLoadoutStore((s) => s.updateNotes);
    const updateItems = useLoadoutStore((s) => s.updateItems);

    const manifest = useInventoryStore((s) => s.manifest);
    const characters = useInventoryStore((s) => s.characters);
    const allItems = useInventoryStore((s) => s.items);

    const [equipState, setEquipState] = useState<EquipState>({ status: 'idle' });
    const [filterClass, setFilterClass] = useState<number | null>(null);

    // Reset equip feedback after 6 seconds
    useEffect(() => {
        if (equipState.status === 'success' || equipState.status === 'error') {
            const timer = setTimeout(() => setEquipState({ status: 'idle' }), 6000);
            return () => clearTimeout(timer);
        }
    }, [equipState]);

    // Class filter
    const grouped = useMemo(() => selectLoadoutsGroupedByClass(loadouts), [loadouts]);
    const availableClasses = useMemo(() => {
        return Object.keys(grouped)
            .map(Number)
            .filter((c) => c >= 0)
            .sort();
    }, [grouped]);

    const filteredLoadouts = useMemo(() => {
        if (filterClass === null) return loadouts;
        return loadouts.filter((l) => l.characterClass === filterClass);
    }, [loadouts, filterClass]);

    // Handlers
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

    const handleRename = useCallback(
        (loadout: ILoadout, newName: string) => {
            renameLoadout(loadout.id, newName);
        },
        [renameLoadout],
    );

    const handleUpdateNotes = useCallback(
        (loadout: ILoadout, notes: string) => {
            updateNotes(loadout.id, notes);
        },
        [updateNotes],
    );

    const handleDelete = useCallback(
        (loadout: ILoadout) => {
            deleteLoadout(loadout.id);
            if (selectedLoadoutId === loadout.id) {
                setSelectedLoadout(null);
            }
        },
        [deleteLoadout, selectedLoadoutId, setSelectedLoadout],
    );

    const handleResnapshot = useCallback(
        (loadout: ILoadout) => {
            // Re-snapshot: replace the loadout's items with whatever is currently
            // equipped on the same character.
            const equippedItems = allItems.filter(
                (item) =>
                    item.owner === loadout.characterId &&
                    item.instanceData?.isEquipped === true &&
                    item.itemInstanceId != null,
            );

            if (equippedItems.length === 0) return;

            const newItems = equippedItems.map((item) => {
                const def = manifest[item.itemHash];
                return {
                    itemInstanceId: item.itemInstanceId!,
                    itemHash: item.itemHash,
                    bucketHash:
                        item.bucketHash ||
                        (def?.inventory as any)?.bucketTypeHash ||
                        0,
                    label: def?.displayProperties?.name,
                    power: item.instanceData?.primaryStat?.value,
                };
            });

            updateItems(loadout.id, newItems);
        },
        [allItems, manifest, updateItems],
    );

    const handleToggleExpand = useCallback(
        (id: string) => {
            setSelectedLoadout(selectedLoadoutId === id ? null : id);
        },
        [selectedLoadoutId, setSelectedLoadout],
    );

    return (
        <div className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-white selection:text-black">
            {/* ── Top Bar ────────────────────────────────────────── */}
            <div className="sticky top-0 h-12 bg-black border-b border-void-border flex items-center px-4 justify-between flex-shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <Link to="/" className="font-bold text-xl tracking-tight text-white hover:opacity-80 transition-opacity">
                        GuardianNexus
                    </Link>
                    <Navigation />
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                    <div className="size-6 bg-gradient-to-tr from-[#f5dc56] to-[#f5dc56]/50 rounded-full border border-white/10" />
                </div>
            </div>

            {/* ── Page Content ───────────────────────────────────── */}
            <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
                {/* Page Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold uppercase tracking-[0.15em] text-white font-rajdhani">
                            Loadouts
                        </h1>
                        <p className="text-xs text-gray-600 font-mono mt-1">
                            {loadouts.length} saved loadout{loadouts.length !== 1 ? 's' : ''}
                        </p>
                    </div>

                    {/* Class filter pills */}
                    {availableClasses.length > 1 && (
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setFilterClass(null)}
                                className={cn(
                                    'px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded border transition-all font-rajdhani',
                                    filterClass === null
                                        ? 'border-white/30 text-white bg-white/10'
                                        : 'border-white/10 text-gray-500 hover:text-white hover:border-white/20',
                                )}
                            >
                                All
                            </button>
                            {availableClasses.map((cls) => {
                                const colors = CLASS_COLORS[cls] || DEFAULT_CLASS_COLORS;
                                const isActive = filterClass === cls;
                                return (
                                    <button
                                        key={cls}
                                        onClick={() => setFilterClass(isActive ? null : cls)}
                                        className={cn(
                                            'px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest rounded border transition-all font-rajdhani',
                                            isActive
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

                {/* Loadout Cards */}
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
                                isExpanded={selectedLoadoutId === loadout.id}
                                onToggleExpand={() => handleToggleExpand(loadout.id)}
                                onEquip={handleEquip}
                                onRename={handleRename}
                                onUpdateNotes={handleUpdateNotes}
                                onDelete={handleDelete}
                                onResnapshot={handleResnapshot}
                            />
                        ))}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 py-4 border-t border-white/5 text-center">
                    <p className="text-[10px] text-gray-600 font-mono">
                        Loadouts are saved locally in your browser. Items must be on
                        your character to equip.
                    </p>
                </div>
            </div>
        </div>
    );
}
