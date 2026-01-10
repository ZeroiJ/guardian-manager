import React from 'react';
import { cn } from '../../utils/cn';

/**
 * Expand a relative bungie.net asset path to a full path.
 */
export function bungieNetPath(src: string | undefined): string {
    if (!src) {
        return '';
    }
    if (src.startsWith('~')) {
        return src.substr(1);
    }
    if (src.startsWith('http')) {
        return src;
    }
    return `https://www.bungie.net${src}`;
}

interface BungieImageProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    className?: string;
}

/**
 * BungieImage - Uses CSS background-image like DIM does for reliable cross-origin loading
 */
export const BungieImage: React.FC<BungieImageProps> = ({ src, className, ...props }) => {
    const imageUrl = bungieNetPath(src);

    if (!imageUrl) {
        return (
            <div className={cn("bg-[#1a1a1a]", className)} {...props} />
        );
    }

    return (
        <div
            className={cn("bg-cover bg-center bg-no-repeat", className)}
            style={{ backgroundImage: `url("${imageUrl}")` }}
            {...props}
        />
    );
};