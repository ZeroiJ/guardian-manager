import React from 'react';
import { BungieImage } from '../BungieImage';
import { SocketCategoryHashes } from '../../lib/destiny-constants';

interface ItemSocketProps {
    /** The plug definition from the manifest */
    plugDef: any;
    /** The socket category hash for styling */
    categoryHash: number;
    /** Whether the plug is currently active/enabled */
    isActive?: boolean;
}

/**
 * ItemSocket Component
 * 
 * Renders a single socket/perk with appropriate styling:
 * - Gold border for intrinsic/exotic perks
 * - White border for active perks
 * - Gray border for inactive perks
 * - Tooltip on hover with name and description
 */
export const ItemSocket: React.FC<ItemSocketProps> = ({
    plugDef,
    categoryHash,
    isActive = true
}) => {
    if (!plugDef?.displayProperties?.icon) {
        return null;
    }

    // Check if this is an intrinsic/exotic perk
    const isIntrinsic = categoryHash === SocketCategoryHashes.IntrinsicTraits ||
        categoryHash === SocketCategoryHashes.ArmorPerks_LargePerk;

    // Determine border color based on type and state
    const getBorderClasses = () => {
        if (isIntrinsic) {
            return 'border-yellow-500 ring-1 ring-yellow-500/30';
        }
        if (isActive) {
            return 'border-white/60';
        }
        return 'border-white/20';
    };

    const { name, description, icon } = plugDef.displayProperties;

    return (
        <div className="group relative">
            {/* Socket Icon */}
            <div
                className={`
                    w-10 h-10 rounded-full overflow-hidden 
                    bg-[#222] border-2 ${getBorderClasses()}
                    hover:border-yellow-400 transition-colors cursor-pointer
                `}
            >
                <BungieImage
                    src={icon}
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Tooltip */}
            <div className="
                absolute bottom-full left-1/2 -translate-x-1/2 mb-2 
                hidden group-hover:block 
                w-52 bg-black/95 border border-white/20 
                p-2.5 rounded-lg z-50 pointer-events-none
                shadow-xl backdrop-blur-sm
            ">
                {/* Perk Name */}
                <div className={`font-bold text-xs mb-1 ${isIntrinsic ? 'text-yellow-400' : 'text-white'}`}>
                    {name}
                </div>

                {/* Perk Description */}
                {description && (
                    <div className="text-[10px] text-gray-300 leading-tight">
                        {description}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ItemSocket;
