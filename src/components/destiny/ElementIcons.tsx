import React from 'react';

/**
 * Element/Damage Type Icons
 * Uses official Bungie subclass icons from /public/icons/elements/
 * Kinetic uses SVG since it's not a subclass element
 */

interface ElementIconProps {
    className?: string;
    size?: number;
}

// Image-based icon component for elements with Bungie icons
const ImageElementIcon: React.FC<ElementIconProps & { src: string; alt: string }> = ({
    className = '',
    size = 16,
    src,
    alt
}) => (
    <img
        src={src}
        alt={alt}
        className={className}
        style={{ width: size, height: size }}
    />
);

// Arc (Electric Blue)
export const ArcIcon: React.FC<ElementIconProps> = (props) => (
    <ImageElementIcon {...props} src="/icons/elements/arc.png" alt="Arc" />
);

// Solar (Orange/Fire)
export const SolarIcon: React.FC<ElementIconProps> = (props) => (
    <ImageElementIcon {...props} src="/icons/elements/solar.png" alt="Solar" />
);

// Void (Purple)
export const VoidIcon: React.FC<ElementIconProps> = (props) => (
    <ImageElementIcon {...props} src="/icons/elements/void.png" alt="Void" />
);

// Stasis (Ice Blue)
export const StasisIcon: React.FC<ElementIconProps> = (props) => (
    <ImageElementIcon {...props} src="/icons/elements/stasis.png" alt="Stasis" />
);

// Strand (Green)
export const StrandIcon: React.FC<ElementIconProps> = (props) => (
    <ImageElementIcon {...props} src="/icons/elements/strand.png" alt="Strand" />
);

// Prismatic (Rainbow)
export const PrismaticIcon: React.FC<ElementIconProps> = (props) => (
    <ImageElementIcon {...props} src="/icons/elements/prismatic.png" alt="Prismatic" />
);

// Kinetic (Gray/Silver) - SVG since not a subclass element
export const KineticIcon: React.FC<ElementIconProps> = ({ className = '', size = 16 }) => (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className}>
        <circle cx="16" cy="16" r="15" fill="#888888" />
        <circle cx="16" cy="16" r="6" fill="#333" />
        <circle cx="16" cy="16" r="2" fill="#fff" />
    </svg>
);

// Hash to Component map
export const DAMAGE_TYPE_ICONS: Record<number, React.FC<ElementIconProps>> = {
    2303181850: ArcIcon,       // Arc
    1847026933: SolarIcon,     // Solar
    3454344768: VoidIcon,      // Void
    151347233: StasisIcon,     // Stasis
    3949783978: StrandIcon,    // Strand
    3373582085: KineticIcon,   // Kinetic (no subclass, uses SVG)
    2483051472: PrismaticIcon, // Prismatic (The Final Shape)
};

/**
 * Returns the appropriate element icon component for a given damage type hash
 */
export function getElementIcon(damageTypeHash: number | undefined): React.FC<ElementIconProps> | null {
    if (!damageTypeHash) return null;
    return DAMAGE_TYPE_ICONS[damageTypeHash] || null;
}
