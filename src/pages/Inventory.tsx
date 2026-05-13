import { useState, useMemo, useEffect } from "react";
import { DndContext, DragOverlay, DragEndEvent, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useNavigate } from "react-router-dom";
import { Search, BookMarked, Sprout } from "lucide-react";
import { StoreHeader } from "@/components/inventory/StoreHeader";
import { InventoryBucketLabel } from "@/components/inventory/InventoryBucketLabel";
import { StoreBucket } from "@/components/inventory/StoreBucket";
import { BUCKETS } from "@/data/constants";
import { VirtualVaultGrid } from "@/components/inventory/VirtualVaultGrid";
import { useItemPopupStore } from "@/store/useItemPopupStore";
import { ItemContextMenu } from "@/components/inventory/ItemContextMenu";
import { RefreshButton } from "@/components/ui/RefreshButton";
import { LoadingScreen } from "@/components/ui/LoadingScreen";
import { useProfile } from "@/hooks/useProfile";
import { useInventoryStore } from "@/store/useInventoryStore";
import { useWishlistStore } from "@/store/useWishlistStore";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import { useDefinitions } from "@/hooks/useDefinitions";
import { useInGameLoadouts } from "@/hooks/useInGameLoadouts";
import { useCloudSync } from "@/hooks/useCloudSync";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useFarmingMode } from "@/hooks/useFarmingMode";
import { useResponsiveItemSize } from "@/hooks/useResponsiveItemSize";
import { useBulkSelectStore } from "@/store/useBulkSelectStore";
import { filterItems } from "@/lib/search/itemFilter";
import { calculateMaxPower } from "@/lib/destiny/powerUtils";
import { CompareModal } from "@/components/CompareModal";
import { TopBar } from "@/components/layout/TopBar";
import { LoadoutDrawer } from "@/components/loadouts/LoadoutDrawer";
import { InventoryItem } from "@/components/inventory/InventoryItem";
import { BulkActionBar } from "@/components/inventory/BulkActionBar";
import { HotkeysOverlay, HotkeysButton } from "@/components/ui/HotkeysOverlay";
import { FilterPills } from "@/components/ui/FilterPills";

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    item: any;
    definition: any;
  } | null>(null);
  const [isLoadoutDrawerOpen, setIsLoadoutDrawerOpen] = useState(false);
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [isHotkeysOpen, setIsHotkeysOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');

  const showItemPopup = useItemPopupStore((s) => s.show);
  const hideItemPopup = useItemPopupStore((s) => s.hide);
  const popupItem = useItemPopupStore((s) => s.item);

  // Use the new Zipper hook
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    refresh,
  } = useProfile();

  // Auto-refresh system (30s polling with visibility check)
  const { lastUpdated, isRefreshing, triggerRefresh } = useAutoRefresh({
    onRefresh: refresh,
    enabled: !profileLoading && !profileError,
  });

  // Process in-game loadouts (Component 205 → enriched InGameLoadout[])
  useInGameLoadouts();

  // Cloud sync — init on first authenticated load, periodic incremental sync
  useCloudSync({ enabled: !profileLoading && !profileError && !!profile });

  // Responsive item sizing - DIM-style scaling based on window width
  useResponsiveItemSize();

  // Extract hashes for manifest lookup
  // Include both item hashes AND plug hashes from sockets (perks, mods, etc.)
  const itemHashes = useMemo(() => {
    if (!profile?.items) return [];
    const hashes = new Set<number>();
    for (const item of profile.items) {
      hashes.add(item.itemHash);
      // Collect all plug hashes from sockets so we can resolve perk/mod definitions
      const sockets = item.sockets?.sockets;
      if (sockets) {
        for (const socket of sockets) {
          if (socket.plugHash) {
            hashes.add(socket.plugHash);
          }
        }
      }
    }
    return Array.from(hashes);
  }, [profile?.items]);
  const { definitions: itemDefs, loading: itemDefsLoading } = useDefinitions(
    "DestinyInventoryItemDefinition",
    itemHashes,
  );

  // Fetch Stat Groups (Dependent on Item Definitions)
  const statGroupHashes = useMemo(() => {
    const hashes = new Set<number | string>();
    Object.values(itemDefs).forEach((def: any) => {
      if (def?.stats?.statGroupHash) {
        hashes.add(def.stats.statGroupHash);
      }
    });
    return Array.from(hashes);
  }, [itemDefs]);

  const { definitions: statGroupDefs, loading: statGroupsLoading } =
    useDefinitions("DestinyStatGroupDefinition", statGroupHashes);

  // Load Plug Sets (needed for subclass sockets, mods, etc.)
  const { definitions: plugSetDefs, loading: plugSetsLoading } =
    useDefinitions("DestinyPlugSetDefinition", []);

  // Merge Definitions
  const definitions = useMemo(
    () => ({ ...itemDefs, ...statGroupDefs, ...plugSetDefs }),
    [itemDefs, statGroupDefs, plugSetDefs],
  );

  // Sync Manifest to Store for Headless Engine
  const setManifest = useInventoryStore((state) => state.setManifest);
  const dupeInstanceIds = useInventoryStore((state) => state.dupeInstanceIds);
  const compareSession = useInventoryStore((state) => state.compareSession);
  const endCompare = useInventoryStore((state) => state.endCompare);
  const moveItem = useInventoryStore((state) => state.moveItem);
  const pullAllFromPostmaster = useInventoryStore((state) => state.pullAllFromPostmaster);
  const farmingMode = useInventoryStore((state) => state.farmingMode);
  const toggleFarmingMode = useInventoryStore((state) => state.toggleFarmingMode);

  // Farming mode auto-move hook
  useFarmingMode();

  useEffect(() => {
    if (Object.keys(definitions).length > 0) {
      setManifest(definitions);
    }
  }, [definitions, setManifest]);

  // Pre-load wishlist in background so it's ready when user opens item details
  const wishlistInit = useWishlistStore((s) => s.init);
  useEffect(() => { wishlistInit(); }, [wishlistInit]);

  // Compare: find all items matching the session filter
  const compareItems = useMemo(() => {
    if (!compareSession) return [];
    const allItems = profile?.items || [];
    return allItems.filter((item) => {
      if (!item.itemInstanceId) return false;
      const def = definitions[item.itemHash];
      if (!def) return false;
      // Must be same bucket (e.g. Kinetic Weapons)
      const itemBucket = item.bucketHash || def?.inventory?.bucketTypeHash || 0;
      if (itemBucket !== compareSession.bucketHash) return false;
      // Name match (stripped of Adept/Timelost)
      const name = (def?.displayProperties?.name || "")
        .replace(/\s*\((Adept|Timelost|Harrowed)\)/gi, "")
        .trim()
        .toLowerCase();
      return name === compareSession.nameFilter;
    });
  }, [compareSession, profile?.items, definitions]);

  // Filter Items Logic
  const allItems = profile?.items || [];

  // Weapon bucket hashes
  const WEAPON_BUCKETS = [1498876634, 2465295065, 953998645];
  const ARMOR_BUCKETS = [3448274436, 3551918588, 14239492, 20886954, 158489786];
  const GHOST_BUCKETS = [4023201246, 284967800, 375726501];

  // Filter items by active filter pill
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return allItems;
    let targetBuckets: number[] = [];
    switch (activeFilter) {
      case 'weapons':
        targetBuckets = WEAPON_BUCKETS;
        break;
      case 'armor':
        targetBuckets = ARMOR_BUCKETS;
        break;
      case 'ghosts':
        targetBuckets = GHOST_BUCKETS;
        break;
      default:
        return allItems;
    }
    return allItems.filter((item) => {
      const itemBucket = item.bucketHash || 0;
      return targetBuckets.includes(itemBucket);
    });
  }, [allItems, activeFilter]);

  // --- Keyboard Shortcuts ---
  const navigate = useNavigate();
  const setLockState = useInventoryStore((state) => state.setLockState);
  const bulkClear = useBulkSelectStore((s) => s.clear);
  const bulkActive = useBulkSelectStore((s) => s.active);

  useHotkeys(useMemo(() => [
    // Focus search: / or Ctrl+K
    {
      key: '/',
      handler: () => {
        const el = document.getElementById('search-items');
        if (el) el.focus();
      },
      description: 'Focus search bar',
    },
    {
      key: 'k',
      ctrl: true,
      handler: () => {
        const el = document.getElementById('search-items');
        if (el) el.focus();
      },
      description: 'Focus search bar',
      global: true,
    },
    // Escape: close popup → clear bulk → clear search → close drawer
    {
      key: 'Escape',
      handler: () => {
        if (popupItem) {
          hideItemPopup();
        } else if (contextMenu) {
          setContextMenu(null);
        } else if (bulkActive) {
          bulkClear();
        } else if (isLoadoutDrawerOpen) {
          setIsLoadoutDrawerOpen(false);
        } else if (searchQuery) {
          setSearchQuery('');
        }
      },
      description: 'Close popup / clear search',
      global: true,
    },
    // Refresh: R
    {
      key: 'r',
      handler: () => { if (!isRefreshing) triggerRefresh(); },
      description: 'Refresh profile',
    },
    // Lock: L (when item popup is open)
    {
      key: 'l',
      handler: () => {
        if (popupItem?.itemInstanceId && popupItem.lockable) {
          const isLocked = (popupItem.state & 1) !== 0;
          setLockState(popupItem.itemInstanceId, !isLocked);
        }
      },
      description: 'Lock / unlock selected item',
    },
    // Navigation: 1-4
    { key: '1', handler: () => navigate('/'), description: 'Go to Inventory' },
    { key: '2', handler: () => navigate('/loadouts'), description: 'Go to Loadouts' },
    { key: '3', handler: () => navigate('/progress'), description: 'Go to Progress' },
    { key: '4', handler: () => navigate('/vendors'), description: 'Go to Vendors' },
    // Help: ?
    { key: '?', handler: () => setIsHotkeysOpen(true), description: 'Show keyboard shortcuts', global: true },
  ], [popupItem, hideItemPopup, contextMenu, isLoadoutDrawerOpen, searchQuery, isRefreshing, triggerRefresh, setLockState, navigate, bulkActive, bulkClear, setIsHotkeysOpen]));

  // Dropdown (Live Search)
  const dropdownItems = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return filterItems(
      filteredItems,
      searchQuery,
      definitions,
      dupeInstanceIds,
    ).slice(0, 10);
  }, [filteredItems, searchQuery, definitions, dupeInstanceIds]);

  const loading =
    profileLoading ||
    (itemHashes.length > 0 && (itemDefsLoading || statGroupsLoading || plugSetsLoading));

  const handleContextMenu = (
    e: React.MouseEvent,
    item: any,
    definition: any,
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      definition,
    });
  };

  // DnD sensors: require pointer to move 8px before drag activates,
  // so that a normal click/tap fires onClick (opens item popup) undisturbed.
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 150, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleItemClick = (
    item: any,
    definition: any,
    event: React.MouseEvent,
  ) => {
    showItemPopup({
      item,
      definition,
      definitions,
      referenceElement: event.currentTarget as HTMLElement,
    });
    setIsSearchFocused(false);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const itemData = active.data.current?.item;
    if (itemData) {
      setActiveDragItem(itemData);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (over && over.data.current) {
      const draggedItem = active.data.current?.item;
      const targetStoreId = over.data.current.storeId;
      const isVault = targetStoreId === "vault";

      if (draggedItem && draggedItem.owner !== targetStoreId) {
        moveItem(draggedItem.itemInstanceId, draggedItem.itemHash, targetStoreId, isVault);
      }
    }
  };

  /** Must run before any early return — same dependency as character columns below. */
  const inventoryGridTemplate = useMemo(() => {
    const count = profile?.characters
      ? Object.keys(profile.characters).length
      : 0;
    const n = Math.max(count, 1);
    return `repeat(${n}, minmax(0, 1fr)) minmax(0, 1.35fr)`;
  }, [profile?.characters]);

  if (loading) {
    return (
      <LoadingScreen
        status="INITIALIZING GUARDIAN NEXUS"
        detail="Connecting to Neural Net (Cloudflare Worker)"
      />
    );
  }

  if (profileError) {
    // Check if it's an Auth Error
    const isAuthError =
      profileError.message.includes("Unauthorized") ||
      profileError.message.includes("401");

    if (isAuthError) {
      return (
        <div className="h-screen bg-[#050505] flex flex-col items-center justify-center font-sans space-y-8 relative overflow-hidden">
          {/* Background - Flat solid */}
          <div className="absolute inset-0 bg-dim-bg" />

          <div className="z-10 text-center space-y-6 max-w-lg px-6">
            <div className="mb-8">
              <div className="inline-block p-4 rounded-full bg-[#f5dc56]/10 border border-[#f5dc56]/20 mb-4">
                <Search className="w-12 h-12 text-[#f5dc56]" />
              </div>
              <h1 className="text-5xl font-bold tracking-tighter text-white mb-2">
                Guardian <span className="text-[#f5dc56]">Nexus</span>
              </h1>
              <p className="text-gray-400 text-lg">
                The Advanced/AI Item Manager for Destiny 2
              </p>
            </div>

            <div className="bg-dim-surface border border-dim-border rounded-xl p-8">
              <p className="text-gray-300 mb-8 leading-relaxed">
                Connect your Bungie account to manage inventory, optimize
                loadouts, and organize your vault with advanced tools.
              </p>

              <a
                href="/api/auth/login"
                className="block w-full py-4 px-6 bg-[#f5dc56] hover:bg-[#e6ce4b] text-black font-bold text-lg rounded-lg transition-colors"
              >
                Login with Bungie
              </a>
            </div>

            <div className="text-xs text-gray-600 font-mono">
              Secure OAuth 2.0 Connection • No Credentials Stored
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen bg-[#050505] text-red-500 flex flex-col items-center justify-center font-mono p-4">
        <div className="text-xl mb-4">CRITICAL SYSTEM FAILURE</div>
        <div className="bg-red-900/20 border border-red-500/50 p-4 rounded max-w-md break-words">
          {profileError.message}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors"
        >
          REBOOT SYSTEM
        </button>
      </div>
    );
  }

  // Main Grid (Always Show All)
  // Use filteredItems from useMemo above

  // Filter Items for Vault
  const vaultItems = filteredItems.filter((i) => i.owner === "vault");

  const characters = profile?.characters
    ? Object.values(profile.characters)
    : [];

  // Helper to get items for character
  const getItemsForCharacter = (charId: string) => {
    // We filter from the SEARCH results
    const charItems = filteredItems.filter((i) => i.owner === charId);

    // Find Postmaster items — check the item's RUNTIME bucketHash (where it currently sits),
    // not the definition's bucketTypeHash (which is the item's canonical slot type).
    // A weapon in the postmaster has bucketHash=215593132 but bucketTypeHash=1498876634 (kinetic), etc.
    const postmasterItems = charItems.filter((i) => {
      return i.bucketHash === 215593132; // BUCKETS.Postmaster (runtime location)
    });

    const inventoryItems = charItems.filter((i) => {
      // Exclude postmaster items by runtime bucket
      return i.bucketHash !== 215593132;
    });

    // Calculate Max Power
    // We need ALL items owned by this class (Inventory + Vault + Equipped)
    const charClassType = profile?.characters[charId]?.classType;
    const allUserItems = profile?.items || [];
    const maxPower = calculateMaxPower(
      allUserItems,
      definitions,
      charClassType,
    );

    return {
      equipment: inventoryItems.filter((i) => i.instanceData?.isEquipped),
      inventory: inventoryItems.filter((i) => !i.instanceData?.isEquipped),
      postmaster: postmasterItems,
      maxPower,
    };
  };

  return (
    <div className="h-screen bg-black text-white font-sans flex flex-col overflow-y-auto selection:bg-white selection:text-black scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
      {/* Unified Top Bar */}
      <TopBar 
        centerContent={
          <div className="w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-500" />
            <input
              id="search-items"
              name="search"
              type="text"
              placeholder="Search item, perk, is:dupe..."
              className="w-full bg-[#000]/30 border border-white/10 rounded-sm py-1.5 pl-9 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#f5dc56]/50 transition-colors font-mono"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            />

            {/* Filter Pills */}
            <div className="mt-2">
              <FilterPills activeFilter={activeFilter} onFilterChange={setActiveFilter} />
            </div>

            {/* Spotlight Search Dropdown */}
            {isSearchFocused && dropdownItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-md shadow-2xl z-50 overflow-hidden max-h-[400px] overflow-y-auto w-full">
                {dropdownItems.map((item) => {
                  const def = definitions[item.itemHash];
                  const power = item.instanceData?.primaryStat?.value;

                  return (
                    <button
                      key={item.itemInstanceId || item.itemHash}
                      className="w-full flex items-center gap-3 p-2 hover:bg-white/10 cursor-pointer transition-colors text-left group border-b border-white/5 last:border-0"
                      onClick={(e) => {
                        // Prevent blur from firing before click
                        e.preventDefault();
                        handleItemClick(item, def, e);
                      }}
                    >
                      {def?.displayProperties?.icon && (
                        <img
                          src={`https://www.bungie.net${def.displayProperties.icon}`}
                          className="w-10 h-10 rounded-sm bg-gray-800"
                          alt=""
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-gray-200 group-hover:text-white truncate">
                          {def?.displayProperties?.name || "Unknown Item"}
                        </div>
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <span className="truncate">
                            {def?.itemTypeDisplayName}
                          </span>
                          {power && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-gray-600" />
                              <span className="text-[#f5dc56]">{power}</span>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Tag/Owner indicator could go here */}
                      <div className="text-xs text-gray-600 font-mono uppercase">
                        {item.owner === "vault" ? "Vault" : "Char"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        }
        rightContent={
          <>
            <RefreshButton
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              onRefresh={triggerRefresh}
            />
            <button
              onClick={() => setIsLoadoutDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded border border-white/10 text-gray-400 hover:text-white hover:border-white/25 hover:bg-white/5 transition-all text-xs font-bold uppercase tracking-widest font-rajdhani"
              title="Quick loadout panel"
            >
              <BookMarked size={13} />
              Quick Loadout
            </button>
            <button
              onClick={() => {
                if (farmingMode.active) {
                  toggleFarmingMode();
                } else {
                  // Use the first character as default farming character
                  const firstCharId = characters[0]?.characterId;
                  if (firstCharId) toggleFarmingMode(firstCharId);
                }
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-all text-xs font-bold uppercase tracking-widest font-rajdhani ${
                farmingMode.active
                  ? 'border-green-500/50 text-green-400 bg-green-500/10 hover:bg-green-500/20'
                  : 'border-white/10 text-gray-400 hover:text-white hover:border-white/25 hover:bg-white/5'
              }`}
              title={farmingMode.active ? 'Stop farming mode' : 'Start farming mode (auto-vault engrams & consumables)'}
            >
              <Sprout size={13} />
              {farmingMode.active ? 'Farming' : 'Farm'}
            </button>
            <button className="hover:text-white">Settings</button>
            <HotkeysButton onClick={() => setIsHotkeysOpen(true)} />
          </>
        }
      />

      {/* Loadout Drawer — Phase 5 */}
      <LoadoutDrawer
        isOpen={isLoadoutDrawerOpen}
        onClose={() => setIsLoadoutDrawerOpen(false)}
      />

      {/* Hotkeys Overlay */}
      <HotkeysOverlay
        isOpen={isHotkeysOpen}
        onClose={() => setIsHotkeysOpen(false)}
      />

      {/* DndContext for Drag and Drop */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        {/* Horizontal Content - THE FLOORS */}
        {/* Horizontal Content - SLOT BASED ROWS */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 pb-32">
          {/* Floor 1: HEADERS (Emblems + Stats) */}
          <div
            className="grid h-[160px] items-start gap-2"
            style={{ gridTemplateColumns: inventoryGridTemplate }}
          >
            {characters.map((char: any) => (
              <div key={char.characterId} className="min-w-0">
                <StoreHeader storeId={char.characterId} character={char} />
              </div>
            ))}
            <div className="flex min-w-0 flex-col">
              <StoreHeader storeId="vault" vaultCount={vaultItems.length} />
            </div>
          </div>

          {/* DYNAMIC ROWS Loop */}
          {[
            { label: "Kinetic Weapons", hash: BUCKETS.Kinetic },
            { label: "Energy Weapons", hash: BUCKETS.Energy },
            { label: "Power Weapons", hash: BUCKETS.Power },
            { label: "Helmets", hash: BUCKETS.Helmet },
            { label: "Arms", hash: BUCKETS.Gauntlets },
            { label: "Chest", hash: BUCKETS.Chest },
            { label: "Legs", hash: BUCKETS.Legs },
            { label: "Class Items", hash: BUCKETS.Class },
          ].map((row) => (
            <div key={row.hash} className="flex w-full min-w-0 flex-col">
              <InventoryBucketLabel label={row.label} />
              <div
                className="grid items-start gap-2"
                style={{ gridTemplateColumns: inventoryGridTemplate }}
              >
                {characters.map((char: any) => {
                  const { equipment, inventory } = getItemsForCharacter(
                    char.characterId,
                  );
                  return (
                    <div key={char.characterId} className="min-w-0">
                      <StoreBucket
                        storeId={char.characterId}
                        bucketHash={row.hash}
                        equipment={equipment}
                        inventory={inventory}
                        definitions={definitions}
                        onItemClick={handleItemClick}
                      />
                    </div>
                  );
                })}

                <div className="min-w-0 overflow-hidden">
                  <VirtualVaultGrid
                    bucketHash={row.hash}
                    items={vaultItems}
                    definitions={definitions}
                    onItemContextMenu={handleContextMenu}
                    onItemClick={handleItemClick}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Postmaster Row */}
          {characters.some((char: any) => {
            const { postmaster } = getItemsForCharacter(char.characterId);
            return postmaster.length > 0;
          }) && (
            <div className="flex w-full min-w-0 flex-col">
              <InventoryBucketLabel label="Postmaster" />
              <div
                className="grid items-start gap-2"
                style={{ gridTemplateColumns: inventoryGridTemplate }}
              >
                {characters.map((char: any) => {
                  const { postmaster } = getItemsForCharacter(char.characterId);
                  return (
                    <div key={char.characterId} className="min-w-0">
                      {postmaster.length > 0 ? (
                        <div className="bg-[#111] border border-white/5 rounded-sm p-2">
                          <div className="flex flex-wrap gap-1">
                            {postmaster.map((item: any) => {
                              const def = definitions[item.itemHash];
                              return (
                                <InventoryItem
                                  key={item.itemInstanceId || item.itemHash}
                                  item={item}
                                  definition={def}
                                  draggable={false}
                                  onClick={(e) => handleItemClick(item, def, e)}
                                />
                              );
                            })}
                          </div>
                          <button
                            className="mt-2 w-full text-xs py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-gray-300 hover:text-white transition-colors"
                            onClick={() => pullAllFromPostmaster(char.characterId)}
                          >
                            Collect All ({postmaster.length})
                          </button>
                        </div>
                      ) : (
                        <div className="h-8" />
                      )}
                    </div>
                  );
                })}
                <div className="min-w-0" aria-hidden />
              </div>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={{ duration: 250, easing: 'ease-out' }}>
          {activeDragItem ? (
            <div className="opacity-90 scale-105 pointer-events-none drop-shadow-2xl">
              <InventoryItem
                item={activeDragItem}
                definition={definitions[activeDragItem.itemHash]}
                draggable={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Context Menu */}
      {contextMenu && (
        <ItemContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          definition={contextMenu.definition}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Item popup: global DIM-style `ItemPopupContainer` in App */}

      {/* Compare Sheet (DIM-style bottom drawer) */}
      {compareSession && compareItems.length > 0 && (
        <CompareModal
          session={compareSession}
          items={compareItems}
          definitions={definitions}
          onClose={endCompare}
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar characters={characters} />
    </div>
  );
}
