# DIM UI Pattern Analysis

This document summarizes the key patterns in [Destiny Item Manager (DIM)](file:///home/zeroij/destiny-shi/DIM) that make its inventory UI fast, dense, and scalable.

---

## 1. CSS Custom Properties (The "Scaling Engine")

**Source:** [_variables.scss](file:///home/zeroij/destiny-shi/DIM/src/app/_variables.scss)

DIM uses CSS custom properties to create a **responsive scaling system**:

```scss
// Core item size - configurable by user
--item-size: 50px; // Default, can be changed in settings

// Helper function to scale any pixel value with item size
@function dim-item-px($px) {
  @return #{'(' + $px + ' / 50) * var(--item-size)'};
}
```

**Usage Example:**

```scss
.icon {
  width: calc(#{dim-item-px(13)});  // 13 / 50 * item-size
  height: calc(#{dim-item-px(13)});
}
```

> **Key Insight:** All icon sizes, paddings, and font sizes scale proportionally with `--item-size`. Change one variable → entire UI scales.

---

## 2. CSS Grid for Column Layout

**Source:** [Stores.scss](file:///home/zeroij/destiny-shi/DIM/src/app/inventory-page/Stores.scss)

DIM uses CSS Grid (not Flexbox) for the main character/vault columns:

```scss
.store-row {
  display: grid;
  grid-template-columns:
    // Character columns (fixed width based on item size)
    repeat(
      var(--num-characters),
      calc(/* equipped item outset */ + var(--character-column-width) + var(--column-padding))
    )
    // Vault takes the rest
    1fr;
}
```

> **Key Insight:** Characters get **fixed widths**, vault gets `1fr` (remaining space). This is why the vault fills the screen edge-to-edge.

---

## 3. Item Container Performance (`contain`)

**Source:** [InventoryItem.m.scss](file:///home/zeroij/destiny-shi/DIM/src/app/inventory/InventoryItem.m.scss)

DIM uses the CSS `contain` property for rendering optimization:

```scss
:global(.item) {
  position: relative;
  contain: layout paint style size;  // 🔥 THE MAGIC
  box-sizing: border-box;
  width: var(--item-size);
  height: var(--item-size);
  transition: opacity 0.2s, transform 0.2s;
}
```

> **Key Insight:** `contain: layout paint style size` tells the browser "this element is isolated" — changes inside won't trigger reflows outside. Critical for 500+ items.

---

## 4. Vault Grouping (Inline vs Stacked)

**Source:** [StoreBucket.tsx](file:///home/zeroij/destiny-shi/DIM/src/app/inventory-page/StoreBucket.tsx) + [StoreBucket.m.scss](file:///home/zeroij/destiny-shi/DIM/src/app/inventory-page/StoreBucket.m.scss)

DIM has two vault grouping modes controlled by SCSS:

```scss
.vaultGroup {
  display: flex;
  flex-flow: row wrap;
  gap: var(--item-margin);
  width: 100%;
  padding-bottom: var(--item-margin);
  border-bottom: 1px solid rgb(150, 150, 150, 0.5);

  // INLINE MODE: Groups disappear, items flow continuously
  .inlineGroups & {
    display: contents;  // 🔥 Makes the wrapper "invisible"
  }
}
```

**The `display: contents` Trick:**

- When `.inlineGroups` is active, the group wrapper becomes "invisible"
- Children (items) flow directly into the parent grid
- Result: One continuous flow of items with no breaking

---

## 5. Item Representation (Layered Compositing)

**Source:** [InventoryItem.tsx](file:///home/zeroij/destiny-shi/DIM/src/app/inventory/InventoryItem.tsx)

DIM items are composed of **layered overlays** inside a placeholder:

```tsx
<div className="item">
  <ItemIconPlaceholder item={item} hasBadge={hasBadge}>
    {/* Layers (memoized) */}
    <ItemIcon item={item} />           {/* Base icon */}
    <XPBar />                           {/* Progress bar overlay */}
    <BadgeInfo item={item} />           {/* Bottom badge (power, stack) */}
    <Icons tag={tag} locked={locked} /> {/* Top-right icon tray */}
    <WeaponFrame />                     {/* Top-right archetype icon */}
    <NewItemIndicator />                {/* Green dot for new */}
  </ItemIconPlaceholder>
</div>
```

> **Key Insight:** The contents are `useMemo`'d to prevent re-renders. The placeholder provides the sizing skeleton.

---

## 6. Design Token Summary

| Token | Value | Purpose |
|-------|-------|---------|
| `--item-size` | `50px` (default) | Base item tile size |
| `--item-margin` | `2px` | Gap between items |
| `--character-column-width` | Calculated | Width of character column |
| `--num-characters` | `3` | Number of character columns |
| `$item-border-width` | `1px` | Item tile border |
| `$badge-height` | `(item-size/5) + 4px` | Power badge height |

---

## Summary: What to Adopt

| Pattern | Current (Guardian Nexus) | DIM Approach |
|---------|-------------------------|--------------|
| **Layout** | `flex` with fixed widths | CSS Grid with `repeat()` + `1fr` |
| **Item Size** | Hardcoded `48px` | CSS variable `--item-size` |
| **Performance** | None | `contain: layout paint style size` |
| **Vault Flow** | Flex-wrap | `display: contents` for inline mode |
| **Scaling** | Manual | `dim-item-px()` function |
