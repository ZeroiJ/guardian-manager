import React from 'react';
import { BungieImage } from '../ui/BungieImage';

/**
 * Element/Damage Type Icons using official Bungie CDN images
 * 
 * Icon paths from Bungie manifest DamageType definitions:
 * - Arc: /common/destiny2_content/icons/DestinyDamageTypeDefinition_092d066f42e76f40.png
 * - Solar: /common/destiny2_content/icons/DestinyDamageTypeDefinition_2a1773e1ce0b5af5.png
 * - Void: /common/destiny2_content/icons/DestinyDamageTypeDefinition_ceb2f6197dccf3ec.png
 * - Stasis: /common/destiny2_content/icons/DestinyDamageTypeDefinition_530c4c3e7981dc2e.png
 * - Strand: /common/destiny2_content/icons/DestinyDamageTypeDefinition_0397f43dc2d797a5.png
 * - Kinetic: /common/destiny2_content/icons/DestinyDamageTypeDefinition_3385a924fd3ccb92.png
 * - Prismatic: /common/destiny2_content/icons/DestinyDamageTypeDefinition_a21c0bb8b29d7dd9.png
 */

interface ElementIconProps {
    className?: string;
    size?: number;
}

// Official Bungie CDN paths for damage type icons
const DAMAGE_TYPE_ICON_PATHS: Record<number, string> = {
    // Arc (2303181850)
    2303181850: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_092d066f42e76f40.png',
    // Solar (1847026933)
    1847026933: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_2a1773e1ce0b5af5.png',
    // Void (3454344768)
    3454344768: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_ceb2f6197dccf3ec.png',
    // Stasis (151347233)
    151347233: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_530c4c3e7981dc2e.png',
    // Strand (3949783978)
    3949783978: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_0397f43dc2d797a5.png',
    // Kinetic (3373582085)
    3373582085: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_3385a924fd3ccb92.png',
    // Prismatic (2483051472) - The Final Shape
    2483051472: '/common/destiny2_content/icons/DestinyDamageTypeDefinition_a21c0bb8b29d7dd9.png',
};

/**
 * Element icon component that uses official Bungie images
 */
const ElementIcon: React.FC<ElementIconProps & { iconPath: string }> = ({
    className = '',
    size = 16,
    iconPath
}) => (
    <BungieImage
        src={iconPath}
        alt="Element"
        className={className}
        style={{ width: size, height: size }}
    />
);

// Create named components for each element (for backward compatibility)
export const ArcIcon: React.FC<ElementIconProps> = (props) => (
    <ElementIcon {...props} iconPath={DAMAGE_TYPE_ICON_PATHS[2303181850]} />
);

export const SolarIcon: React.FC<ElementIconProps> = (props) => (
    <ElementIcon {...props} iconPath={DAMAGE_TYPE_ICON_PATHS[1847026933]} />
);

export const VoidIcon: React.FC<ElementIconProps> = (props) => (
    <ElementIcon {...props} iconPath={DAMAGE_TYPE_ICON_PATHS[3454344768]} />
);

export const StasisIcon: React.FC<ElementIconProps> = (props) => (
    <ElementIcon {...props} iconPath={DAMAGE_TYPE_ICON_PATHS[151347233]} />
);

export const StrandIcon: React.FC<ElementIconProps> = (props) => (
    <ElementIcon {...props} iconPath={DAMAGE_TYPE_ICON_PATHS[3949783978]} />
);

export const KineticIcon: React.FC<ElementIconProps> = (props) => (
    <ElementIcon {...props} iconPath={DAMAGE_TYPE_ICON_PATHS[3373582085]} />
);

export const PrismaticIcon: React.FC<ElementIconProps> = (props) => (
    <ElementIcon {...props} iconPath={DAMAGE_TYPE_ICON_PATHS[2483051472]} />
);

// Hash to Component map
export const DAMAGE_TYPE_ICONS: Record<number, React.FC<ElementIconProps>> = {
    2303181850: ArcIcon,
    1847026933: SolarIcon,
    3454344768: VoidIcon,
    151347233: StasisIcon,
    3949783978: StrandIcon,
    3373582085: KineticIcon,
    2483051472: PrismaticIcon,
};

/**
 * Returns the appropriate element icon component for a given damage type hash
 */
export function getElementIcon(damageTypeHash: number | undefined): React.FC<ElementIconProps> | null {
    if (!damageTypeHash) return null;
    return DAMAGE_TYPE_ICONS[damageTypeHash] || null;
}

/**
 * Get the icon path directly for a damage type hash
 */
export function getElementIconPath(damageTypeHash: number | undefined): string | null {
    if (!damageTypeHash) return null;
    return DAMAGE_TYPE_ICON_PATHS[damageTypeHash] || null;
}
