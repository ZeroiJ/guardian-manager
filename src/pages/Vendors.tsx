import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, ChevronDown, ChevronRight, Clock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { DestinyCollectibleState } from 'bungie-api-ts/destiny2';
import { Navigation } from '@/components/Navigation';
import { BungieImage } from '@/components/ui/BungieImage';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useVendorStore } from '@/store/vendorStore';
import type { VendorGroupModel, VendorItemModel, VendorModel } from '@/lib/vendors/types';

const SILVER_HASH = 3147280338;
const IGNORED_CATEGORY_PREFIXES = ['categories.campaigns', 'categories.featured.carousel'];

const CLASS_BADGE: Record<number, { short: string; label: string; tone: string }> = {
  0: { short: 'T', label: 'Titan', tone: 'bg-red-500/20 text-red-300 border-red-500/30' },
  1: { short: 'H', label: 'Hunter', tone: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  2: { short: 'W', label: 'Warlock', tone: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
};

function formatCountdown(refreshDate: string | undefined): string | null {
  if (!refreshDate) return null;
  const target = new Date(refreshDate).getTime();
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

function getFailureLabel(item: VendorItemModel, selectedClassType: number): string | null {
  if (item.classType != null && item.classType >= 0 && item.classType <= 2 && item.classType !== selectedClassType) {
    return `Other class`;
  }

  if (item.locked) {
    return 'Locked';
  }

  if (item.failureStrings.length > 0) {
    const cleaned = item.failureStrings[0]
      .replace(/\s+/g, ' ')
      .replace(/[.!]+$/g, '')
      .trim();
    return cleaned || 'Unavailable';
  }

  if (item.owned) {
    return 'Owned';
  }

  if (!item.canBeSold) {
    return 'Unavailable';
  }

  return null;
}

function itemMatchesFilters(
  item: VendorItemModel,
  options: {
    hideOwned: boolean;
    hideSilver: boolean;
    onlySelectedClass: boolean;
    selectedClassType: number;
    categoryIdentifier?: string;
  },
) {
  if (options.hideOwned && item.owned) {
    return false;
  }

  if (options.hideSilver && item.costs.some((cost) => cost.itemHash === SILVER_HASH && cost.quantity > 0)) {
    return false;
  }

  if (
    options.hideSilver &&
    options.categoryIdentifier &&
    IGNORED_CATEGORY_PREFIXES.some((prefix) => options.categoryIdentifier?.startsWith(prefix))
  ) {
    return false;
  }

  if (options.onlySelectedClass) {
    const classType = item.classType;
    if (classType != null && classType >= 0 && classType <= 2 && classType !== options.selectedClassType) {
      return false;
    }
  }

  return true;
}

function isUnacquired(item: VendorItemModel): boolean {
  if (item.owned) {
    return false;
  }

  if (item.collectibleState !== undefined) {
    return (item.collectibleState & DestinyCollectibleState.NotAcquired) !== 0;
  }

  return false;
}

function getFailureTooltip(item: VendorItemModel, selectedClassType: number): string | null {
  if (item.classType != null && item.classType >= 0 && item.classType <= 2 && item.classType !== selectedClassType) {
    return `This item is for ${CLASS_BADGE[item.classType]?.label ?? 'another class'}`;
  }

  if (item.failureStrings.length > 0) {
    return item.failureStrings.join(' | ');
  }

  if (item.locked) {
    return 'This item is currently locked by the vendor.';
  }

  if (item.owned) {
    return 'You already own this item.';
  }

  if (!item.canBeSold) {
    return 'This item is currently unavailable.';
  }

  return null;
}

const CharacterTabs: React.FC<{
  characters: Record<string, any>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}> = ({ characters, selectedId, onSelect }) => {
  const charIds = Object.keys(characters);
  const classNames = ['Titan', 'Hunter', 'Warlock'];

  return (
    <div className="flex gap-1 bg-void-surface/50 border border-void-border rounded-sm p-1">
      {charIds.map((id) => {
        const char = characters[id];
        const className = classNames[char?.classType] || 'Unknown';
        const isActive = id === selectedId;
        return (
          <button
            key={id}
            onClick={() => onSelect(id)}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors rounded-sm ${
              isActive
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {className}
            <span className="ml-2 text-gray-500 text-[10px] font-mono">{char?.light || ''}</span>
          </button>
        );
      })}
    </div>
  );
};

const CostBadge: React.FC<{
  cost: { itemHash: number; quantity: number };
  manifest: Record<number, any>;
}> = ({ cost, manifest }) => {
  const def = manifest[cost.itemHash];
  return (
    <div className="flex items-center gap-1 text-[10px] text-gray-400" title={def?.displayProperties?.name || String(cost.itemHash)}>
      {def?.displayProperties?.icon && <BungieImage src={def.displayProperties.icon} className="w-3 h-3 rounded-sm" />}
      <span className="font-mono tabular-nums">{cost.quantity.toLocaleString()}</span>
    </div>
  );
};

const VendorItemTile: React.FC<{
  item: VendorItemModel;
  selectedClassType: number;
  manifest: Record<number, any>;
  expanded: boolean;
  onToggleSubVendor?: () => void;
}> = ({ item, selectedClassType, manifest, expanded, onToggleSubVendor }) => {
  const def = item.itemDef || manifest[item.itemHash];
  if (!def) return null;

  const icon = def.displayProperties?.icon;
  const name = def.displayProperties?.name || 'Unknown';
  const tierType = def.inventory?.tierType || 0;
  const rarityColors: Record<number, string> = {
    6: '#ceae33',
    5: '#522f65',
    4: '#5076a3',
    3: '#366f42',
  };
  const borderColor = rarityColors[tierType] || '#333';

  const isWrongClass =
    item.classType != null &&
    item.classType >= 0 &&
    item.classType <= 2 &&
    item.classType !== selectedClassType;
  const isUnavailable = isWrongClass || !item.canBeSold || item.locked;
  const failureLabel = getFailureLabel(item, selectedClassType);
  const failureTooltip = getFailureTooltip(item, selectedClassType);
  const classBadge = item.classType != null && item.classType >= 0 && item.classType <= 2
    ? CLASS_BADGE[item.classType]
    : null;
  const hasSubVendor = Boolean(item.subVendor);

  return (
    <div className={`group relative flex w-[84px] flex-col items-center gap-1 ${isUnavailable ? 'opacity-55' : ''}`}>
      <div
        className="relative w-[56px] h-[56px] rounded border overflow-hidden bg-black/30 shrink-0"
        style={{ borderColor: `${borderColor}60` }}
        title={failureTooltip ? `${name} - ${failureTooltip}` : name}
      >
        {icon && <BungieImage src={icon} className="w-full h-full" />}
        {failureLabel && (
          <div className="absolute inset-x-0 top-0 bg-black/75 px-1 py-px text-center text-[8px] font-bold uppercase text-gray-200 truncate">
            {failureLabel}
          </div>
        )}
        {classBadge && (
          <div className={`absolute bottom-0 right-0 border-l border-t px-1 py-px text-[7px] font-bold uppercase ${classBadge.tone}`}>
            {classBadge.short}
          </div>
        )}
        {hasSubVendor && (
          <button
            type="button"
            onClick={onToggleSubVendor}
            className="absolute bottom-0 left-0 border-r border-t border-sky-500/30 bg-sky-500/20 px-1 py-px text-[7px] font-bold uppercase text-sky-200"
            title={expanded ? 'Hide nested vendor' : 'Show nested vendor'}
          >
            {expanded ? 'Hide' : 'Open'}
          </button>
        )}
      </div>
      <div className="text-[10px] text-gray-300 text-center leading-tight line-clamp-2 w-full">
        {name}
      </div>
      {item.costs.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center">
          {item.costs.map((cost, index) => (
            <CostBadge key={`${cost.itemHash}-${index}`} cost={cost} manifest={manifest} />
          ))}
        </div>
      )}
      {hasSubVendor && (
        <div className="text-[9px] uppercase tracking-wider text-sky-300 text-center">
          Opens vendor
        </div>
      )}
    </div>
  );
};

const VendorCard: React.FC<{
  vendor: VendorModel;
  characterId: string;
  selectedClassType: number;
  hideOwned: boolean;
  hideSilver: boolean;
  onlySelectedClass: boolean;
  showUnacquiredOnly: boolean;
  manifest: Record<number, any>;
}> = ({ vendor, characterId, selectedClassType, hideOwned, hideSilver, onlySelectedClass, showUnacquiredOnly, manifest }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [openSubVendorKey, setOpenSubVendorKey] = useState<string | null>(null);
  const fetchVendorDetails = useVendorStore((s) => s.fetchVendorDetails);
  const detailLoading = useVendorStore((s) => s.detailLoading);
  const vendorRecord = useVendorStore((s) => s.vendors[`${characterId}_${vendor.vendorHash}`]);

  if (!vendor.def) return null;

  const filteredItems = useMemo(
    () =>
      vendor.items.filter((item) =>
        (() => {
          const categoryIndex = item.displayCategoryIndex;
          const categoryIdentifier =
            categoryIndex !== undefined && categoryIndex >= 0
              ? vendor.def?.displayCategories?.[categoryIndex]?.identifier
              : undefined;

          return itemMatchesFilters(item, {
            hideOwned,
            hideSilver,
            onlySelectedClass,
            selectedClassType,
            categoryIdentifier,
          }) && (!showUnacquiredOnly || isUnacquired(item));
        })(),
      ),
    [vendor.items, hideOwned, hideSilver, onlySelectedClass, selectedClassType, showUnacquiredOnly],
  );

  const categories = useMemo(() => {
    const displayCategories = vendor.def?.displayCategories || [];
    const mapped = new Map<number, VendorItemModel[]>();

    for (const item of filteredItems) {
      const key = item.displayCategoryIndex ?? -1;
      const existing = mapped.get(key) || [];
      existing.push(item);
      mapped.set(key, existing);
    }

    return Array.from(mapped.entries()).map(([categoryIndex, items]) => ({
      name:
        categoryIndex >= 0
          ? displayCategories[categoryIndex]?.displayProperties?.name || `Category ${categoryIndex}`
          : 'Items',
      items,
    }));
  }, [filteredItems, vendor.def]);

  if (filteredItems.length === 0) {
    return null;
  }

  const name = vendor.def.displayProperties?.name || `Vendor ${vendor.vendorHash}`;
  const subtitle = [vendor.destination?.displayProperties?.name, vendor.place?.displayProperties?.name]
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index)
    .join(', ');
  const icon = vendor.def.displayProperties?.smallTransparentIcon || vendor.def.displayProperties?.icon;
  const countdown = formatCountdown(vendor.component?.nextRefreshDate);
  const isDetailLoading = detailLoading.has(vendor.vendorHash);

  useEffect(() => {
    if (!collapsed && vendorRecord && !vendorRecord.hasItemDetails && !isDetailLoading) {
      fetchVendorDetails(characterId, vendor.vendorHash);
    }
  }, [collapsed, vendorRecord, isDetailLoading, fetchVendorDetails, characterId, vendor.vendorHash]);

  return (
    <div className="bg-void-surface/40 border border-void-border rounded-sm overflow-hidden">
      <button
        onClick={() => setCollapsed((value) => !value)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
      >
        {icon && (
          <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0 bg-black/30">
            <BungieImage src={icon} className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{name}</div>
          {subtitle && <div className="text-[10px] text-gray-500 truncate">{subtitle}</div>}
        </div>
        {countdown && (
          <div className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
            <Clock size={10} />
            {countdown}
          </div>
        )}
        {isDetailLoading && <Loader2 size={12} className="animate-spin text-sky-300 shrink-0" />}
        <div className="text-[10px] text-gray-500 shrink-0">{filteredItems.length} items</div>
        {collapsed ? <ChevronRight size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
      </button>

      {!collapsed && (
        <div className="border-t border-void-border px-4 py-3 space-y-4">
          {vendor.currencies.length > 0 && (
            <div className="flex flex-wrap gap-3 text-[11px] text-gray-400">
              {vendor.currencies.map((currency) => (
                <div key={currency.hash} className="flex items-center gap-1">
                  {currency.displayProperties?.icon && (
                    <BungieImage src={currency.displayProperties.icon} className="w-4 h-4 rounded-sm" />
                  )}
                  <span>{currency.displayProperties?.name}</span>
                </div>
              ))}
            </div>
          )}

          {categories.map((category, index) => (
            <div key={`${category.name}-${index}`}>
              {categories.length > 1 && (
                <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">
                  {category.name}
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {category.items.map((item) => (
                  <div key={`${vendor.vendorHash}-${item.vendorItemIndex}`} className="space-y-3">
                    <VendorItemTile
                      item={item}
                      selectedClassType={selectedClassType}
                      manifest={manifest}
                      expanded={openSubVendorKey === `${vendor.vendorHash}-${item.vendorItemIndex}`}
                      onToggleSubVendor={
                        item.subVendor
                          ? () =>
                              setOpenSubVendorKey((current) =>
                                current === `${vendor.vendorHash}-${item.vendorItemIndex}`
                                  ? null
                                  : `${vendor.vendorHash}-${item.vendorItemIndex}`,
                              )
                          : undefined
                      }
                    />
                    {item.subVendor && openSubVendorKey === `${vendor.vendorHash}-${item.vendorItemIndex}` && (
                      <div className="w-full min-w-[280px] max-w-[640px] rounded-sm border border-sky-500/20 bg-sky-500/5 p-3">
                        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-sky-300">
                          {item.subVendor.def?.displayProperties?.name || 'Nested Vendor'}
                        </div>
                        <div className="text-[10px] text-gray-400 mb-3">
                          Nested vendor inventory preview.
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {item.subVendor.items.map((subItem) => (
                            <VendorItemTile
                              key={`${item.subVendor?.vendorHash}-${subItem.vendorItemIndex}`}
                              item={subItem}
                              selectedClassType={selectedClassType}
                              manifest={manifest}
                              expanded={false}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Vendors() {
  const characters = useInventoryStore((s) => s.characters);
  const profile = useInventoryStore((s) => s.profile);
  const manifest = useInventoryStore((s) => s.manifest);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [hideOwned, setHideOwned] = useState(false);
  const [hideSilver, setHideSilver] = useState(true);
  const [onlySelectedClass, setOnlySelectedClass] = useState(false);
  const [showUnacquiredOnly, setShowUnacquiredOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const { vendorGroups, loading, error, fetchVendors, lastFetched } = useVendorStore();

  useEffect(() => {
    if (!selectedCharacterId && Object.keys(characters).length > 0) {
      setSelectedCharacterId(Object.keys(characters)[0]);
    }
  }, [characters, selectedCharacterId]);

  useEffect(() => {
    if (selectedCharacterId && profile) {
      fetchVendors(selectedCharacterId);
    }
  }, [selectedCharacterId, profile, fetchVendors]);

  const handleCharacterSelect = useCallback((charId: string) => {
    setSelectedCharacterId(charId);
  }, []);

  const handleRefresh = useCallback(() => {
    if (selectedCharacterId) {
      fetchVendors(selectedCharacterId);
    }
  }, [selectedCharacterId, fetchVendors]);

  const selectedClassType = selectedCharacterId ? characters[selectedCharacterId]?.classType ?? 3 : 3;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const vendorMatchesSearch = useCallback(
    (vendor: VendorModel) =>
      !normalizedSearch ||
      vendor.def?.displayProperties?.name?.toLowerCase().includes(normalizedSearch),
    [normalizedSearch],
  );

  const itemMatchesSearch = useCallback(
    (item: VendorItemModel) => {
      if (!normalizedSearch) return true;
      const name = item.itemDef?.displayProperties?.name?.toLowerCase();
      return Boolean(name?.includes(normalizedSearch));
    },
    [normalizedSearch],
  );

  const filteredGroups = useMemo(() => {
    return vendorGroups
      .map((group: VendorGroupModel) => ({
        ...group,
        vendors: group.vendors.filter((vendor) =>
          vendorMatchesSearch(vendor) || vendor.items.some((item) =>
            (() => {
              const categoryIndex = item.displayCategoryIndex;
              const categoryIdentifier =
                categoryIndex !== undefined && categoryIndex >= 0
                  ? vendor.def?.displayCategories?.[categoryIndex]?.identifier
                  : undefined;

              return itemMatchesFilters(item, {
                hideOwned,
                hideSilver,
                onlySelectedClass,
                selectedClassType,
                categoryIdentifier,
              }) && (!showUnacquiredOnly || isUnacquired(item)) && itemMatchesSearch(item);
            })(),
          ),
        ),
      }))
      .filter((group) => group.vendors.length > 0);
  }, [vendorGroups, hideOwned, hideSilver, onlySelectedClass, selectedClassType, showUnacquiredOnly, vendorMatchesSearch, itemMatchesSearch]);

  const hasData = filteredGroups.length > 0;

  return (
    <div className="min-h-screen bg-void-bg text-void-text">
      <Navigation />

      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-bold text-white">Vendors</h1>
            <p className="text-xs text-gray-500">
              {lastFetched ? `Updated ${new Date(lastFetched).toLocaleTimeString()}` : 'Not yet loaded'}
            </p>
          </div>

          {Object.keys(characters).length > 0 && (
            <CharacterTabs characters={characters} selectedId={selectedCharacterId} onSelect={handleCharacterSelect} />
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendors or items"
              className="w-[220px] rounded-sm border border-void-border bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-gray-500 outline-none focus:border-white/20"
            />

            <button
              onClick={() => setHideOwned((value) => !value)}
              className={`flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors ${
                hideOwned
                  ? 'bg-blue-500/20 border-blue-500/30 text-blue-400'
                  : 'bg-white/[0.04] border-void-border text-gray-400 hover:text-white'
              }`}
            >
              {hideOwned ? <EyeOff size={12} /> : <Eye size={12} />}
              {hideOwned ? 'Owned Hidden' : 'Hide Owned'}
            </button>

            <button
              onClick={() => setHideSilver((value) => !value)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors ${
                hideSilver
                  ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                  : 'bg-white/[0.04] border-void-border text-gray-400 hover:text-white'
              }`}
            >
              Hide Silver
            </button>

            <button
              onClick={() => setShowUnacquiredOnly((value) => !value)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors ${
                showUnacquiredOnly
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                  : 'bg-white/[0.04] border-void-border text-gray-400 hover:text-white'
              }`}
            >
              Unacquired Only
            </button>

            <button
              onClick={() => setOnlySelectedClass((value) => !value)}
              className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors ${
                onlySelectedClass
                  ? 'bg-violet-500/20 border-violet-500/30 text-violet-300'
                  : 'bg-white/[0.04] border-void-border text-gray-400 hover:text-white'
              }`}
            >
              Only Selected Class
            </button>

            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border border-void-border text-gray-400 hover:text-white bg-white/[0.04] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
        </div>

        <div className="rounded-sm border border-void-border bg-void-surface/30 px-4 py-3 text-xs text-gray-400">
          Character selection sets the vendor perspective. Items for other classes remain visible by default, but they are dimmed and marked unavailable instead of being hidden.
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading && !hasData && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 size={32} className="animate-spin text-gray-500" />
            <span className="text-sm text-gray-500">Loading vendors...</span>
          </div>
        )}

        {!profile && !loading && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-sm text-gray-500">Log in and load your profile first to view vendors.</span>
          </div>
        )}

        {hasData &&
          filteredGroups.map((group) => (
            <div key={group.vendorGroupHash} className="space-y-2">
              {filteredGroups.length > 1 && (
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest pt-2">
                  {group.def?.categoryName || 'Vendors'}
                </h2>
              )}
              {group.vendors.map((vendor) => (
                <VendorCard
                  key={vendor.vendorHash}
                  vendor={vendor}
                  characterId={selectedCharacterId!}
                  selectedClassType={selectedClassType}
                  hideOwned={hideOwned}
                  hideSilver={hideSilver}
                  onlySelectedClass={onlySelectedClass}
                  showUnacquiredOnly={showUnacquiredOnly}
                  manifest={manifest}
                />
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
