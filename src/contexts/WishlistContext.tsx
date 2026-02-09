/**
 * Wishlist Context
 * Provides global wishlist state across the app
 */

import { createContext, useContext, ReactNode } from 'react';
import { useWishlist } from '../hooks/useWishlist';

type WishlistContextType = ReturnType<typeof useWishlist>;

const WishlistContext = createContext<WishlistContextType | null>(null);

interface WishlistProviderProps {
    children: ReactNode;
}

export function WishlistProvider({ children }: WishlistProviderProps) {
    const wishlist = useWishlist();

    return (
        <WishlistContext.Provider value={wishlist}>
            {children}
        </WishlistContext.Provider>
    );
}

export function useWishlistContext(): WishlistContextType {
    const context = useContext(WishlistContext);
    if (!context) {
        throw new Error('useWishlistContext must be used within WishlistProvider');
    }
    return context;
}

export { WishlistContext };
