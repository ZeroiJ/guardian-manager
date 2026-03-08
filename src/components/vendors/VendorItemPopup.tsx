import React, { useCallback, useEffect, useRef } from 'react';
import { Check, Lock, X, AlertTriangle } from 'lucide-react';
import { DestinyCollectibleState } from 'bungie-api-ts/destiny2';
import { BungieImage } from '@/components/ui/BungieImage';
import type { VendorItemModel } from '@/lib/vendors/types';

const RARITY_NAMES: Record<number, string> = {
  6: 'Exotic',
  5: 'Legendary',
  4: 'Rare',
  3: 'Uncommon',
  2: 'Common',
  1: 'Basic',
};

const RARITY_COLORS: Record<number, string> = {
  6: '#ceae33',
  5: '#522f65',
  4: '#5076a3',
  3: '#366f42',
  2: '#c3bcb4',
};

const CLASS_NAMES: Record<number, string> = {
  0: 'Titan',
  1: 'Hunter',
  2: 'Warlock',
};

interface VendorItemPopupProps {
  item: VendorItemModel;
  manifest: Record<number, any>;
  referenceElement: HTMLElement | null;
  ownedItemHashes?: Set<number>;
  onClose: () => void;
}

export const VendorItemPopup: React.FC<VendorItemPopupProps> = ({
  item,
  manifest,
  referenceElement,
  ownedItemHashes,
  onClose,
}) => {
  const popupRef = useRef<HTMLDivElement>(null);
  const def = item.itemDef || manifest[item.itemHash];

  // Position the popup near the reference element
  useEffect(() => {
    if (!popupRef.current || !referenceElement) return;

    const refRect = referenceElement.getBoundingClientRect();
    const popup = popupRef.current;
    const popupRect = popup.getBoundingClientRect();

    // Try to position to the right of the item, fallback to left
    let left = refRect.right + 8;
    let top = refRect.top;

    if (left + popupRect.width > window.innerWidth - 16) {
      left = refRect.left - popupRect.width - 8;
    }
    if (left < 16) {
      left = 16;
    }
    if (top + popupRect.height > window.innerHeight - 16) {
      top = window.innerHeight - popupRect.height - 16;
    }
    if (top < 16) {
      top = 16;
    }

    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
  }, [referenceElement]);

  // Close on Escape or click outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node) &&
          referenceElement && !referenceElement.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, referenceElement]);

  if (!def) return null;

  const name = def.displayProperties?.name || 'Unknown Item';
  const description = def.displayProperties?.description;
  const icon = def.displayProperties?.icon;
  const screenshot = def.screenshot;
  const tierType = def.inventory?.tierType || 0;
  const tierName = RARITY_NAMES[tierType];
  const tierColor = RARITY_COLORS[tierType] || '#555';
  const itemType = def.itemTypeDisplayName || '';
  const classType = def.classType;
  const className = classType != null && classType >= 0 && classType <= 2 ? CLASS_NAMES[classType] : null;

  const owned = item.owned || (ownedItemHashes?.has(item.itemHash) ?? false);
  const acquired = !owned && item.collectibleState !== undefined &&
    (item.collectibleState & DestinyCollectibleState.NotAcquired) === 0;

  return (
    <div
      ref={popupRef}
      className="fixed z-[60] w-[320px] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
      role="dialog"
    >
      {/* Screenshot header (if available) */}
      {screenshot && (
        <div className="relative h-[100px] overflow-hidden">
          <BungieImage src={screenshot} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent" />
        </div>
      )}

      {/* Title bar */}
      <div className="px-4 py-3 flex items-start gap-3" style={{ borderBottom: `2px solid ${tierColor}` }}>
        {icon && (
          <div
            className="w-12 h-12 rounded border overflow-hidden shrink-0 bg-black/40"
            style={{ borderColor: `${tierColor}80` }}
          >
            <BungieImage src={icon} className="w-full h-full" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white">{name}</div>
          <div className="flex items-center gap-2 text-[11px] mt-0.5">
            {tierName && <span style={{ color: tierColor }}>{tierName}</span>}
            {itemType && <span className="text-gray-400">{itemType}</span>}
          </div>
          {className && (
            <div className="text-[10px] text-gray-500 mt-0.5">{className} only</div>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-white transition-colors shrink-0"
        >
          <X size={14} />
        </button>
      </div>

      {/* Description */}
      {description && (
        <div className="px-4 py-2 text-xs text-gray-400 leading-relaxed border-b border-gray-800">
          {description}
        </div>
      )}

      {/* Status badges */}
      <div className="px-4 py-2 flex flex-wrap gap-2">
        {owned && (
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-green-400 bg-green-500/10 border border-green-500/20 rounded px-2 py-0.5">
            <Check size={10} /> Owned
          </div>
        )}
        {acquired && (
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded px-2 py-0.5">
            <Check size={10} /> Acquired
          </div>
        )}
        {item.locked && (
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400 bg-gray-500/10 border border-gray-500/20 rounded px-2 py-0.5">
            <Lock size={10} /> Locked
          </div>
        )}
        {!item.canBeSold && !item.locked && (
          <div className="flex items-center gap-1 text-[10px] font-bold uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-2 py-0.5">
            <AlertTriangle size={10} /> Unavailable
          </div>
        )}
      </div>

      {/* Failure strings */}
      {item.failureStrings.length > 0 && (
        <div className="px-4 pb-2">
          {item.failureStrings.map((str, idx) => (
            <div key={idx} className="text-[10px] text-amber-300/80 leading-snug">
              {str}
            </div>
          ))}
        </div>
      )}

      {/* Costs */}
      {item.costs.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-800">
          <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500 mb-1">Cost</div>
          <div className="flex flex-wrap gap-3">
            {item.costs.map((cost, idx) => {
              const costDef = manifest[cost.itemHash];
              return (
                <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-300">
                  {costDef?.displayProperties?.icon && (
                    <BungieImage src={costDef.displayProperties.icon} className="w-4 h-4 rounded-sm" />
                  )}
                  <span className="font-mono tabular-nums">{cost.quantity.toLocaleString()}</span>
                  <span className="text-gray-500">{costDef?.displayProperties?.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
