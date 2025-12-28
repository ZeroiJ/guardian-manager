import React, { useState } from 'react';
import { cn } from '../../utils/cn';

interface BungieImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    className?: string;
}

const MISSING_ICON_URL = 'https://www.bungie.net/img/misc/missing_icon_d2.png';

export const BungieImage: React.FC<BungieImageProps> = ({ src, className, alt, ...props }) => {
    // Construct full URL if relative
    // If src is null/undefined, we might render nothing or a placeholder
    const imageUrl = src?.startsWith('/') ? `https://www.bungie.net${src}` : src;

    // Simple Error state
    const [hasError, setHasError] = useState(false);

    // Initial Audit (as requested)
    // console.log('[BungieImage] Render:', imageUrl);

    if (!imageUrl || hasError) {
        return (
            <div className={cn("bg-[#1a1a1a] flex items-center justify-center overflow-hidden", className)}>
                {/* Optional: Show missing icon or just black box */}
                {hasError && <img src={MISSING_ICON_URL} className="w-full h-full opacity-50" alt="Missing" />}
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt={alt || ""}
            className={cn("w-full h-full object-cover", className)}
            onError={() => {
                console.warn('[BungieImage] Failed to load:', imageUrl);
                setHasError(true);
            }}
            loading="lazy"
            {...props}
        />
    );
};