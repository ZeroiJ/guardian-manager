/**
 * Vendor filtering logic — ported from DIM's d2-vendors.ts and selectors.ts.
 *
 * Three filter layers applied in sequence:
 * 1. Hide Silver Items — removes items costing silver + carousel/campaign categories
 * 2. Filter to Unacquired — keeps only items the player hasn't collected
 * 3. Search Query — matches vendor name or item name
 *
 * Sub-vendor recursion: a sub-vendor tile is kept if ANY of its children match.
 * Non-matching items are REMOVED entirely (not dimmed).
 */
import { DestinyCollectibleState } from 'bungie-api-ts/destiny2';
import type { VendorGroupModel, VendorItemModel, VendorModel } from './types';

const SILVER_HASH = 3147280338;
const IGNORED_CATEGORY_PREFIXES = ['categories.campaigns', 'categories.featured.carousel'];

export interface VendorFilterOptions {
  hideSilver: boolean;
  showUnacquiredOnly: boolean;
  searchQuery: string;
  ownedItemHashes: Set<number>;
}

// ============================================================================
// Individual filter predicates
// ============================================================================

/**
 * Filter: Hide Silver Items
 * - Reject items with silver cost
 * - Reject items in campaign/carousel display categories
 */
function filterSilver(
  item: VendorItemModel,
  vendor: VendorModel,
): boolean {
  // Reject if any cost is silver
  if (item.costs.some((c) => c.itemHash === SILVER_HASH && c.quantity > 0)) {
    return false;
  }

  // Reject items in ignored display categories
  const displayCategories = vendor.def?.displayCategories || [];
  const categoryIndex = item.displayCategoryIndex;
  if (categoryIndex != null && categoryIndex >= 0) {
    const identifier = displayCategories[categoryIndex]?.identifier;
    if (identifier && IGNORED_CATEGORY_PREFIXES.some((p) => identifier.startsWith(p))) {
      return false;
    }
  }

  return true;
}

/**
 * Filter: Unacquired Only
 * - Keep items that are NOT owned and NOT acquired in collections
 * - Items with collectibleState: keep if NotAcquired bit is set
 * - Items without collectibleState: keep mods/shaders not in ownedItemHashes
 */
function filterUnacquired(
  item: VendorItemModel,
  ownedItemHashes: Set<number>,
): boolean {
  // Skip if owned (vendor API flag or inventory)
  if (item.owned || ownedItemHashes.has(item.itemHash)) {
    return false;
  }

  // If collectible state exists, check the NotAcquired bit
  if (item.collectibleState !== undefined) {
    return (item.collectibleState & DestinyCollectibleState.NotAcquired) !== 0;
  }

  // No collectible state — keep the item (we can't determine acquisition)
  return true;
}

/**
 * Filter: Search Query
 * - Match vendor name OR item name (case-insensitive includes)
 */
function filterSearch(
  item: VendorItemModel,
  vendor: VendorModel,
  query: string,
): boolean {
  // Vendor name match counts for all items in that vendor
  const vendorName = vendor.def?.displayProperties?.name?.toLowerCase();
  if (vendorName?.includes(query)) return true;

  // Item name match
  const itemName = item.itemDef?.displayProperties?.name?.toLowerCase();
  if (itemName?.includes(query)) return true;

  return false;
}

// ============================================================================
// Composite filter with sub-vendor recursion
// ============================================================================

/**
 * Create a filter function that applies all active filters.
 * If an item is a sub-vendor tile, it passes if ANY of its children pass.
 */
function createItemFilter(
  options: VendorFilterOptions,
  vendor: VendorModel,
): (item: VendorItemModel) => boolean {
  const query = options.searchQuery.trim().toLowerCase();

  return function filterItem(item: VendorItemModel, seenVendors: Set<number> = new Set()): boolean {
    // Apply each active filter
    if (options.hideSilver && !filterSilver(item, vendor)) return false;
    if (options.showUnacquiredOnly && !filterUnacquired(item, options.ownedItemHashes)) return false;
    if (query && !filterSearch(item, vendor, query)) {
      // Before rejecting, check sub-vendor children
      if (item.subVendor && !seenVendors.has(item.subVendor.vendorHash)) {
        const nextSeen = new Set(seenVendors);
        nextSeen.add(item.subVendor.vendorHash);
        // Sub-vendor tile passes if ANY child matches
        // BUT: if hide silver is on, the parent tile must still pass the silver filter
        if (options.hideSilver && !filterSilver(item, vendor)) return false;
        return item.subVendor.items.some((child) => filterItem(child, nextSeen));
      }
      return false;
    }

    // Direct match — but also check sub-vendor recursion for the other filters
    // (a sub-vendor tile that passes search but whose children are all filtered by silver/unacquired
    //  should still show if the tile itself passes)

    return true;
  };
}

// ============================================================================
// Group-level filtering (DIM's filterVendorGroups)
// ============================================================================

/**
 * Apply filters to vendor groups:
 * - Filter items within each vendor
 * - Remove vendors with 0 matching items
 * - Remove groups with 0 matching vendors
 *
 * Returns a new array of filtered groups with their filtered item lists
 * stored as a Map for efficient lookup.
 */
export interface FilteredVendorGroup {
  group: VendorGroupModel;
  vendors: FilteredVendor[];
}

export interface FilteredVendor {
  vendor: VendorModel;
  filteredItems: VendorItemModel[];
}

export function filterVendorGroups(
  groups: VendorGroupModel[],
  options: VendorFilterOptions,
): FilteredVendorGroup[] {
  return groups
    .map((group) => {
      const vendors = group.vendors
        .map((vendor) => {
          const predicate = createItemFilter(options, vendor);
          const filteredItems = vendor.items.filter((item) => predicate(item));
          return { vendor, filteredItems };
        })
        .filter((v) => v.filteredItems.length > 0);

      return { group, vendors };
    })
    .filter((g) => g.vendors.length > 0);
}
