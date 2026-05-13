import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Desktop-first priority collapse for secondary nav links.
 * Primary cluster + feed are treated as fixed width; remaining space fits
 * secondary links in order until overflow, then a "More" menu holds the rest.
 */

const PRIMARY_AND_FEED_PX = 380;
const GAP_PX = 14;
const MORE_BTN_PX = 56;

/** Secondary links in display priority (first fills first). */
const SECONDARY_WIDTHS_PX = [100, 92, 78, 96, 84];

function computeVisibleSecondaryCount(containerWidth: number): number {
  if (containerWidth <= 0) return 0;

  // Try fitting all secondaries without a "More" button
  let remaining =
    containerWidth - PRIMARY_AND_FEED_PX - GAP_PX * 6;
  let count = 0;
  for (let i = 0; i < SECONDARY_WIDTHS_PX.length; i++) {
    const need = SECONDARY_WIDTHS_PX[i] + GAP_PX;
    if (remaining >= need) {
      remaining -= need;
      count++;
    } else {
      break;
    }
  }

  if (count === SECONDARY_WIDTHS_PX.length) {
    return count;
  }

  // Need overflow menu — reserve space for "More"
  remaining =
    containerWidth -
    PRIMARY_AND_FEED_PX -
    MORE_BTN_PX -
    GAP_PX * 8;

  count = 0;
  for (let i = 0; i < SECONDARY_WIDTHS_PX.length; i++) {
    const need = SECONDARY_WIDTHS_PX[i] + GAP_PX;
    if (remaining >= need) {
      remaining -= need;
      count++;
    } else {
      break;
    }
  }

  return count;
}

export function useNavigationFit() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [visibleSecondaryCount, setVisibleSecondaryCount] = useState(
    SECONDARY_WIDTHS_PX.length,
  );

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setVisibleSecondaryCount(computeVisibleSecondaryCount(el.clientWidth));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const ro = new ResizeObserver(() => {
      setVisibleSecondaryCount(computeVisibleSecondaryCount(el.clientWidth));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return { containerRef, visibleSecondaryCount };
}
