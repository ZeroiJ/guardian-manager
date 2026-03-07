import type {
  DestinyCollectibleState,
  DestinyDestinationDefinition,
  DestinyInventoryItemDefinition,
  DestinyPlaceDefinition,
  DestinyProfileResponse,
  DestinyVendorCategory,
  DestinyVendorComponent,
  DestinyVendorDefinition,
  DestinyVendorGroupDefinition,
  DestinyVendorSaleItemComponent,
  DestinyVendorsResponse,
} from 'bungie-api-ts/destiny2';
import { DestinyVendorItemState } from 'bungie-api-ts/destiny2';
import type { VendorGroupModel, VendorItemCost, VendorItemModel, VendorModel } from './types';

interface BuildVendorGroupsOptions {
  characterId: string;
  vendorsResponse: DestinyVendorsResponse | undefined;
  profileResponse?: DestinyProfileResponse | null;
  itemDefs: Record<number, DestinyInventoryItemDefinition | undefined>;
  vendorDefs: Record<number, DestinyVendorDefinition | undefined>;
  vendorGroupDefs: Record<number, DestinyVendorGroupDefinition | undefined>;
  destinationDefs?: Record<number, DestinyDestinationDefinition | undefined>;
  placeDefs?: Record<number, DestinyPlaceDefinition | undefined>;
}

function getCollectibleState(
  itemDef: DestinyInventoryItemDefinition | undefined,
  profileResponse: DestinyProfileResponse | null | undefined,
  characterId: string,
): DestinyCollectibleState | undefined {
  const collectibleHash = itemDef?.collectibleHash;
  if (!collectibleHash) {
    return undefined;
  }

  return (
    profileResponse?.profileCollectibles?.data?.collectibles?.[collectibleHash]?.state ??
    profileResponse?.characterCollectibles?.data?.[characterId]?.collectibles?.[collectibleHash]?.state
  );
}

function getVendorLocation(
  vendorDef: DestinyVendorDefinition | undefined,
  component: DestinyVendorComponent | undefined,
  destinationDefs: Record<number, DestinyDestinationDefinition | undefined>,
  placeDefs: Record<number, DestinyPlaceDefinition | undefined>,
): { destination?: DestinyDestinationDefinition; place?: DestinyPlaceDefinition } {
  const vendorLocationIndex = component?.vendorLocationIndex;
  if (
    vendorLocationIndex == null ||
    vendorLocationIndex < 0 ||
    !vendorDef?.locations?.[vendorLocationIndex]?.destinationHash
  ) {
    return {};
  }

  const destinationHash = vendorDef.locations[vendorLocationIndex].destinationHash;
  const destination = destinationDefs[destinationHash];
  const place = destination?.placeHash ? placeDefs[destination.placeHash] : undefined;

  return { destination, place };
}

function getFailureStrings(
  vendorDef: DestinyVendorDefinition | undefined,
  saleItem: DestinyVendorSaleItemComponent | undefined,
): string[] {
  if (!vendorDef || !saleItem?.failureIndexes?.length) {
    return [];
  }

  return saleItem.failureIndexes
    .map((index) => vendorDef.failureStrings?.[index])
    .filter((value): value is string => Boolean(value));
}

function buildVendorItem(
  vendorHash: number,
  characterId: string,
  vendorDef: DestinyVendorDefinition | undefined,
  saleItem: DestinyVendorSaleItemComponent,
  itemDefs: Record<number, DestinyInventoryItemDefinition | undefined>,
  profileResponse: DestinyProfileResponse | null | undefined,
): VendorItemModel {
  const vendorItemDef = vendorDef?.itemList?.[saleItem.vendorItemIndex];
  const itemDef = itemDefs[saleItem.itemHash];
  const costs: VendorItemCost[] = (saleItem.costs || []).map((cost) => ({
    itemHash: cost.itemHash,
    quantity: cost.quantity,
  }));

  return {
    vendorHash,
    vendorItemIndex: saleItem.vendorItemIndex,
    itemHash: saleItem.itemHash,
    itemDef,
    saleItem,
    quantity: saleItem.quantity ?? vendorItemDef?.quantity ?? 1,
    costs,
    saleStatus: saleItem.saleStatus ?? 0,
    augments: saleItem.augments ?? 0,
    failureIndexes: saleItem.failureIndexes || [],
    failureStrings: getFailureStrings(vendorDef, saleItem),
    canBeSold: !saleItem.failureIndexes?.length,
    owned: Boolean((saleItem.augments || 0) & DestinyVendorItemState.Owned),
    locked: Boolean((saleItem.augments || 0) & DestinyVendorItemState.Locked),
    displayCategoryIndex: vendorItemDef?.displayCategoryIndex,
    originalCategoryIndex: vendorItemDef?.originalCategoryIndex,
    collectibleState: getCollectibleState(itemDef, profileResponse, characterId),
    previewVendorHash: itemDef?.preview?.previewVendorHash,
    itemValueVisibility: saleItem.itemValueVisibility,
    overrideStyleItemHash: saleItem.overrideStyleItemHash,
    overrideNextRefreshDate: saleItem.overrideNextRefreshDate,
    classType: itemDef?.classType,
  };
}

function buildVendorCurrencies(
  sales: Record<string, DestinyVendorSaleItemComponent> | undefined,
  itemDefs: Record<number, DestinyInventoryItemDefinition | undefined>,
): DestinyInventoryItemDefinition[] {
  const currencyHashes = new Set<number>();

  for (const sale of Object.values(sales || {})) {
    for (const cost of sale.costs || []) {
      currencyHashes.add(cost.itemHash);
    }
  }

  return Array.from(currencyHashes)
    .map((hash) => itemDefs[hash])
    .filter((value): value is DestinyInventoryItemDefinition => Boolean(value));
}

function buildVendor(
  characterId: string,
  vendorHash: number,
  component: DestinyVendorComponent | undefined,
  categories: DestinyVendorCategory[] | undefined,
  sales: Record<string, DestinyVendorSaleItemComponent> | undefined,
  options: BuildVendorGroupsOptions,
  seenVendors = new Set<number>(),
): VendorModel | null {
  const vendorDef = options.vendorDefs[vendorHash];
  if (!vendorDef) {
    return null;
  }

  const items = Object.values(sales || {})
    .map((saleItem) =>
      buildVendorItem(
        vendorHash,
        characterId,
        vendorDef,
        saleItem,
        options.itemDefs,
        options.profileResponse,
      ),
    )
    .sort((a, b) => a.vendorItemIndex - b.vendorItemIndex);

  seenVendors.add(vendorHash);

  for (const item of items) {
    const subVendorHash = item.previewVendorHash;
    if (!subVendorHash || seenVendors.has(subVendorHash)) {
      continue;
    }

    const subVendor = buildVendor(
      characterId,
      subVendorHash,
      options.vendorsResponse?.vendors?.data?.[subVendorHash],
      options.vendorsResponse?.categories?.data?.[subVendorHash]?.categories,
      options.vendorsResponse?.sales?.data?.[subVendorHash]?.saleItems,
      options,
      new Set(seenVendors),
    );

    if (subVendor) {
      item.subVendor = subVendor;
    }
  }

  if (items.length === 0) {
    return null;
  }

  const { destination, place } = getVendorLocation(
    vendorDef,
    component,
    options.destinationDefs || {},
    options.placeDefs || {},
  );

  return {
    vendorHash,
    def: vendorDef,
    component,
    destination,
    place,
    categories: categories || [],
    items,
    currencies: buildVendorCurrencies(sales, options.itemDefs),
  };
}

export function buildVendorGroups(options: BuildVendorGroupsOptions): VendorGroupModel[] {
  const vendorGroups = options.vendorsResponse?.vendorGroups?.data?.groups;
  const vendorComponents = options.vendorsResponse?.vendors?.data || {};
  const vendorCategories = options.vendorsResponse?.categories?.data || {};
  const vendorSales = options.vendorsResponse?.sales?.data || {};

  if (!vendorGroups) {
    return [];
  }

  return Object.values(vendorGroups)
    .map((group) => {
      const vendors = (group.vendorHashes || [])
        .map((vendorHash) =>
          buildVendor(
            options.characterId,
            vendorHash,
            vendorComponents[vendorHash],
            vendorCategories[vendorHash]?.categories,
            vendorSales[vendorHash]?.saleItems,
            options,
          ),
        )
        .filter((value): value is VendorModel => Boolean(value));

      return {
        vendorGroupHash: group.vendorGroupHash,
        def: options.vendorGroupDefs[group.vendorGroupHash],
        vendors,
      };
    })
    .filter((group) => group.vendors.length > 0)
    .sort((a, b) => (a.def?.order ?? 0) - (b.def?.order ?? 0));
}
