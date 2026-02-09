import React, { useState } from 'react';
import { BungieImage } from '../ui/BungieImage';
import { SocketCategoryHashes } from '../../lib/destiny-constants';
import { ThumbsUp } from 'lucide-react';
import {
    useFloating,
    offset,
    flip,
    shift,
    autoUpdate,
    FloatingPortal,
    useHover,
    useFocus,
    useDismiss,
    useInteractions,
    useRole
} from '@floating-ui/react';

interface ItemSocketProps {
    /** The plug definition from the manifest */
    plugDef: any;
    /** The socket category hash for styling */
    categoryHash: number;
    /** Whether the plug is currently active/enabled */
    isActive?: boolean;
    /** Whether this perk is part of a wishlist roll */
    isWishlistPerk?: boolean;
}

/**
 * ItemSocket Component
 * 
 * Renders a single socket/perk with appropriate styling:
 * - Gold border for intrinsic/exotic perks
 * - White border for active perks
 * - Gray border for inactive perks
 * - Portaled tooltip that escapes popup overflow constraints
 */
export const ItemSocket: React.FC<ItemSocketProps> = ({
    plugDef,
    categoryHash,
    isActive = true,
    isWishlistPerk = false
}) => {
    const [isOpen, setIsOpen] = useState(false);

    // Floating UI setup for portaled tooltip
    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement: 'top',
        middleware: [
            offset(8),
            flip({ fallbackPlacements: ['bottom', 'left', 'right'] }),
            shift({ padding: 8 })
        ],
        whileElementsMounted: autoUpdate
    });

    // Interaction hooks
    const hover = useHover(context, { delay: { open: 100, close: 0 } });
    const focus = useFocus(context);
    const dismiss = useDismiss(context);
    const role = useRole(context, { role: 'tooltip' });

    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        focus,
        dismiss,
        role
    ]);

    if (!plugDef?.displayProperties?.icon) {
        return null;
    }

    // Check if this is an intrinsic/exotic perk (Frame)
    const isIntrinsic = categoryHash === 3956125808 ||
        categoryHash === SocketCategoryHashes.IntrinsicTraits ||
        categoryHash === SocketCategoryHashes.ArmorPerks_LargePerk;

    // Shape: Square for Intrinsic, Circle for everything else
    const shapeClass = isIntrinsic ? 'rounded-sm' : 'rounded-full';

    // Border: Gold for Intrinsic, Green for Wishlist, White/Gray for others
    const getBorderClasses = () => {
        if (isIntrinsic) {
            return 'border-[#e2bf36]'; // DIM Gold
        }
        if (isWishlistPerk) {
            return 'border-green-400'; // Wishlist highlight
        }
        if (isActive) {
            return 'border-white/60';
        }
        return 'border-white/20';
    };

    const { name, description, icon } = plugDef.displayProperties;
    const itemTypeDisplayName = plugDef.itemTypeDisplayName;

    return (
        <>
            {/* Socket Icon (Reference Element) */}
            <div
                ref={refs.setReference}
                {...getReferenceProps()}
                className={`
                    relative w-10 h-10 ${shapeClass} overflow-hidden 
                    bg-[#222] border-2 ${getBorderClasses()}
                    hover:border-white transition-colors cursor-pointer
                    shadow-sm
                `}
            >
                <BungieImage
                    src={icon}
                    className="w-full h-full object-cover"
                />
                {/* Wishlist indicator */}
                {isWishlistPerk && (
                    <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full flex items-center justify-center z-10">
                        <ThumbsUp size={7} className="text-white" />
                    </div>
                )}
            </div>

            {/* Portaled Tooltip - renders at document root to escape overflow */}
            {isOpen && (
                <FloatingPortal>
                    <div
                        ref={refs.setFloating}
                        style={floatingStyles}
                        {...getFloatingProps()}
                        className="
                            z-[9999] max-w-[300px] min-w-[200px]
                            bg-[#0a0a0f]/98 border border-white/20 
                            p-3 rounded-lg pointer-events-none
                            shadow-2xl backdrop-blur-md
                        "
                    >
                        {/* Perk Name */}
                        <div className={`font-bold text-sm mb-1 ${isIntrinsic ? 'text-[#e2bf36]' : 'text-white'}`}>
                            {name}
                        </div>

                        {/* Perk Type (Intrinsic, Barrel, etc.) */}
                        {itemTypeDisplayName && (
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                                {itemTypeDisplayName}
                            </div>
                        )}

                        {/* Separator */}
                        {description && <div className="h-px bg-white/10 mb-2" />}

                        {/* Perk Description */}
                        {description && (
                            <div className="text-xs text-gray-300 leading-relaxed">
                                {description}
                            </div>
                        )}
                    </div>
                </FloatingPortal>
            )}
        </>
    );
};

export default ItemSocket;
