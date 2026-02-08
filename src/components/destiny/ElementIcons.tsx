import React from 'react';
import { useDamageTypes } from '../../hooks/useDamageTypes';

/**
 * Element/Damage Type Icon component
 * Fetches icons dynamically from Bungie API via DestinyDamageTypeDefinition manifest
 */

interface ElementIconProps {
    damageTypeHash: number | undefined;
    size?: number;
    className?: string;
}

/**
 * Displays an element icon for a given damage type hash.
 * Uses the useDamageTypes hook to fetch icon paths from the Bungie manifest.
 */
export const ElementIcon: React.FC<ElementIconProps> = ({
    damageTypeHash,
    size = 16,
    className = ''
}) => {
    const { getIconForHash, loading } = useDamageTypes();

    if (!damageTypeHash || loading) return null;

    const iconUrl = getIconForHash(damageTypeHash);
    if (!iconUrl) return null;

    return (
        <img
            src={iconUrl}
            alt="Element"
            className={className}
            style={{ width: size, height: size }}
        />
    );
};

/**
 * Hook to get element icon URL for a damage type hash.
 * Returns null if the hash is not found or still loading.
 */
export function useElementIconUrl(damageTypeHash: number | undefined): string | null {
    const { getIconForHash } = useDamageTypes();
    return getIconForHash(damageTypeHash);
}
