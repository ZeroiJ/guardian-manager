import { cn } from '../../lib/utils';
import { useState } from 'react';



// Helper to safely construct Bungie URLs
export function bungieNetPath(src: string | undefined): string {
    if (!src) return '';
    if (src.startsWith('http')) return src;

    // Clean up any double slashes or missing slashes
    const cleanPath = src.startsWith('/') ? src : `/${src}`;
    return `https://www.bungie.net${cleanPath}`;
}

interface BungieImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    alt?: string;
    fallback?: React.ReactNode;
}

export const BungieImage = ({ src, className, alt = 'Destiny Item', fallback, ...props }: BungieImageProps) => {
    const [error, setError] = useState(false);
    const fullSrc = bungieNetPath(src);

    // DEBUG: temporary logging to catch invisible items
    /*
    useEffect(() => {
        if (!src) console.warn('[BungieImage] Missing src');
        if (error) console.warn('[BungieImage] Failed to load:', fullSrc);
    }, [src, error, fullSrc]);
    */

    if (!src || error) {
        return (
            <div className={cn("bg-[#1a1a1a] flex items-center justify-center overflow-hidden", className)}>
                {fallback || <div className="w-full h-full opacity-50 bg-slate-800" />}
            </div>
        );
    }

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <img
                src={fullSrc}
                alt={alt}
                className={cn("object-cover w-full h-full", className)}
                onError={() => {
                    console.warn('[BungieImage] Load Error:', fullSrc);
                    setError(true);
                }}
                {...props}
            />
        </div>
    );
};
