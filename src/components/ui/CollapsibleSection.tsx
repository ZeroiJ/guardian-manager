import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';

const STORAGE_KEY_PREFIX = 'gn-collapsed-';

interface CollapsibleSectionProps {
  /** Unique ID for persisting collapse state */
  sectionId: string;
  /** Main title content (left side of header) */
  title: React.ReactNode;
  /** Extra content rendered on the right side of the header (e.g. countdown) */
  extra?: React.ReactNode;
  /** Whether to start collapsed (only used if no persisted state) */
  defaultCollapsed?: boolean;
  /** Custom className for the outer wrapper */
  className?: string;
  /** Custom className for the header button */
  headerClassName?: string;
  /** Collapsible body */
  children: React.ReactNode;
  /** Anchor ID for scroll-to navigation */
  anchorId?: string;
}

function getPersistedState(sectionId: string): boolean | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + sectionId);
    if (raw === 'true') return true;
    if (raw === 'false') return false;
    return null;
  } catch {
    return null;
  }
}

function persistState(sectionId: string, collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + sectionId, String(collapsed));
  } catch {
    // Storage full or unavailable — ignore
  }
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  sectionId,
  title,
  extra,
  defaultCollapsed = false,
  className,
  headerClassName,
  children,
  anchorId,
}) => {
  const [collapsed, setCollapsed] = useState(() => {
    const persisted = getPersistedState(sectionId);
    return persisted ?? defaultCollapsed;
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  const isInitialRender = useRef(true);

  // Measure content height for animation
  useEffect(() => {
    if (!contentRef.current) return;

    if (isInitialRender.current) {
      isInitialRender.current = false;
      // Skip animation on first render
      setContentHeight(collapsed ? 0 : 'auto');
      return;
    }

    if (collapsed) {
      // Animate from current height to 0
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setContentHeight(0));
      });
    } else {
      // Animate from 0 to measured height, then set auto
      const height = contentRef.current.scrollHeight;
      setContentHeight(height);
      const timer = setTimeout(() => setContentHeight('auto'), 300);
      return () => clearTimeout(timer);
    }
  }, [collapsed]);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      persistState(sectionId, next);
      return next;
    });
  }, [sectionId]);

  return (
    <div id={anchorId} className={className}>
      <button
        type="button"
        onClick={toggle}
        className={`w-full flex items-center gap-2 text-left select-none group ${headerClassName ?? ''}`}
      >
        <ChevronRight
          size={14}
          className={`text-gray-500 shrink-0 transition-transform duration-200 ${collapsed ? '' : 'rotate-90'}`}
        />
        <div className="flex-1 min-w-0 flex items-center gap-2">{title}</div>
        {extra && <div className="shrink-0 flex items-center gap-2">{extra}</div>}
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-[height] duration-300 ease-out"
        style={{ height: contentHeight === 'auto' ? 'auto' : `${contentHeight}px` }}
      >
        {children}
      </div>
    </div>
  );
};

/** Read the persisted collapsed state for a section (used externally for fetch prioritization) */
export function isSectionCollapsed(sectionId: string): boolean {
  return getPersistedState(sectionId) ?? false;
}
