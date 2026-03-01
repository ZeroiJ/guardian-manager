import React from 'react';
import { bungieNetPath } from '../ui/BungieImage';

// ============================================================================
// TYPES
// ============================================================================

export interface PerkCircleProps {
    /** Plug definition from manifest (displayProperties.icon required) */
    plugDef: any;
    /** Visual size in pixels (default 40) */
    size?: number;
    /** State: is this the currently selected plug? */
    isPlugged?: boolean;
    /** State: user has overridden to this plug (not original) */
    isSelected?: boolean;
    /** State: was the original plug but user selected something else */
    isNotSelected?: boolean;
    /** State: perk cannot currently roll on this weapon */
    cannotRoll?: boolean;
    /** State: this is an enhanced perk (gold treatment) */
    isEnhanced?: boolean;
    /** Click handler */
    onClick?: () => void;
    /** Tooltip text */
    title?: string;
}

// ============================================================================
// COLORS (ported from DIM's Plug.m.scss)
// ============================================================================

/** Fill colors for the background circle (behind the icon) */
const STATE_FILLS = {
    none: 'transparent',
    plugged: '#4887ba',          // Solid blue — currently equipped
    selected: '#ceae33',         // Gold accent — user-overridden selection
    notSelected: '#4887ba80',    // Semi-transparent blue — was equipped, now overridden
} as const;

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PerkCircle — SVG-based perk icon with DIM-style circular mask clipping,
 * state-dependent background fill, status ring, and enhanced gold treatment.
 *
 * Ported from DIM: src/app/item-popup/Plug.tsx PerkCircle
 *
 * SVG structure (viewBox 0 0 100 100):
 *   1. Background circle (r=48): state fill (blue/gold/transparent)
 *   2. Enhanced treatment (optional): gold gradient + diamond arrow
 *   3. Circular mask (r=46): clips the icon image to a circle
 *   4. Icon image (80x80 at offset 10,10): the perk icon
 *   5. Outline circle (r=46, stroke-only): white outline, dashed for cannotRoll
 */
const PerkCircle: React.FC<PerkCircleProps> = ({
    plugDef,
    size = 40,
    isPlugged = false,
    isSelected = false,
    isNotSelected = false,
    cannotRoll = false,
    isEnhanced = false,
    onClick,
    title,
}) => {
    const icon = plugDef?.displayProperties?.icon;
    if (!icon) return null;

    // Determine fill for background circle
    let fillColor: string;
    if (isSelected) {
        fillColor = STATE_FILLS.selected;
    } else if (isPlugged) {
        fillColor = STATE_FILLS.plugged;
    } else if (isNotSelected) {
        fillColor = STATE_FILLS.notSelected;
    } else {
        fillColor = STATE_FILLS.none;
    }

    // Unique IDs scoped to this instance (avoid SVG def collisions)
    const uid = React.useId();
    const maskId = `perk-mask-${uid}`;
    const gradId = `perk-mw-${uid}`;

    return (
        <svg
            viewBox="0 0 100 100"
            width={size}
            height={size}
            className="block cursor-pointer"
            style={{ WebkitTouchCallout: 'none' }}
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            aria-label={title}
        >
            <title>{title}</title>

            <defs>
                {/* Gold gradient for enhanced perks */}
                {isEnhanced && (
                    <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                        <stop stopColor="#eade8b" offset="50%" stopOpacity="0" />
                        <stop stopColor="#eade8b" offset="100%" stopOpacity="1" />
                    </linearGradient>
                )}
                {/* Circular mask that clips icon to circle */}
                <mask id={maskId}>
                    <rect x="0" y="0" width="100" height="100" fill="black" />
                    <circle cx="50" cy="50" r="46" fill="white" />
                </mask>
            </defs>

            {/* 1. Background fill circle */}
            <circle cx="50" cy="50" r="48" fill={fillColor} />

            {/* 2. Enhanced perk treatment: gold gradient overlay + left bar */}
            {isEnhanced && (
                <>
                    <rect x="0" y="0" width="100" height="100" fill={`url(#${gradId})`} mask={`url(#${maskId})`} />
                    <rect x="5" y="0" width="6" height="100" fill="#eade8b" mask={`url(#${maskId})`} />
                </>
            )}

            {/* 3. Perk icon image (clipped to circle) */}
            <image
                href={bungieNetPath(icon)}
                x="10"
                y="10"
                width="80"
                height="80"
                mask={`url(#${maskId})`}
            />

            {/* 4. Outline ring */}
            <circle
                cx="50"
                cy="50"
                r="46"
                fill="transparent"
                stroke="white"
                strokeWidth="2"
                strokeOpacity="0.6"
                strokeDasharray={cannotRoll ? '12 6' : 'none'}
                strokeDashoffset={cannotRoll ? -4 : 0}
                className="transition-all"
            />

            {/* 5. Enhanced diamond arrow indicator */}
            {isEnhanced && (
                <path d="M5,50 l0,-24 l-6,0 l9,-16 l9,16 l-6,0 l0,24 z" fill="#eade8b" />
            )}

            {/* 6. Hover highlight ring (invisible by default, visible on hover via CSS) */}
            <circle
                cx="50"
                cy="50"
                r="46"
                fill="transparent"
                stroke="#ceae33"
                strokeWidth="4"
                opacity="0"
                className="transition-opacity hover-ring"
            />

            <style>{`
                svg:hover .hover-ring { opacity: 0.6; }
            `}</style>
        </svg>
    );
};

export default PerkCircle;
export { PerkCircle };
