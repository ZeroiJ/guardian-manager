'use client';

import Image, { ImageProps, ImageLoaderProps } from 'next/image';
import { cn } from '../lib/utils';
import { useState } from 'react';

const MISSING_ICON_URL = '/img/misc/missing_icon_d2.png';

/**
 * Expand a relative bungie.net asset path to a full path.
 */
export function bungieNetPath(src: string | undefined): string {
    if (!src) return '';
    if (src.startsWith('~')) return src.substring(1);
    if (src.startsWith('http')) return src;
    return `https://www.bungie.net${src}`;
}

const bungieLoader = ({ src, width, quality }: ImageLoaderProps) => {
    if (src.startsWith('http')) return src;
    return `https://www.bungie.net${src}?w=${width}&q=${quality || 75}`;
};

interface BungieImageProps extends Omit<ImageProps, 'src' | 'alt' | 'loader'> {
    src?: string;
    alt?: string;
}

export const BungieImage = ({ src, className, alt = 'Destiny Item', ...props }: BungieImageProps) => {
    const [error, setError] = useState(false);

    if (!src || error) {
        return (
            <div className={cn("bg-[#1a1a1a] flex items-center justify-center overflow-hidden", className)}>
                {/* Fallback using next/image as well, pointing to Bungie missing icon but standard loader might act up if path is weird so we use standard img for fallback safely? 
                    Actually, let's use a local fallback or generic placeholder. 
                    For now, matching legacy behavior. 
                */}
                <div className="w-full h-full opacity-50 bg-slate-800" />
            </div>
        );
    }

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <Image
                src={src}
                alt={alt}
                loader={bungieLoader}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="object-cover"
                onError={() => setError(true)}
                {...props}
            />
        </div>
    );
};
