/**
 * LoadoutDrawer — Phase 5: The "Snapshot" Engine
 *
 * A right-side sliding panel for managing saved loadouts.
 * Void theme: monochrome, backdrop-blur, Rajdhani headers.
 *
 * Features:
 *  - Character selector for snapshotting
 *  - "Capture Current Loadout" with inline name input
 *  - Saved loadout list with Equip, Rename, Delete
 *  - Equip result feedback (success / partial / failure)
 *
 * DIM reference: src/app/loadout-drawer/LoadoutDrawer.tsx
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    X,
    Camera,
    Zap,
    Pencil,
    Trash2,
    ChevronDown,
    Check,
    AlertTriangle,
    Loader2,
    Package,
    Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    useLoadoutStore,
    ILoadout,
    CLASS_NAMES,
    formatLoadoutDate,
} from '@/store/loadoutStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { applyLoadout, ApplyLoadoutResult } from '@/lib/bungie/equipManager';

// ============================================================================
// TYPES
// ============================================================================

interface LoadoutDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

type EquipState =
    | { status: 'idle' }
    | { status: 'loading'; loadoutId: string }
    | { status: 'success'; loadoutId: string; result: ApplyLoadoutResult }
    | { status: 'error'; loadoutId: string; message: string };

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Slim horizontal rule used between sections */
const Divider: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn('h-px bg-white/10 mx-4', className)} />
);

/** Character class badge pill */
const ClassBadge: React.FC<{ classType: number }> = ({ classType }) => {
    const colors: Record<number, string> = {
        0: 'text-orange-400 border-orange-400/30 bg-orange-400/10',  // Titan
        1: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',         // Hunter
        2: 'text-purple-400 border-purple-400/30 bg-purple-400/10',   // Warlock
    };
    const name = CLASS_NAMES[classType] ?? 'Unknown';
    return (
        <span
            className={cn(
                'inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest border rounded-sm leading-none',
                colors[classType] ?? 'text-gray-400 border-gray-400/30 bg-gray-400/10'
            )}
        >
            {name}
        </span>
    );
};

/** Item count chip */
const ItemCount: React.FC<{ count: number }> = ({ count }) => (
    <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 font-mono">
        <Package size={10} />
        {count}
    </span>
);

// ============================================================================
// EQUIP RESULT TOAST (inline, per loadout card)
// ============================================================================

const EquipResultBadge: React.FC<{ result: ApplyLoadoutResult }> = ({ result }) => {
    if (result.success) {
        return (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                <Check size={12} strokeWidth={3} />
                <span>All {result.equipped.length} items equipped</span>
            </div>
        );
    }

    return (
        <div className="space-y-1">
            {result.equipped.length > 0 && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                    <Check size={12} strokeWidth={3} />
                    <span>{result.equipped.length} equipped</span>
                </div>
            )}
            {result.failed.map((f, i) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px] text-amber-400 font-mono">
                    <AlertTriangle size={12} className="mt-px flex-shrink-0" />
                    <span className="leading-tight">{f.reason}</span>
                </div>
            ))}
        </div>
    );
};

// ============================================================================
// LOADOUT CARD
// ============================================================================

interface LoadoutCardProps {
    loadout: ILoadout;
    characters: Record<string, any>;
    equipState: EquipState;
    onEquip: (loadout: ILoadout, targetCharacterId: string) => void;
    onRename: (loadout: ILoadout, newName: string) => void;
    onDelete: (loadout: ILoadout) => void;
}

const LoadoutCard: React.FC<LoadoutCardProps> = ({
    loadout,
    characters,
    equipState,
    onEquip,
    onRename,
    onDelete,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(loadout.name);
    const [showEquipPicker, setShowEquipPicker] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const editRef = useRef<HTMLInputElement>(null);
    const pickerRef = useRef<HTMLDivElement>(null);

    const isThisEquipping =
        equipState.status === 'loading' && equipState.loadoutId === loadout.id;
    const thisResult =
        (equipState.status === 'success' || equipState.status === 'error') &&
        equipState.loadoutId === loadout.id
            ? equipState
            : null;

    const charList = Object.values(characters) as any[];

    // Focus input on edit start
    useEffect(() => {
        if (isEditing) editRef.current?.focus();
    }, [isEditing]);

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
            setEditName(loadout.name); // revert on empty
        }
        setIsEditing(false);
    };

    const handleEquipOnChar = (charId: string) => {
        setShowEquipPicker(false);
        onEquip(loadout, charId);
    };

    return (
        <div
            className={cn(
                'group relative rounded border transition-all duration-200',
                thisResult?.status === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : thisResult?.status === 'error'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5'
            )}
        >
            {/* Card Header */}
            <div className="flex items-start justify-between gap-2 p-3 pb-2">
                {/* Name (editable) */}
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            ref={editRef}
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onBlur={handleRenameSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameSubmit();
                                if (e.key === 'Escape') {
                                    setEditName(loadout.name);
                                    setIsEditing(false);
                                }
                            }}
                            className="w-full bg-transparent border-b border-white/30 text-sm font-bold text-white outline-none pb-px font-rajdhani tracking-wide"
                        />
                    ) : (
                        <span
                            className="block text-sm font-bold text-white truncate font-rajdhani tracking-wide leading-none cursor-default"
                            title={loadout.name}
                        >
                            {loadout.name}
                        </span>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-2 mt-1.5">
                        <ClassBadge classType={loadout.characterClass} />
                        <ItemCount count={loadout.items.length} />
                        <span className="text-[10px] text-gray-600 font-mono">
                            {formatLoadoutDate(loadout.updatedAt)}
                        </span>
                    </div>
                </div>

                {/* Action Icons */}
                <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => setIsEditing(true)}
                        className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        title="Rename"
                    >
                        <Pencil size={12} />
                    </button>
                    {!confirmDelete ? (
                        <button
                            onClick={() => setConfirmDelete(true)}
                            className="p-1 rounded text-gray-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                            title="Delete"
                        >
                            <Trash2 size={12} />
                        </button>
                    ) : (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => onDelete(loadout)}
                                className="px-1.5 py-0.5 text-[10px] font-bold text-red-400 border border-red-400/40 rounded hover:bg-red-400/20 transition-colors uppercase tracking-wider"
                            >
                                Sure?
                            </button>
                            <button
                                onClick={() => setConfirmDelete(false)}
                                className="p-1 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                <X size={10} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Equip Result (if any) */}
            {thisResult?.status === 'success' && (
                <div className="px-3 pb-2">
                    <EquipResultBadge result={thisResult.result} />
                </div>
            )}
            {thisResult?.status === 'error' && (
                <div className="px-3 pb-2 flex items-center gap-1.5 text-[11px] text-red-400 font-mono">
                    <AlertTriangle size={12} />
                    <span>{thisResult.message}</span>
                </div>
            )}

            {/* Equip Button */}
            <div className="px-3 pb-3">
                {charList.length === 1 ? (
                    // Single character — direct equip
                    <button
                        onClick={() => handleEquipOnChar(charList[0].characterId)}
                        disabled={isThisEquipping}
                        className={cn(
                            'w-full flex items-center justify-center gap-2 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all',
                            'border border-white/15 text-gray-300 bg-white/5',
                            'hover:border-white/30 hover:text-white hover:bg-white/10',
                            'disabled:opacity-40 disabled:cursor-not-allowed',
                            'font-rajdhani'
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
                    // Multiple characters — show picker
                    <div ref={pickerRef} className="relative">
                        <button
                            onClick={() => setShowEquipPicker((v) => !v)}
                            disabled={isThisEquipping}
                            className={cn(
                                'w-full flex items-center justify-center gap-2 py-1.5 rounded text-xs font-bold uppercase tracking-widest transition-all',
                                'border border-white/15 text-gray-300 bg-white/5',
                                'hover:border-white/30 hover:text-white hover:bg-white/10',
                                'disabled:opacity-40 disabled:cursor-not-allowed',
                                'font-rajdhani'
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
                            <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#0d0d0d] border border-white/15 rounded shadow-2xl overflow-hidden z-10">
                                {charList.map((char: any) => {
                                    const classNames: Record<number, string> = {
                                        0: 'Titan',
                                        1: 'Hunter',
                                        2: 'Warlock',
                                    };
                                    return (
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
                                                {classNames[char.classType] ?? 'Guardian'}
                                            </span>
                                            <span className="ml-auto text-[10px] text-gray-600 font-mono">
                                                {char.light}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================================================
// CAPTURE PANEL (top section of drawer)
// ============================================================================

interface CapturePanelProps {
    characters: Record<string, any>;
    onCapture: (characterId: string, name: string) => void;
}

const CapturePanel: React.FC<CapturePanelProps> = ({ characters, onCapture }) => {
    const [selectedCharId, setSelectedCharId] = useState<string>('');
    const [name, setName] = useState('');
    const [flash, setFlash] = useState(false);

    const charList = Object.values(characters) as any[];
    const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };

    // Auto-select first character on mount
    useEffect(() => {
        if (charList.length > 0 && !selectedCharId) {
            setSelectedCharId(charList[0].characterId);
        }
    }, [charList, selectedCharId]);

    const handleCapture = () => {
        if (!selectedCharId) return;
        onCapture(selectedCharId, name);
        setName('');
        // Flash feedback
        setFlash(true);
        setTimeout(() => setFlash(false), 600);
    };

    if (charList.length === 0) {
        return (
            <div className="p-4 text-center text-xs text-gray-600 font-mono">
                No characters loaded. Refresh your profile.
            </div>
        );
    }

    return (
        <div className="p-4 space-y-3">
            {/* Section label */}
            <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold font-rajdhani">
                Capture Loadout
            </h3>

            {/* Character Selector */}
            {charList.length > 1 && (
                <div className="flex gap-1.5">
                    {charList.map((char: any) => (
                        <button
                            key={char.characterId}
                            onClick={() => setSelectedCharId(char.characterId)}
                            className={cn(
                                'flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded border text-[10px] font-bold uppercase tracking-widest transition-all font-rajdhani',
                                selectedCharId === char.characterId
                                    ? 'border-white/30 text-white bg-white/8'
                                    : 'border-white/8 text-gray-500 hover:border-white/20 hover:text-gray-300'
                            )}
                        >
                            {char.emblemPath ? (
                                <img
                                    src={`https://www.bungie.net${char.emblemPath}`}
                                    className="w-6 h-6 rounded-sm object-cover bg-gray-800"
                                    alt=""
                                />
                            ) : (
                                <Shield size={16} />
                            )}
                            {classNames[char.classType] ?? '?'}
                        </button>
                    ))}
                </div>
            )}

            {/* Name Input */}
            <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCapture()}
                placeholder="Name this loadout (optional)"
                maxLength={48}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-white/30 transition-colors font-mono text-[12px]"
            />

            {/* Capture Button */}
            <button
                onClick={handleCapture}
                disabled={!selectedCharId}
                className={cn(
                    'w-full flex items-center justify-center gap-2 py-2.5 rounded border text-sm font-bold uppercase tracking-widest transition-all font-rajdhani',
                    flash
                        ? 'border-emerald-400/60 text-emerald-400 bg-emerald-400/10'
                        : 'border-white/20 text-white bg-white/8 hover:bg-white/15 hover:border-white/35',
                    'disabled:opacity-40 disabled:cursor-not-allowed'
                )}
            >
                {flash ? (
                    <>
                        <Check size={14} strokeWidth={3} />
                        Captured!
                    </>
                ) : (
                    <>
                        <Camera size={14} />
                        Snapshot Current Gear
                    </>
                )}
            </button>
        </div>
    );
};

// ============================================================================
// MAIN DRAWER
// ============================================================================

export const LoadoutDrawer: React.FC<LoadoutDrawerProps> = ({ isOpen, onClose }) => {
    const loadouts = useLoadoutStore((s) => s.loadouts);
    const saveCurrentLoadout = useLoadoutStore((s) => s.saveCurrentLoadout);
    const deleteLoadout = useLoadoutStore((s) => s.deleteLoadout);
    const renameLoadout = useLoadoutStore((s) => s.renameLoadout);

    const characters = useInventoryStore((s) => s.characters);

    const [equipState, setEquipState] = useState<EquipState>({ status: 'idle' });
    const drawerRef = useRef<HTMLDivElement>(null);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // Reset equip feedback after 6 seconds
    useEffect(() => {
        if (equipState.status === 'success' || equipState.status === 'error') {
            const timer = setTimeout(() => setEquipState({ status: 'idle' }), 6000);
            return () => clearTimeout(timer);
        }
    }, [equipState]);

    const handleCapture = useCallback(
        (characterId: string, name: string) => {
            const created = saveCurrentLoadout(characterId, name);
            if (!created) {
                console.warn('[LoadoutDrawer] Capture failed — no equipped items found.');
            }
        },
        [saveCurrentLoadout]
    );

    const handleEquip = useCallback(
        async (loadout: ILoadout, targetCharacterId: string) => {
            setEquipState({ status: 'loading', loadoutId: loadout.id });
            try {
                const result = await applyLoadout(targetCharacterId, loadout);
                setEquipState({ status: 'success', loadoutId: loadout.id, result });
            } catch (err) {
                const message =
                    err instanceof Error ? err.message : 'Unknown equip error';
                console.error('[LoadoutDrawer] Equip failed:', err);
                setEquipState({ status: 'error', loadoutId: loadout.id, message });
            }
        },
        []
    );

    const handleRename = useCallback(
        (loadout: ILoadout, newName: string) => {
            renameLoadout(loadout.id, newName);
        },
        [renameLoadout]
    );

    const handleDelete = useCallback(
        (loadout: ILoadout) => {
            deleteLoadout(loadout.id);
            // Reset equip state if it was for the deleted loadout
            setEquipState((prev) =>
                (prev.status === 'loading' || prev.status === 'success' || prev.status === 'error') &&
                prev.loadoutId === loadout.id
                    ? { status: 'idle' }
                    : prev
            );
        },
        [deleteLoadout]
    );

    return (
        <>
            {/* Backdrop */}
            <div
                className={cn(
                    'fixed inset-0 z-40 bg-black/60 transition-opacity duration-300',
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                )}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer Panel */}
            <div
                ref={drawerRef}
                className={cn(
                    // Layout
                    'fixed top-0 right-0 bottom-0 z-50 w-80 flex flex-col',
                    // Void Theme
                    'bg-black/90 backdrop-blur-md border-l border-white/10',
                    // Slide animation
                    'transition-transform duration-300 ease-in-out',
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                )}
                aria-label="Loadouts panel"
                role="dialog"
                aria-modal="true"
            >
                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between px-4 h-12 border-b border-white/10 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Shield size={14} className="text-gray-500" />
                        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-white font-rajdhani">
                            Loadouts
                        </h2>
                        {loadouts.length > 0 && (
                            <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white/8 text-gray-400 rounded-sm leading-none border border-white/10">
                                {loadouts.length}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Close loadouts"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* ── Scrollable Body ─────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto overscroll-contain scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">

                    {/* Capture Panel */}
                    <CapturePanel characters={characters} onCapture={handleCapture} />

                    <Divider />

                    {/* Saved Loadouts */}
                    <div className="p-4 space-y-2">
                        {loadouts.length === 0 ? (
                            // Empty state
                            <div className="py-8 flex flex-col items-center gap-3 text-center">
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Package size={18} className="text-gray-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-400 font-rajdhani tracking-wide">
                                        No Saved Loadouts
                                    </p>
                                    <p className="text-[11px] text-gray-600 mt-1 leading-relaxed">
                                        Snapshot your current gear
                                        <br />
                                        using the button above.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Section label */}
                                <h3 className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold font-rajdhani pb-1">
                                    Saved ({loadouts.length})
                                </h3>

                                {/* Loadout cards */}
                                {loadouts.map((loadout) => (
                                    <LoadoutCard
                                        key={loadout.id}
                                        loadout={loadout}
                                        characters={characters}
                                        equipState={equipState}
                                        onEquip={handleEquip}
                                        onRename={handleRename}
                                        onDelete={handleDelete}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                </div>

                {/* ── Footer ─────────────────────────────────────────── */}
                <div className="flex-shrink-0 border-t border-white/10 px-4 py-3">
                    <p className="text-[10px] text-gray-600 font-mono leading-relaxed">
                        Loadouts are saved locally.
                        <br />
                        Items must be on your character to equip.
                    </p>
                </div>
            </div>
        </>
    );
};

export default LoadoutDrawer;
