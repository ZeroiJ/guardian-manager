import { useEffect, useCallback } from 'react';

/**
 * useResponsiveItemSize - DIM-style responsive scaling
 *
 * Dynamically adjusts the CSS --item-size variable based on window width.
 * This allows the entire inventory UI to scale proportionally.
 *
 * The media queries in index.css handle the base sizing,
 * but this hook can override for specific needs or smooth transitions.
 */

// Breakpoints matching the CSS media queries
const BREAKPOINTS = [
  { width: 2500, size: 80 },
  { width: 2000, size: 72 },
  { width: 1600, size: 60 },
  { width: 1400, size: 56 },
  { width: 1200, size: 52 },
  { width: 1024, size: 48 },
  { width: 900, size: 44 },
  { width: 768, size: 40 },
  { width: 540, size: 36 },
  { width: 0, size: 36 },   // Minimum size
];

/**
 * Get the appropriate item size for a given window width
 */
function getItemSizeForWidth(width: number): number {
  for (const bp of BREAKPOINTS) {
    if (width >= bp.width) {
      return bp.size;
    }
  }
  return 36; // Fallback minimum
}

/**
 * Update CSS custom property for item size
 */
function setItemSize(size: number) {
  document.documentElement.style.setProperty('--item-size', `${size}px`);
  document.documentElement.style.setProperty('--item-size-num', String(size));
}

/**
 * Hook to enable responsive item sizing
 *
 * @param options.enableDynamic - Whether to enable dynamic resizing (default: true)
 * @param options.debounceMs - Debounce time for resize events (default: 100)
 */
export function useResponsiveItemSize(
  options: { enableDynamic?: boolean; debounceMs?: number } = {}
) {
  const { enableDynamic = true, debounceMs = 100 } = options;

  const updateSize = useCallback(() => {
    const width = window.innerWidth;
    const size = getItemSizeForWidth(width);
    setItemSize(size);
  }, []);

  useEffect(() => {
    if (!enableDynamic) return;

    // Set initial size
    updateSize();

    // Debounced resize handler
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleResize = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(updateSize, debounceMs);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [enableDynamic, debounceMs, updateSize]);

  // Return utility to manually set size
  return {
    setSize: setItemSize,
    getSizeForWidth: getItemSizeForWidth,
    refresh: updateSize,
  };
}

/**
 * Standalone function to set a specific item size
 * Useful for user preferences (e.g. settings slider)
 */
export function setCustomItemSize(size: number) {
  setItemSize(Math.max(32, Math.min(100, size))); // Clamp between 32-100px
}

/**
 * Reset to responsive (auto) sizing
 */
export function resetToResponsiveSizing() {
  // Remove inline style to let media queries take over
  document.documentElement.style.removeProperty('--item-size');
  document.documentElement.style.removeProperty('--item-size-num');
}
