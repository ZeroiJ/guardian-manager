import React, { useMemo } from 'react';
import type { VendorItemModel, VendorModel } from '@/lib/vendors/types';
import { VendorItemTile } from './VendorItemTile';

/** Category identifiers to skip entirely (DIM ignores these too) */
const IGNORE_CATEGORIES = ['category_preview'];

interface VendorCategoryItemsProps {
  vendor: VendorModel;
  items: VendorItemModel[];
  manifest: Record<number, any>;
  selectedClassType: number;
  ownedItemHashes?: Set<number>;
  onItemClick?: (item: VendorItemModel, element: HTMLElement) => void;
  onSubVendorClick?: (vendorHash: number) => void;
}

interface CategoryGroup {
  name: string;
  identifier?: string;
  items: VendorItemModel[];
}

export const VendorCategoryItems: React.FC<VendorCategoryItemsProps> = ({
  vendor,
  items,
  manifest,
  selectedClassType,
  ownedItemHashes,
  onItemClick,
  onSubVendorClick,
}) => {
  const categories = useMemo(() => {
    const displayCategories = vendor.def?.displayCategories || [];

    // Group items by displayCategoryIndex
    const grouped = new Map<number, VendorItemModel[]>();
    for (const item of items) {
      const key = item.displayCategoryIndex ?? -1;
      const existing = grouped.get(key) || [];
      existing.push(item);
      grouped.set(key, existing);
    }

    // Remove items with undefined category index
    grouped.delete(-1);

    const result: CategoryGroup[] = [];
    for (const [categoryIndex, categoryItems] of grouped) {
      const displayCategory = displayCategories[categoryIndex];
      const identifier = displayCategory?.identifier;

      // Skip ignored categories (matches DIM behavior)
      if (identifier && IGNORE_CATEGORIES.some((ig) => identifier.startsWith(ig))) {
        continue;
      }

      result.push({
        name: displayCategory?.displayProperties?.name || `Category ${categoryIndex}`,
        identifier,
        items: categoryItems,
      });
    }

    // If we have ungrouped items (categoryIndex -1) and they got deleted above,
    // re-add items without a category into a catch-all
    const uncategorized = items.filter((i) => i.displayCategoryIndex == null || i.displayCategoryIndex < 0);
    if (uncategorized.length > 0) {
      result.unshift({ name: 'Items', items: uncategorized });
    }

    return result;
  }, [vendor.def, items]);

  if (categories.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-8 gap-y-1 mt-2">
      {categories.map((category, idx) => (
        <div key={`${category.name}-${idx}`}>
          {/* Category header — only show if there are multiple categories */}
          {categories.length > 1 && (
            <h4 className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500 mb-1.5 mt-2 first:mt-0">
              {category.name}
            </h4>
          )}
          <div className="flex flex-wrap gap-2">
            {category.items.map((item) => (
              <VendorItemTile
                key={`${vendor.vendorHash}-${item.vendorItemIndex}`}
                item={item}
                manifest={manifest}
                selectedClassType={selectedClassType}
                ownedItemHashes={ownedItemHashes}
                onClick={onItemClick}
                onSubVendorClick={onSubVendorClick}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
