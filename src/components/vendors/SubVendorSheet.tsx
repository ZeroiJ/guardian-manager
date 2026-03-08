import React, { useCallback, useEffect, useRef } from 'react';
import { X, Clock } from 'lucide-react';
import { BungieImage } from '@/components/ui/BungieImage';
import { VendorCategoryItems } from './VendorCategoryItems';
import type { VendorModel, VendorItemModel } from '@/lib/vendors/types';

// ============================================================================
// Helpers
// ============================================================================

function formatCountdown(refreshDate: string | undefined): string | null {
  if (!refreshDate) return null;
  const target = new Date(refreshDate).getTime();
  if (new Date(refreshDate).getFullYear() >= 9999) return null;
  const diff = target - Date.now();
  if (diff <= 0) return null;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

// ============================================================================
// SubVendorSheet
// ============================================================================

interface SubVendorSheetProps {
  vendor: VendorModel;
  characterId: string;
  selectedClassType: number;
  manifest: Record<number, any>;
  ownedItemHashes?: Set<number>;
  onClose: () => void;
  onItemClick?: (item: VendorItemModel, element: HTMLElement) => void;
}

export const SubVendorSheet: React.FC<SubVendorSheetProps> = ({
  vendor,
  characterId,
  selectedClassType,
  manifest,
  ownedItemHashes,
  onClose,
  onItemClick,
}) => {
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Close on click outside
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target as Node)) {
        onClose();
      }
    },
    [onClose],
  );

  if (!vendor.def) return null;

  const name = vendor.def.displayProperties?.name || `Vendor ${vendor.vendorHash}`;
  const description = vendor.def.displayProperties?.description;
  const icon = vendor.def.displayProperties?.smallTransparentIcon || vendor.def.displayProperties?.icon;
  const countdown = formatCountdown(vendor.component?.nextRefreshDate);
  const location = [
    vendor.destination?.displayProperties?.name,
    vendor.place?.displayProperties?.name,
  ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={name}
    >
      <div
        ref={sheetRef}
        className="w-full max-w-4xl max-h-[80vh] bg-void-bg border border-void-border rounded-t-lg overflow-y-auto animate-in slide-in-from-bottom duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-void-bg border-b border-void-border px-6 py-4 flex items-start gap-3">
          {icon && (
            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-black/30">
              <BungieImage src={icon} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">{name}</h2>
              {location && <span className="text-xs text-gray-500">{location}</span>}
            </div>
            {description && (
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{description}</p>
            )}
            {countdown && (
              <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-1">
                <Clock size={10} />
                Refreshes in {countdown}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-white/10 transition-colors text-gray-400 hover:text-white shrink-0"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Items */}
        <div className="px-6 py-4">
          {vendor.items.length > 0 ? (
            <VendorCategoryItems
              vendor={vendor}
              items={vendor.items}
              manifest={manifest}
              selectedClassType={selectedClassType}
              ownedItemHashes={ownedItemHashes}
              onItemClick={onItemClick}
            />
          ) : (
            <div className="text-sm text-gray-500 py-8 text-center">No items available.</div>
          )}
        </div>
      </div>
    </div>
  );
};
