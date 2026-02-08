import React from 'react';

/**
 * Element/Damage Type Icons
 * High-quality SVG icons for all Destiny 2 damage types
 * These are local SVGs that don't depend on Bungie CDN availability
 */

interface ElementIconProps {
    className?: string;
    size?: number;
}

// Arc (Electric Blue) - Lightning bolt design
export const ArcIcon: React.FC<ElementIconProps> = ({ className = '', size = 16 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="15" fill="#79bce1" />
        <path d="M16 4 L11 15 H15 L12 28 L23 13 H18 L21 4 Z" fill="#fff" />
    </svg>
);

// Solar (Orange/Fire) - Sun/flame design
export const SolarIcon: React.FC<ElementIconProps> = ({ className = '', size = 16 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="15" fill="#f97316" />
        <circle cx="16" cy="16" r="7" fill="#fff" />
        <circle cx="16" cy="16" r="4" fill="#f97316" />
    </svg>
);

// Void (Purple) - Spiral/void design
export const VoidIcon: React.FC<ElementIconProps> = ({ className = '', size = 16 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="15" fill="#a855f7" />
        <circle cx="16" cy="16" r="7" fill="none" stroke="#fff" strokeWidth="3" />
    </svg>
);

// Stasis (Ice Blue) - Crystal/diamond design
export const StasisIcon: React.FC<ElementIconProps> = ({ className = '', size = 16 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <polygon points="16,1 31,16 16,31 1,16" fill="#60a5fa" />
        <polygon points="16,8 24,16 16,24 8,16" fill="#fff" />
    </svg>
);

// Strand (Green) - Weave/thread design
export const StrandIcon: React.FC<ElementIconProps> = ({ className = '', size = 16 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="15" fill="#22c55e" />
        <path d="M8 16 Q12 6, 16 16 Q20 26, 24 16" fill="none" stroke="#fff" strokeWidth="3" />
    </svg>
);

// Kinetic (Gray/Silver) - Bullet/physical design
export const KineticIcon: React.FC<ElementIconProps> = ({ className = '', size = 16 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="15" fill="#888888" />
        <circle cx="16" cy="16" r="6" fill="#333" />
        <circle cx="16" cy="16" r="2" fill="#fff" />
    </svg>
);

// Prismatic (Rainbow/Multi) - Prismatic light design
export const PrismaticIcon: React.FC<ElementIconProps> = ({ className = '', size = 16 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <defs>
            <linearGradient id="prismaticGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f97316" />
                <stop offset="25%" stopColor="#eab308" />
                <stop offset="50%" stopColor="#22c55e" />
                <stop offset="75%" stopColor="#60a5fa" />
                <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="15" fill="url(#prismaticGrad)" />
        <polygon points="16,6 22,14 22,22 16,26 10,22 10,14" fill="#fff" fillOpacity="0.9" />
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
    2483051472: PrismaticIcon, // Prismatic (The Final Shape)
};

/**
 * Returns the appropriate element icon component for a given damage type hash
 */
export function getElementIcon(damageTypeHash: number | undefined): React.FC<ElementIconProps> | null {
    if (!damageTypeHash) return null;
    return DAMAGE_TYPE_ICONS[damageTypeHash] || null;
}
