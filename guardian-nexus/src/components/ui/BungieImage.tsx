import React, { useState } from 'react';
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

interface BungieImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    className?: string;
}

const MISSING_ICON_URL = 'https://www.bungie.net/img/misc/missing_icon_d2.png';

export const BungieImage: React.FC<BungieImageProps> = ({ src, className, alt, ...props }) => {
    const imageUrl = bungieNetPath(src);
    const [hasError, setHasError] = useState(false);

    // DEBUG: Trace icon paths
    // if (Math.random() < 0.01) console.log('[BungieImage] Render:', imageUrl);

    if (!imageUrl || hasError) {
        return (
            <div className={cn("bg-[#1a1a1a] flex items-center justify-center overflow-hidden", className)}>
                {/* Fallback to grey box if URL is empty, or Missing Icon if Error */}
                {hasError && <img src={MISSING_ICON_URL} className="w-full h-full opacity-50" alt="Missing" />}
            </div>
        );
    }

    return (
        <img
            src={imageUrl}
            alt={alt || ""}
            className={cn("w-full h-full object-cover", className)}
            onError={(e) => {
                console.warn('[BungieImage] Failed to load:', imageUrl);
                setHasError(true);
            }}
            loading="lazy"
            {...props}
        />
    );
};