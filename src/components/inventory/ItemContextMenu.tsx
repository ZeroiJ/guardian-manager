import React from 'react';
import { ContextMenu, ContextMenuItem, ContextMenuSeparator } from '../ui/ContextMenu';
import { Lock, Unlock, Star, Ban, Archive, ArrowDown } from 'lucide-react';
import { useProfile } from '../../hooks/useProfile';
import { useInventoryStore } from '../../store/useInventoryStore';

interface ItemContextMenuProps {
    x: number;
    y: number;
    onClose: () => void;
    item: any;
    definition: any;
}

export const ItemContextMenu: React.FC<ItemContextMenuProps> = ({ x, y, onClose, item, definition }) => {
    const { updateItemMetadata, moveItem, profile } = useProfile();
    const setLockState = useInventoryStore(state => state.setLockState);
    const pullFromPostmaster = useInventoryStore(state => state.pullFromPostmaster);

    if (!item) return null;

    const isLocked = (item.state & 1) !== 0;
    const currentTag = item.userTag;
    const isPostmaster = item.bucketHash === 215593132;

    const handleTag = (tag: string | null) => {
        updateItemMetadata(item.itemInstanceId, 'tag', tag);
        onClose();
    };

    const handleMove = (targetId: string, isVault: boolean = false) => {
        moveItem(item.itemInstanceId, item.itemHash, targetId, isVault);
        onClose();
    };

    const handleLock = () => {
        if (item.itemInstanceId) {
            setLockState(item.itemInstanceId, !isLocked);
        }
        onClose();
    };

    const handlePull = () => {
        if (item.itemInstanceId && item.owner) {
            pullFromPostmaster(item.itemInstanceId, item.itemHash, item.owner);
        }
        onClose();
    };

    const characters = Object.values(profile?.characters?.data || {});

    return (
        <ContextMenu x={x} y={y} onClose={onClose}>
            {/* Header: Item Name */}
            <div className="px-3 py-1.5 text-xs font-bold text-[#f5dc56] border-b border-white/10 mb-1 opacity-80 uppercase tracking-wider">
                {definition?.displayProperties?.name || 'Unknown Item'}
            </div>

            {/* Tags */}
            <ContextMenuItem 
                icon={<Star size={14} className={currentTag === 'favorite' ? 'fill-[#f5dc56] text-[#f5dc56]' : ''} />} 
                label="Favorite" 
                onClick={() => handleTag('favorite')} 
            />
            <ContextMenuItem 
                icon={<Ban size={14} className={currentTag === 'junk' ? 'text-red-500' : ''} />} 
                label="Junk" 
                onClick={() => handleTag('junk')} 
            />
            <ContextMenuItem 
                icon={<Archive size={14} className={currentTag === 'archive' ? 'text-blue-400' : ''} />} 
                label="Archive" 
                onClick={() => handleTag('archive')} 
            />
            {currentTag && (
                <ContextMenuItem 
                    label="Clear Tag" 
                    onClick={() => handleTag(null)} 
                    className="text-gray-500"
                />
            )}

            <ContextMenuSeparator />

            {/* Lock / Unlock */}
            {item.lockable && item.itemInstanceId && (
                <ContextMenuItem 
                    icon={isLocked ? <Unlock size={14} /> : <Lock size={14} />} 
                    label={isLocked ? "Unlock" : "Lock"} 
                    shortcut="L"
                    onClick={handleLock} 
                />
            )}

            {/* Postmaster: Pull to character */}
            {isPostmaster && item.itemInstanceId && (
                <>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                        icon={<ArrowDown size={14} />}
                        label="Pull to Character"
                        onClick={handlePull}
                    />
                </>
            )}

            <ContextMenuSeparator />

            {/* Move Actions */}
            {!isPostmaster && (
                <>
                    <div className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-widest font-bold">Transfer To</div>
                    
                    <ContextMenuItem 
                        icon={<Archive size={14} />} 
                        label="Vault" 
                        onClick={() => handleMove('vault', true)}
                        disabled={item.owner === 'vault'}
                    />

                    {characters.map((char: any) => (
                        <ContextMenuItem
                            key={char.characterId}
                            icon={<div className="w-3 h-3 rounded-full bg-cover" style={{ backgroundImage: `url(https://www.bungie.net${char.emblemPath})` }} />}
                            label={['Titan', 'Hunter', 'Warlock'][char.classType]}
                            onClick={() => handleMove(char.characterId)}
                            disabled={item.owner === char.characterId}
                        />
                    ))}
                </>
            )}

        </ContextMenu>
    );
};
