import React from 'react';
import { Check, Lock } from 'lucide-react';
import { DestinyCollectibleState } from 'bungie-api-ts/destiny2';
import { BungieImage } from '@/components/ui/BungieImage';
import type { VendorItemModel } from '@/lib/vendors/types';

/**
 * CSS custom property --item-size controls the tile dimension.
 * DIM uses ~50px; we default to 48px via Tailwind but allow overriding.
 */

const RARITY_BORDERS: Record<number, string> = {
  6: '#ceae33', // Exotic
  5: '#522f65', // Legendary
  4: '#5076a3', // Rare
  3: '#366f42', // Uncommon
  2: '#c3bcb4', // Common
};

interface VendorItemTileProps {
  item: VendorItemModel;
  manifest: Record<number, any>;
  selectedClassType: number;
  /** Set of item hashes the player owns in inventory */
  ownedItemHashes?: Set<number>;
  /** Click handler — receives the item and the DOM element for popup anchoring */
  onClick?: (item: VendorItemModel, element: HTMLElement) => void;
  /** Click handler for display tiles (sub-vendor preview) */
  onSubVendorClick?: (vendorHash: number) => void;
}

/** Determine if item is acquired in collections (but not necessarily in inventory) */
function isAcquired(item: VendorItemModel): boolean {
  if (item.collectibleState === undefined) return false;
  return (item.collectibleState & DestinyCollectibleState.NotAcquired) === 0;
}

/** Determine effective ownership: inventory ownership OR vendor API owned flag */
function isOwned(item: VendorItemModel, ownedItemHashes?: Set<number>): boolean {
  if (item.owned) return true;
  if (ownedItemHashes?.has(item.itemHash)) return true;
  return false;
}

/**
 * Check if the item is a "display tile" (sub-vendor entry point).
 * DIM checks for `ui_display_style_set_container` — we approximate by checking
 * if the item has a previewVendorHash and its definition has a displayStyle.
 */
function isDisplayTile(item: VendorItemModel): boolean {
  return Boolean(item.previewVendorHash && item.itemDef?.uiItemDisplayStyle);
}

export const VendorItemTile: React.FC<VendorItemTileProps> = ({
  item,
  manifest,
  selectedClassType,
  ownedItemHashes,
  onClick,
  onSubVendorClick,
}) => {
  const def = item.itemDef || manifest[item.itemHash];
  if (!def) return null;

  const icon = def.displayProperties?.icon;
  const name = def.displayProperties?.name || 'Unknown';
  const tierType = def.inventory?.tierType || 0;
  const borderColor = RARITY_BORDERS[tierType] || '#333';

  const owned = isOwned(item, ownedItemHashes);
  const acquired = !owned && isAcquired(item);

  // Unavailable: can't be sold, or locked, or owned emblems/bounties
  const isEmblem = def.itemCategoryHashes?.includes(19);
  const isBounty = def.itemCategoryHashes?.includes(1784235469);
  const isRepeatableBounty = def.itemCategoryHashes?.includes(1784235469) && def.itemCategoryHashes?.includes(3792382986);
  const ownershipRule = isEmblem || (isBounty && !isRepeatableBounty);
  const unavailable = !item.canBeSold || item.locked || (owned && ownershipRule);

  // Display tile (sub-vendor entry) — render as a wider clickable image
  if (isDisplayTile(item) && onSubVendorClick && item.previewVendorHash) {
    return (
      <div className="flex flex-col items-center gap-1 w-min-content text-center">
        <button
          type="button"
          onClick={() => onSubVendorClick(item.previewVendorHash!)}
          className="h-[54px] w-[123px] rounded overflow-hidden border border-void-border cursor-pointer hover:border-white/30 transition-colors"
        >
          {icon && <BungieImage src={icon} className="w-full h-full object-cover" />}
        </button>
        <span className="text-[10px] text-gray-400 leading-tight max-w-[123px] truncate">
          {name}
        </span>
      </div>
    );
  }

  // Normal item tile
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(item, e.currentTarget);
    }
  };

  return (
    <div className="flex flex-col items-center w-min-content text-center relative">
      {/* Item icon */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick(e as any);
        }}
        className={`relative w-12 h-12 rounded border overflow-hidden bg-black/40 cursor-pointer shrink-0 ${
          unavailable ? 'opacity-30' : 'hover:brightness-110'
        }`}
        style={{ borderColor: `${borderColor}80` }}
        title={name}
      >
        {icon && <BungieImage src={icon} className="w-full h-full object-cover" />}

        {/* Ownership / acquired / locked badge — bottom-right circle */}
        {owned && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-600 flex items-center justify-center shadow-[0_0_2px_rgba(0,0,0,0.8)]">
            <Check size={8} className="text-white" strokeWidth={3} />
          </div>
        )}
        {acquired && !owned && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center shadow-[0_0_2px_rgba(0,0,0,0.8)]">
            <Check size={8} className="text-white" strokeWidth={3} />
          </div>
        )}
        {item.locked && !owned && !acquired && (
          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-gray-500 flex items-center justify-center shadow-[0_0_2px_rgba(0,0,0,0.8)]">
            <Lock size={7} className="text-white" />
          </div>
        )}
      </div>

      {/* Costs */}
      {item.costs.length > 0 && (
        <div className="flex flex-wrap gap-0.5 justify-center mt-0.5">
          {item.costs.map((cost, idx) => {
            const costDef = manifest[cost.itemHash];
            return (
              <div
                key={`${cost.itemHash}-${idx}`}
                className="flex items-center gap-0.5 text-[10px] text-gray-400"
                title={costDef?.displayProperties?.name || String(cost.itemHash)}
              >
                <span className="font-mono tabular-nums">{cost.quantity.toLocaleString()}</span>
                {costDef?.displayProperties?.icon && (
                  <BungieImage src={costDef.displayProperties.icon} className="w-3 h-3" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
