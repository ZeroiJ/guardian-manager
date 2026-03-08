import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import { VendorSidebar } from '@/components/vendors/VendorSidebar';
import { VendorCard } from '@/components/vendors/VendorCard';
import { SubVendorSheet } from '@/components/vendors/SubVendorSheet';
import { VendorItemPopup } from '@/components/vendors/VendorItemPopup';
import { filterVendorGroups } from '@/lib/vendors/filters';
import type { FilteredVendorGroup } from '@/lib/vendors/filters';
import type { VendorItemModel, VendorModel } from '@/lib/vendors/types';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useVendorStore } from '@/store/vendorStore';

// ============================================================================
// Vendor group ordering — sort by def.order, prioritize Ada/Banshee/Eververse
// ============================================================================

/** Known vendor hashes for priority ordering within groups (DIM's vendorOrder) */
const VENDOR_PRIORITY: Record<number, number> = {
  350061650: 0,   // Ada-1 (Armor Synthesis)
  672118013: 1,   // Banshee-44
  3361454721: 2,  // Tess Everis (Eververse)
};

function sortVendorGroups(groups: FilteredVendorGroup[]): FilteredVendorGroup[] {
  // Sort groups by def.order (ascending)
  const sorted = [...groups].sort((a, b) => {
    const orderA = (a.group.def as any)?.order ?? 999;
    const orderB = (b.group.def as any)?.order ?? 999;
    return orderA - orderB;
  });

  // Within each group, sort vendors by priority (known vendors first), then by def.order
  for (const group of sorted) {
    group.vendors.sort((a, b) => {
      const prioA = VENDOR_PRIORITY[a.vendor.vendorHash] ?? 100;
      const prioB = VENDOR_PRIORITY[b.vendor.vendorHash] ?? 100;
      if (prioA !== prioB) return prioA - prioB;
      // Fall back to original array order
      return 0;
    });
  }

  return sorted;
}

// ============================================================================
// Popup / SubVendor state types
// ============================================================================

interface PopupState {
  item: VendorItemModel;
  element: HTMLElement;
}

// ============================================================================
// Vendors Page
// ============================================================================

export default function Vendors() {
  // ---------------------------------------------------------------------------
  // Store selectors (atomic)
  // ---------------------------------------------------------------------------
  const characters = useInventoryStore((s) => s.characters);
  const profile = useInventoryStore((s) => s.profile);
  const manifest = useInventoryStore((s) => s.manifest);
  const inventoryItems = useInventoryStore((s) => s.items);

  const vendorGroups = useVendorStore((s) => s.vendorGroups);
  const loading = useVendorStore((s) => s.loading);
  const error = useVendorStore((s) => s.error);
  const lastFetched = useVendorStore((s) => s.lastFetched);
  const fetchVendors = useVendorStore((s) => s.fetchVendors);

  // ---------------------------------------------------------------------------
  // Local state
  // ---------------------------------------------------------------------------
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [showUnacquiredOnly, setShowUnacquiredOnly] = useState(false);
  const [hideSilver, setHideSilver] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [popup, setPopup] = useState<PopupState | null>(null);
  const [subVendorHash, setSubVendorHash] = useState<number | null>(null);

  // ---------------------------------------------------------------------------
  // Derived: owned item hashes from player inventory
  // ---------------------------------------------------------------------------
  const ownedItemHashes = useMemo(() => {
    const set = new Set<number>();
    for (const item of inventoryItems) {
      set.add(item.itemHash);
    }
    return set;
  }, [inventoryItems]);

  // ---------------------------------------------------------------------------
  // Character selection — auto-select first character
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!selectedCharacterId && Object.keys(characters).length > 0) {
      setSelectedCharacterId(Object.keys(characters)[0]);
    }
  }, [characters, selectedCharacterId]);

  // ---------------------------------------------------------------------------
  // Fetch vendors when character changes (deduplicated by store guard)
  // ---------------------------------------------------------------------------
  const profileReady = Boolean(profile?.profile?.data?.userInfo);
  useEffect(() => {
    if (selectedCharacterId && profileReady) {
      fetchVendors(selectedCharacterId);
    }
  }, [selectedCharacterId, profileReady, fetchVendors]);

  // ---------------------------------------------------------------------------
  // Reset unacquired filter on unmount (DIM behavior)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => setShowUnacquiredOnly(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Selected class type (for filtering / badges)
  // ---------------------------------------------------------------------------
  const selectedClassType = selectedCharacterId
    ? characters[selectedCharacterId]?.classType ?? 3
    : 3;

  // ---------------------------------------------------------------------------
  // Filtered + sorted vendor groups
  // ---------------------------------------------------------------------------
  const filteredGroups = useMemo(() => {
    const filtered = filterVendorGroups(vendorGroups, {
      hideSilver,
      showUnacquiredOnly,
      searchQuery,
      ownedItemHashes,
    });
    return sortVendorGroups(filtered);
  }, [vendorGroups, hideSilver, showUnacquiredOnly, searchQuery, ownedItemHashes]);

  // Build a flat VendorGroupModel list for the sidebar nav (needs full shape)
  const sidebarNavGroups = useMemo(() => {
    return filteredGroups.map((fg) => ({
      ...fg.group,
      vendors: fg.vendors.map((fv) => fv.vendor),
    }));
  }, [filteredGroups]);

  const hasData = filteredGroups.length > 0;

  // ---------------------------------------------------------------------------
  // Resolve sub-vendor model from hash
  // ---------------------------------------------------------------------------
  const subVendorModel = useMemo((): VendorModel | null => {
    if (!subVendorHash) return null;
    for (const group of vendorGroups) {
      for (const vendor of group.vendors) {
        for (const item of vendor.items) {
          if (item.subVendor?.vendorHash === subVendorHash) {
            return item.subVendor;
          }
        }
      }
    }
    return null;
  }, [subVendorHash, vendorGroups]);

  // ---------------------------------------------------------------------------
  // Callbacks
  // ---------------------------------------------------------------------------
  const handleCharacterSelect = useCallback((charId: string) => {
    setSelectedCharacterId(charId);
    setPopup(null);
    setSubVendorHash(null);
  }, []);

  const handleRefresh = useCallback(() => {
    if (selectedCharacterId) {
      fetchVendors(selectedCharacterId);
    }
  }, [selectedCharacterId, fetchVendors]);

  const handleItemClick = useCallback((item: VendorItemModel, element: HTMLElement) => {
    setPopup((prev) => {
      // Toggle off if clicking the same item
      if (prev?.item === item) return null;
      return { item, element };
    });
  }, []);

  const handleSubVendorClick = useCallback((vendorHash: number) => {
    setSubVendorHash((prev) => (prev === vendorHash ? null : vendorHash));
    setPopup(null);
  }, []);

  const handleClosePopup = useCallback(() => setPopup(null), []);
  const handleCloseSheet = useCallback(() => setSubVendorHash(null), []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-void-bg text-void-text">
      <Navigation />

      <div className="flex">
        {/* ---- Sidebar (desktop: sticky 230px, mobile: hidden) ---- */}
        <div className="hidden lg:block">
          <VendorSidebar
            characters={characters}
            selectedCharacterId={selectedCharacterId}
            onSelectCharacter={handleCharacterSelect}
            showUnacquiredOnly={showUnacquiredOnly}
            onToggleUnacquired={() => setShowUnacquiredOnly((v) => !v)}
            hideSilver={hideSilver}
            onToggleSilver={() => setHideSilver((v) => !v)}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            vendorGroups={sidebarNavGroups}
          />
        </div>

        {/* ---- Main content ---- */}
        <main className="flex-1 min-w-0 px-4 py-4 space-y-4 lg:px-6">
          {/* Mobile-only header (character tabs + filters inline) */}
          <div className="lg:hidden space-y-3">
            <MobileHeader
              characters={characters}
              selectedCharacterId={selectedCharacterId}
              onSelectCharacter={handleCharacterSelect}
              showUnacquiredOnly={showUnacquiredOnly}
              onToggleUnacquired={() => setShowUnacquiredOnly((v) => !v)}
              hideSilver={hideSilver}
              onToggleSilver={() => setHideSilver((v) => !v)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </div>

          {/* Page title bar */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">Vendors</h1>
              <p className="text-xs text-gray-500">
                {lastFetched
                  ? `Updated ${new Date(lastFetched).toLocaleTimeString()}`
                  : 'Not yet loaded'}
              </p>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border border-void-border text-gray-400 hover:text-white bg-white/[0.04] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-sm px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Loading (initial) */}
          {loading && !hasData && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 size={32} className="animate-spin text-gray-500" />
              <span className="text-sm text-gray-500">Loading vendors...</span>
            </div>
          )}

          {/* Not logged in */}
          {!profile && !loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <span className="text-sm text-gray-500">
                Log in and load your profile first to view vendors.
              </span>
            </div>
          )}

          {/* Vendor groups */}
          {hasData &&
            filteredGroups.map((fg) => (
              <div key={fg.group.vendorGroupHash} className="space-y-2">
                {/* Group header (only when there are multiple groups) */}
                {filteredGroups.length > 1 && (
                  <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest pt-2">
                    {fg.group.def?.categoryName || 'Vendors'}
                  </h2>
                )}
                {fg.vendors.map((fv) => (
                  <VendorCard
                    key={fv.vendor.vendorHash}
                    vendor={fv.vendor}
                    characterId={selectedCharacterId!}
                    selectedClassType={selectedClassType}
                    filteredItems={fv.filteredItems}
                    manifest={manifest}
                    ownedItemHashes={ownedItemHashes}
                    onItemClick={handleItemClick}
                    onSubVendorClick={handleSubVendorClick}
                  />
                ))}
              </div>
            ))}

          {/* No results after filtering */}
          {!loading && profileReady && hasData === false && vendorGroups.length > 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <span className="text-sm text-gray-500">No vendors match your current filters.</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowUnacquiredOnly(false);
                  setHideSilver(false);
                }}
                className="text-xs text-gray-400 underline hover:text-white transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ---- Item Popup ---- */}
      {popup && (
        <VendorItemPopup
          item={popup.item}
          manifest={manifest}
          referenceElement={popup.element}
          ownedItemHashes={ownedItemHashes}
          onClose={handleClosePopup}
        />
      )}

      {/* ---- Sub-Vendor Sheet ---- */}
      {subVendorModel && selectedCharacterId && (
        <SubVendorSheet
          vendor={subVendorModel}
          characterId={selectedCharacterId}
          selectedClassType={selectedClassType}
          manifest={manifest}
          ownedItemHashes={ownedItemHashes}
          onClose={handleCloseSheet}
          onItemClick={handleItemClick}
        />
      )}
    </div>
  );
}

// ============================================================================
// Mobile Header — stacks above content on narrow screens
// ============================================================================

const CLASS_NAMES: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };

const MobileHeader: React.FC<{
  characters: Record<string, any>;
  selectedCharacterId: string | null;
  onSelectCharacter: (id: string) => void;
  showUnacquiredOnly: boolean;
  onToggleUnacquired: () => void;
  hideSilver: boolean;
  onToggleSilver: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}> = ({
  characters,
  selectedCharacterId,
  onSelectCharacter,
  showUnacquiredOnly,
  onToggleUnacquired,
  hideSilver,
  onToggleSilver,
  searchQuery,
  onSearchChange,
}) => {
  const charIds = Object.keys(characters);

  return (
    <>
      {/* Character selector — horizontal swipe */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {charIds.map((id) => {
          const char = characters[id];
          const isActive = id === selectedCharacterId;
          return (
            <button
              key={id}
              onClick={() => onSelectCharacter(id)}
              className={`shrink-0 relative h-11 w-28 rounded overflow-hidden border transition-all ${
                isActive
                  ? 'border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.06)]'
                  : 'border-void-border opacity-60 hover:opacity-90'
              }`}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: `url(https://www.bungie.net${char.emblemBackgroundPath})`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
              <div className="relative z-10 h-full flex items-center gap-2 px-2.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-white' : 'text-gray-300'}`}>
                  {CLASS_NAMES[char.classType] || '?'}
                </span>
                <span className="text-sm font-light text-amber-200/80 font-mono">
                  {char.light}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Search + filter row */}
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search vendors..."
          className="flex-1 min-w-[160px] rounded-sm border border-void-border bg-white/[0.04] px-3 py-1.5 text-xs text-white placeholder:text-gray-500 outline-none focus:border-white/20"
        />
        <button
          type="button"
          onClick={onToggleUnacquired}
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors whitespace-nowrap ${
            showUnacquiredOnly
              ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
              : 'bg-white/[0.04] border-void-border text-gray-400 hover:text-white'
          }`}
        >
          Unacquired
        </button>
        <button
          type="button"
          onClick={onToggleSilver}
          className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-sm border transition-colors whitespace-nowrap ${
            hideSilver
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              : 'bg-white/[0.04] border-void-border text-gray-400 hover:text-white'
          }`}
        >
          Hide Silver
        </button>
      </div>
    </>
  );
};
