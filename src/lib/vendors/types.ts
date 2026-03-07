import type {
  DestinyCollectibleState,
  DestinyDestinationDefinition,
  DestinyInventoryItemDefinition,
  DestinyPlaceDefinition,
  DestinyVendorCategory,
  DestinyVendorComponent,
  DestinyVendorDefinition,
  DestinyVendorGroupDefinition,
  DestinyVendorSaleItemComponent,
} from 'bungie-api-ts/destiny2';

export interface VendorItemCost {
  itemHash: number;
  quantity: number;
}

export interface VendorItemModel {
  vendorHash: number;
  vendorItemIndex: number;
  itemHash: number;
  itemDef?: DestinyInventoryItemDefinition;
  saleItem?: DestinyVendorSaleItemComponent;
  quantity: number;
  costs: VendorItemCost[];
  saleStatus: number;
  augments: number;
  failureIndexes: number[];
  failureStrings: string[];
  canBeSold: boolean;
  owned: boolean;
  locked: boolean;
  displayCategoryIndex?: number;
  originalCategoryIndex?: number;
  collectibleState?: DestinyCollectibleState;
  previewVendorHash?: number;
  itemValueVisibility?: boolean[];
  overrideStyleItemHash?: number;
  overrideNextRefreshDate?: string;
  classType?: number;
  subVendor?: VendorModel;
}

export interface VendorModel {
  vendorHash: number;
  def?: DestinyVendorDefinition;
  component?: DestinyVendorComponent;
  destination?: DestinyDestinationDefinition;
  place?: DestinyPlaceDefinition;
  categories: DestinyVendorCategory[];
  items: VendorItemModel[];
  currencies: DestinyInventoryItemDefinition[];
}

export interface VendorGroupModel {
  vendorGroupHash: number;
  def?: DestinyVendorGroupDefinition;
  vendors: VendorModel[];
}
