/**
 * InGameLoadoutCard — Displays a single in-game loadout (Component 205).
 *
 * Visual: Composite icon (colorIcon bg + icon fg, à la DIM) with loadout name
 * and an "Equip" button that calls Bungie's EquipLoadout endpoint directly.
 *
 * Void theme: monochrome, matching the existing LoadoutCard styling.
 */
import React, { useState } from 'react';
import { Zap, Loader2, Check, AlertTriangle, Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { InGameLoadout } from '@/lib/destiny/ingame-loadouts';
import { applyInGameLoadout } from '@/lib/bungie/equipManager';

// ============================================================================
// ICON COMPOSITE
// ============================================================================

/**
 * Renders the in-game loadout icon as a single <img> element
 * with the colorIcon as CSS background and the icon as the foreground src.
 * This mirrors DIM's InGameLoadoutIcon pattern.
 */
const InGameLoadoutIcon: React.FC<{
    loadout: Pick<InGameLoadout, 'colorIcon' | 'icon' | 'index'>;
    size?: number;
}> = ({ loadout, size = 36 }) => {
    const bgUrl = loadout.colorIcon
        ? `url("https://www.bungie.net${loadout.colorIcon}")`
        : undefined;
    const fgSrc = loadout.icon
        ? `https://www.bungie.net${loadout.icon}`
        : undefined;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            {fgSrc ? (
                <img
                    src={fgSrc}
                    alt=""
                    width={size}
                    height={size}
                    loading="lazy"
                    className="block rounded-sm bg-contain bg-center bg-no-repeat"
                    style={bgUrl ? { backgroundImage: bgUrl, backgroundSize: 'contain' } : undefined}
                />
            ) : (
                <div
                    className="w-full h-full rounded-sm bg-white/10 flex items-center justify-center"
                >
                    <Gamepad2 size={size * 0.5} className="text-gray-500" />
                </div>
            )}
            {/* Slot index badge (1-based) */}
            <span
                className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold text-white bg-black/70 rounded-sm px-0.5 leading-none"
                style={{ textShadow: '0 0 3px #000' }}
            >
                {loadout.index + 1}
            </span>
        </div>
    );
};

// ============================================================================
// EQUIP STATE
// ============================================================================

type InGameEquipState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success' }
    | { status: 'error'; message: string };

// ============================================================================
// CARD
// ============================================================================

interface InGameLoadoutCardProps {
    loadout: InGameLoadout;
}

export const InGameLoadoutCard: React.FC<InGameLoadoutCardProps> = ({ loadout }) => {
    const [equipState, setEquipState] = useState<InGameEquipState>({ status: 'idle' });

    const handleEquip = async () => {
        setEquipState({ status: 'loading' });
        try {
            const result = await applyInGameLoadout(loadout.characterId, loadout.index);
            if (result.success) {
                setEquipState({ status: 'success' });
                // Reset after feedback
                setTimeout(() => setEquipState({ status: 'idle' }), 4000);
            } else {
                setEquipState({ status: 'error', message: result.error || 'Equip failed' });
                setTimeout(() => setEquipState({ status: 'idle' }), 6000);
            }
        } catch (err: any) {
            setEquipState({ status: 'error', message: err.message || 'Unknown error' });
            setTimeout(() => setEquipState({ status: 'idle' }), 6000);
        }
    };

    const isLoading = equipState.status === 'loading';

    return (
        <div
            className={cn(
                'group flex items-center gap-3 rounded border px-3 py-2 transition-all duration-200',
                equipState.status === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : equipState.status === 'error'
                    ? 'border-red-500/30 bg-red-500/5'
                    : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5',
            )}
        >
            {/* Icon */}
            <InGameLoadoutIcon loadout={loadout} size={36} />

            {/* Name + status */}
            <div className="flex-1 min-w-0">
                <span className="block text-sm font-bold text-white truncate font-rajdhani tracking-wide leading-none">
                    {loadout.name}
                </span>

                {/* Feedback row */}
                {equipState.status === 'success' && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-emerald-400 font-mono">
                        <Check size={10} strokeWidth={3} />
                        <span>Equipped</span>
                    </div>
                )}
                {equipState.status === 'error' && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-red-400 font-mono">
                        <AlertTriangle size={10} />
                        <span className="truncate">{equipState.message}</span>
                    </div>
                )}
            </div>

            {/* Equip button */}
            <button
                onClick={handleEquip}
                disabled={isLoading}
                className={cn(
                    'flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all font-rajdhani',
                    'border border-white/15 text-gray-300 bg-white/5',
                    'hover:border-white/30 hover:text-white hover:bg-white/10',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                )}
                title="Equip this in-game loadout"
            >
                {isLoading ? (
                    <Loader2 size={12} className="animate-spin" />
                ) : (
                    <Zap size={12} />
                )}
                {isLoading ? '...' : 'Equip'}
            </button>
        </div>
    );
};

export default InGameLoadoutCard;
