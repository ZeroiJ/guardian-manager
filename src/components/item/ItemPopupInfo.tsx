/**
 * Item Popup Info Sub-Components
 * 
 * Reusable pieces for displaying kill tracker, crafted weapon info,
 * deepsight pattern progress, and catalyst progress inside item popups.
 * 
 * Extracted from ItemDetailOverlay.tsx for shared use in both the
 * floating popup (ItemDetailModal) and the full overlay.
 */

import React from 'react';
import { Crosshair, Sword, Sparkles, FlaskConical, Zap } from 'lucide-react';
import type { KillTrackerData, CraftedWeaponData, DeepsightData, CatalystData } from '../../lib/destiny/item-info';
import clsx from 'clsx';

// ============================================================================
// KILL TRACKER
// ============================================================================

interface KillTrackerBadgeProps {
    data: KillTrackerData;
    /** 'compact' = small inline badge, 'full' = wider with label */
    variant?: 'compact' | 'full';
}

/**
 * Renders a kill tracker badge showing the kill count and activity type.
 * Matches DIM's KillTrackerInfo component layout.
 */
export const KillTrackerBadge: React.FC<KillTrackerBadgeProps> = ({ data, variant = 'compact' }) => {
    const colorMap = {
        pvp: { bg: 'rgba(239, 68, 68, 0.06)', border: 'rgba(239, 68, 68, 0.15)', text: 'text-red-400' },
        pve: { bg: 'rgba(96, 165, 250, 0.06)', border: 'rgba(96, 165, 250, 0.15)', text: 'text-blue-400' },
        gambit: { bg: 'rgba(34, 197, 94, 0.06)', border: 'rgba(34, 197, 94, 0.15)', text: 'text-green-400' },
    };
    const colors = colorMap[data.activityType];

    const Icon = data.activityType === 'pvp' ? Crosshair : Sword;

    return (
        <div
            className={clsx("flex items-center gap-1.5 px-2 py-1 text-xs border rounded-sm", variant === 'full' ? 'w-full' : 'w-auto')}
            style={{ backgroundColor: colors.bg, borderColor: colors.border }}
        >
            <Icon size={12} className={colors.text} />
            {variant === 'full' && (
                <span className="text-gray-400">{data.label}</span>
            )}
            <span className="text-gray-300 font-mono tabular-nums font-bold">
                {data.count.toLocaleString()}
            </span>
            {variant === 'compact' && (
                <span className="text-gray-500">{data.label} kills</span>
            )}
        </div>
    );
};

// ============================================================================
// CRAFTED WEAPON INFO
// ============================================================================

interface CraftedWeaponBadgeProps {
    data: CraftedWeaponData;
    /** 'compact' = inline badge, 'full' = wider with progress bar */
    variant?: 'compact' | 'full';
}

/**
 * Renders crafted weapon level + XP progress bar.
 * Matches DIM's WeaponCraftedInfo component.
 */
export const CraftedWeaponBadge: React.FC<CraftedWeaponBadgeProps> = ({ data, variant = 'compact' }) => {
    return (
        <div className={clsx("flex items-center gap-1.5 px-2 py-1 text-xs bg-amber-400/[0.06] border border-amber-400/[0.15] rounded-sm", variant === 'full' ? 'w-full' : 'w-auto')}>
            <Sparkles size={12} className="text-amber-400" />
            <span className="text-amber-300 font-bold">Shaped</span>
            {data.level !== null && (
                <span className="text-gray-400">
                    Lv. <span className="font-mono tabular-nums text-white">{data.level}</span>
                </span>
            )}
            {data.progress !== null && data.progress < 1 && (
                <div className="w-16 h-1.5 bg-white/[0.06] overflow-hidden ml-1">
                    <div
                        className="h-full bg-amber-400/60 transition-all"
                        style={{ width: `${(data.progress * 100).toFixed(1)}%` }}
                    />
                </div>
            )}
        </div>
    );
};

// ============================================================================
// DEEPSIGHT / PATTERN PROGRESS
// ============================================================================

interface DeepsightBadgeProps {
    data: DeepsightData;
    /** 'compact' = inline badge, 'full' = wider */
    variant?: 'compact' | 'full';
}

/**
 * Renders deepsight/pattern progress with objective bars.
 * Matches DIM's WeaponDeepsightInfo component.
 */
export const DeepsightBadge: React.FC<DeepsightBadgeProps> = ({ data, variant = 'compact' }) => {
    if (data.patternComplete || data.objectives.length === 0) return null;

    return (
        <div className={clsx("flex items-center gap-1.5 px-2 py-1 text-xs bg-cyan-400/[0.06] border border-cyan-400/[0.15] rounded-sm", variant === 'full' ? 'w-full flex-col items-start' : 'w-auto')}>
            <div className="flex items-center gap-1.5">
                <FlaskConical size={12} className="text-cyan-400" />
                <span className="text-cyan-300 font-bold">Pattern</span>
            </div>
            <div className={clsx("flex gap-2", variant === 'full' ? 'w-full flex-col' : 'items-center')}>
                {data.objectives.map((obj, i) => {
                    const pct = obj.completionValue
                        ? Math.min(100, ((obj.progress ?? 0) / obj.completionValue) * 100)
                        : 0;
                    return (
                        <div key={i} className={clsx("flex items-center gap-1", variant === 'full' ? 'w-full justify-between' : '')}>
                            <span className="text-gray-400 font-mono tabular-nums">
                                {obj.progress ?? 0}/{obj.completionValue ?? '?'}
                            </span>
                            <div className={clsx("h-1.5 bg-white/[0.06] overflow-hidden", variant === 'full' ? 'flex-1 ml-2' : 'w-12')}>
                                <div
                                    className="h-full bg-cyan-400/60"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================================================
// CATALYST PROGRESS
// ============================================================================

interface CatalystProgressProps {
    data: CatalystData;
    /** 'compact' = single-line summary, 'full' = objective bars */
    variant?: 'compact' | 'full';
}

/**
 * Renders catalyst progress bar(s) for exotic weapons.
 * Only shown when catalyst is unlocked but not yet complete.
 * Matches DIM's WeaponCatalystInfo component.
 */
export const CatalystProgress: React.FC<CatalystProgressProps> = ({ data, variant = 'compact' }) => {
    if (!data.unlocked || data.complete || data.objectives.length === 0) return null;

    if (variant === 'compact') {
        // Compact: single progress bar summary
        const totalProgress = data.objectives.reduce((sum, o) => sum + (o.progress ?? 0), 0);
        const totalCompletion = data.objectives.reduce((sum, o) => sum + (o.completionValue ?? 1), 0);
        const pct = totalCompletion > 0 ? Math.min(100, (totalProgress / totalCompletion) * 100) : 0;

        return (
            <div className="flex items-center gap-1.5 px-2 py-1 text-xs bg-yellow-400/[0.06] border border-yellow-400/[0.15] rounded-sm">
                <Zap size={12} className="text-yellow-400" />
                <span className="text-yellow-300 font-bold">Catalyst</span>
                <span className="text-gray-400 font-mono tabular-nums">
                    {totalProgress.toLocaleString()}/{totalCompletion.toLocaleString()}
                </span>
                <div className="w-12 h-1.5 bg-white/[0.06] overflow-hidden">
                    <div
                        className="h-full bg-yellow-400/60 transition-all"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
        );
    }

    // Full: individual objective bars
    return (
        <div className="w-full">
            <div className="flex items-center gap-1.5 mb-2">
                <Zap size={12} className="text-yellow-400" />
                <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                    Catalyst Progress
                </div>
            </div>
            <div className="space-y-1.5 p-2 bg-yellow-400/[0.02] border border-yellow-400/[0.08] rounded-sm">
                {data.objectives.map((obj, i) => {
                    const progress = obj.progress ?? 0;
                    const completionValue = obj.completionValue ?? 1;
                    const pct = Math.min(100, (progress / completionValue) * 100);
                    return (
                        <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-400">
                                    Objective {data.objectives.length > 1 ? i + 1 : ''}
                                </span>
                                <span className="text-gray-300 font-mono tabular-nums">
                                    {progress.toLocaleString()} / {completionValue.toLocaleString()}
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-white/[0.06] overflow-hidden">
                                <div
                                    className="h-full bg-yellow-400/60 transition-all"
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
