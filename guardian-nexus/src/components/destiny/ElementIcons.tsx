import React from 'react';

// SVG Element/Damage Type Icons - Local versions that don't depend on Bungie CDN
// These are simplified versions of the official icons

interface ElementIconProps {
    className?: string;
    size?: number;
}

// Arc (Electric Blue)
export const ArcIcon: React.FC<ElementIconProps> = ({ className = '', size = 12 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="14" fill="#79bce1" />
        <path d="M16 4 L12 16 H16 L13 28 L22 14 H17 L20 4 Z" fill="#fff" opacity="0.9" />
    </svg>
);

// Solar (Orange/Fire)
export const SolarIcon: React.FC<ElementIconProps> = ({ className = '', size = 12 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="14" fill="#f0631e" />
        <circle cx="16" cy="16" r="8" fill="#fff" opacity="0.9" />
        <circle cx="16" cy="16" r="5" fill="#f0631e" opacity="0.7" />
    </svg>
);

// Void (Purple)
export const VoidIcon: React.FC<ElementIconProps> = ({ className = '', size = 12 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="14" fill="#b184c5" />
        <circle cx="16" cy="16" r="8" fill="transparent" stroke="#fff" strokeWidth="3" opacity="0.9" />
    </svg>
);

// Stasis (Ice Blue/Cyan)
export const StasisIcon: React.FC<ElementIconProps> = ({ className = '', size = 12 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <polygon points="16,2 30,16 16,30 2,16" fill="#4d88ff" />
        <polygon points="16,8 24,16 16,24 8,16" fill="#fff" opacity="0.8" />
    </svg>
);

// Strand (Green)
export const StrandIcon: React.FC<ElementIconProps> = ({ className = '', size = 12 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="14" fill="#35d081" />
        <path d="M8 16 Q12 8, 16 16 Q20 24, 24 16" fill="none" stroke="#fff" strokeWidth="3" opacity="0.9" />
    </svg>
);

// Kinetic (Gray/White)
export const KineticIcon: React.FC<ElementIconProps> = ({ className = '', size = 12 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="14" fill="#d0d0d0" />
        <circle cx="16" cy="16" r="6" fill="#333" />
    </svg>
);

// Hash to Component map
export const DAMAGE_TYPE_ICONS: Record<number, React.FC<ElementIconProps>> = {
    2303181850: ArcIcon,     // Arc
    1847026933: SolarIcon,   // Solar
    3454344768: VoidIcon,    // Void
    151347233: StasisIcon,   // Stasis
    3949783978: StrandIcon,  // Strand
    3373582085: KineticIcon, // Kinetic
};

/**
 * Returns the appropriate element icon component for a given damage type hash
 */
export function getElementIcon(damageTypeHash: number | undefined): React.FC<ElementIconProps> | null {
    if (!damageTypeHash) return null;
    return DAMAGE_TYPE_ICONS[damageTypeHash] || null;
}
