import { cn } from '../lib/utils';
import { useState } from 'react';



/**
 * Expand a relative bungie.net asset path to a full path.
 */
export function bungieNetPath(src: string | undefined): string {
    if (!src) return '';
    if (src.startsWith('~')) return src.substring(1);
    if (src.startsWith('http')) return src;
    return `https://www.bungie.net${src}`;
}

interface BungieImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    alt?: string;
}

export const BungieImage = ({ src, className, alt = 'Destiny Item', ...props }: BungieImageProps) => {
    const [error, setError] = useState(false);

    const fullSrc = bungieNetPath(src);

    if (!src || error) {
        return (
            <div className={cn("bg-[#1a1a1a] flex items-center justify-center overflow-hidden", className)}>
                <div className="w-full h-full opacity-50 bg-slate-800" />
            </div>
        );
    }

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <img
                src={fullSrc}
                alt={alt}
                className={cn("object-cover w-full h-full", className)}
                onError={() => setError(true)}
                {...props}
            />
        </div>
    );
};
