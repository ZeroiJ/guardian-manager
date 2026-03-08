import React, { useEffect, useMemo } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { BungieImage } from '@/components/ui/BungieImage';
import { CollapsibleSection } from '@/components/ui/CollapsibleSection';
import { VendorCategoryItems } from './VendorCategoryItems';
import { useVendorStore } from '@/store/vendorStore';
import type { VendorItemModel, VendorModel } from '@/lib/vendors/types';

// ============================================================================
// Helpers
// ============================================================================

function formatCountdown(refreshDate: string | undefined): string | null {
  if (!refreshDate) return null;
  const target = new Date(refreshDate).getTime();
  // Bungie uses year 9999 to mean "never refreshes"
  if (new Date(refreshDate).getFullYear() >= 9999) return null;
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) return null;

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getLocationString(vendor: VendorModel): string {
  const parts = [
    vendor.destination?.displayProperties?.name,
    vendor.place?.displayProperties?.name,
  ].filter(Boolean);
  // Deduplicate (sometimes destination and place have the same name)
  const unique = parts.filter((v, i, a) => a.indexOf(v) === i);
  return unique.join(', ');
}

// ============================================================================
// Currency Bar (DIM: floated right, shows currency quantities + icons)
// ============================================================================

const CurrencyBar: React.FC<{
  currencies: any[];
  manifest: Record<number, any>;
}> = ({ currencies, manifest }) => {
  if (currencies.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 justify-end text-xs text-gray-400">
      {currencies.map((currency: any) => (
        <div key={currency.hash || currency.itemHash} className="flex items-center gap-1">
          {currency.displayProperties?.icon && (
            <BungieImage src={currency.displayProperties.icon} className="w-4 h-4 rounded-sm" />
          )}
          <span>{currency.displayProperties?.name}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// VendorCard
// ============================================================================

interface VendorCardProps {
  vendor: VendorModel;
  characterId: string;
  selectedClassType: number;
  filteredItems: VendorItemModel[];
  manifest: Record<number, any>;
  ownedItemHashes?: Set<number>;
  onItemClick?: (item: VendorItemModel, element: HTMLElement) => void;
  onSubVendorClick?: (vendorHash: number) => void;
}

export const VendorCard: React.FC<VendorCardProps> = ({
  vendor,
  characterId,
  selectedClassType,
  filteredItems,
  manifest,
  ownedItemHashes,
  onItemClick,
  onSubVendorClick,
}) => {
  const fetchVendorDetails = useVendorStore((s) => s.fetchVendorDetails);
  const detailLoading = useVendorStore((s) => s.detailLoading);
  const vendorRecord = useVendorStore((s) => s.vendors[`${characterId}_${vendor.vendorHash}`]);
  const isDetailLoading = detailLoading.has(vendor.vendorHash);

  // Auto-fetch detailed item components when the vendor card is expanded
  // (DIM deprioritizes collapsed vendors, we skip them entirely)
  useEffect(() => {
    if (vendorRecord && !vendorRecord.hasItemDetails && !isDetailLoading) {
      fetchVendorDetails(characterId, vendor.vendorHash);
    }
  }, [vendorRecord, isDetailLoading, fetchVendorDetails, characterId, vendor.vendorHash]);

  if (!vendor.def || filteredItems.length === 0) return null;

  const name = vendor.def.displayProperties?.name || `Vendor ${vendor.vendorHash}`;
  const icon = vendor.def.displayProperties?.smallTransparentIcon || vendor.def.displayProperties?.icon;
  const location = getLocationString(vendor);
  const countdown = formatCountdown(vendor.component?.nextRefreshDate);

  const titleContent = (
    <>
      {icon && (
        <div className="w-[30px] h-[30px] rounded-full overflow-hidden border border-white/10 shrink-0 bg-black/30">
          <BungieImage src={icon} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex flex-row flex-wrap items-center gap-x-1.5 gap-y-0">
        <span className="text-sm font-bold text-white uppercase tracking-[0.1em]">{name}</span>
        {location && (
          <span className="text-xs text-gray-500 normal-case tracking-normal">{location}</span>
        )}
      </div>
    </>
  );

  const extraContent = (
    <div className="flex items-center gap-2">
      {isDetailLoading && <Loader2 size={12} className="animate-spin text-gray-500" />}
      {countdown && (
        <div className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap">
          <Clock size={10} />
          {countdown}
        </div>
      )}
    </div>
  );

  return (
    <CollapsibleSection
      sectionId={`d2vendor-${vendor.vendorHash}`}
      anchorId={`vendor-${vendor.vendorHash}`}
      title={titleContent}
      extra={extraContent}
      headerClassName="px-3 py-2.5 bg-black/20 hover:bg-black/30 transition-colors rounded-t min-h-[34px]"
      className="border border-void-border rounded overflow-hidden bg-void-surface/30"
    >
      <div className="border-t border-void-border px-4 py-3">
        {/* Currency bar (DIM: floated right) */}
        <CurrencyBar currencies={vendor.currencies} manifest={manifest} />

        {/* Items grouped by display category */}
        <VendorCategoryItems
          vendor={vendor}
          items={filteredItems}
          manifest={manifest}
          selectedClassType={selectedClassType}
          ownedItemHashes={ownedItemHashes}
          onItemClick={onItemClick}
          onSubVendorClick={onSubVendorClick}
        />
      </div>
    </CollapsibleSection>
  );
};
