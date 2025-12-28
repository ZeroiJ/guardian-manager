import React, { useState, useEffect, useRef } from 'react';
import { cn } from '../../utils/cn';

interface BungieImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
    src?: string;
    className?: string;
}

export const BungieImage: React.FC<BungieImageProps> = ({ src, className, alt, ...props }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    // Construct full URL if relative
    const imageUrl = src?.startsWith('/') ? `https://www.bungie.net${src}` : src;

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '50px' } // Load slightly before view
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    if (!imageUrl) return <div className={cn("bg-[#1a1a1a]", className)} />;

    return (
        <div className={cn("relative overflow-hidden bg-[#1a1a1a]", className)}>
            {isVisible && (
                <img
                    ref={imgRef}
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
