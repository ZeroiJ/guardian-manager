import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface BungieImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    className?: string;
}

export const BungieImage: React.FC<BungieImageProps> = ({ src, className, alt, ...props }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Construct full URL if relative
    const imageUrl = src?.startsWith('/') ? `https://www.bungie.net${src}` : src;

    // 1. Audit: Debug Log (Sampled)
    useEffect(() => {
        if (imageUrl && Math.random() < 0.05) { 
            console.log('[BungieImage] Loading:', imageUrl);
        }
    }, [imageUrl]);

    // 2. Re-Initialize Observer
    useEffect(() => {
        if (!imageUrl) return;

        // Reset states when URL changes (recycling)
        setIsVisible(false);
        setIsLoaded(false);

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px' }
        );

        if (wrapperRef.current) {
            observer.observe(wrapperRef.current);
        }

        return () => observer.disconnect();
    }, [imageUrl]); 

    if (!imageUrl) return <div className={cn("bg-[#1a1a1a]", className)} />;

    return (
        <div ref={wrapperRef} className={cn("relative overflow-hidden bg-[#1a1a1a]", className)}>
            {isVisible && (
                <img
                    src={imageUrl}
                    alt={alt || ""}
                    className={cn(
                        "w-full h-full object-cover transition-opacity duration-300 ease-in-out",
                        isLoaded ? "opacity-100" : "opacity-0"
                    )}
                    onLoad={() => setIsLoaded(true)}
                    {...props}
                />
            )}
        </div>
    );
};