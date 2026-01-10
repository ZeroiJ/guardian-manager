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
    alt?: string; // Kept for compatibility but unused in div
    className?: string;
}

const MISSING_ICON_URL = '/api/image?path=/img/misc/missing_icon_d2.png';

/**
 * BungieImage - PROXIED version.
 * Loads images via our /api/image endpoint to bypass Bungie CDN issues / Browser blocking.
 */
export const BungieImage: React.FC<BungieImageProps> = ({ src, className, alt, ...props }) => {
    // 1. Handle missing/empty src
    if (!src) {
        return (
            <div className={cn("bg-[#1a1a1a] flex items-center justify-center overflow-hidden", className)}>
                <img src={MISSING_ICON_URL} className="w-full h-full opacity-50" alt="Missing" />
            </div>
        );
    }

    // 2. Construct Proxy URL
    // If it's a full URL, strip the domain. If relative, keep it.
    const rawPath = src.startsWith('http') ? new URL(src).pathname : src;
    const proxyUrl = `/api/image?path=${encodeURIComponent(rawPath)}`;

    // 3. Render Image (Background approach to prevent 0-height collapse)
    return (
        <div
            className={cn("w-full h-full bg-cover bg-center bg-no-repeat relative", className)}
            style={{ backgroundImage: `url("${proxyUrl}")` }}
            {...props}
        />
    );
};