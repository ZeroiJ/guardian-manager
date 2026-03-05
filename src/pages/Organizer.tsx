import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useBulkSelectStore } from '@/store/useBulkSelectStore';
import { Navigation } from '@/components/Navigation';
import { filterItems } from '@/lib/search/itemFilter';
import { CATEGORY_TREE, findCategory } from '@/lib/organizer/categories';
import { WEAPON_COLUMNS, ARMOR_COLUMNS, getDamageColor, getDamageLabel, getTagLabel, getTagEmoji } from '@/lib/organizer/columns';
import { buildRows, sortRows, filterByCategory, exportToCSV, downloadCSV } from '@/lib/organizer/utils';
import { RARITY_COLORS } from '@/data/constants';
import { ItemCategoryHashes } from '@/lib/destiny-constants';
import type { OrganizerColumn, OrganizerRow, ColumnSort, ColumnContext, CategoryNode } from '@/lib/organizer/types';
import type { GuardianItem } from '@/services/profile/types';

// ============================================================================
// CONSTANTS
// ============================================================================

const INITIAL_RENDER_COUNT = 50;
const RENDER_INCREMENT = 50;
const TAG_OPTIONS = ['favorite', 'keep', 'infuse', 'junk', 'archive'] as const;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Category sidebar tree */
function CategoryTree({
    tree,
    selectedId,
    onSelect,
    depth = 0,
}: {
    tree: CategoryNode[];
    selectedId: string;
    onSelect: (id: string) => void;
    depth?: number;
}) {
    return (
        <div className={depth > 0 ? 'ml-3' : ''}>
            {tree.map(node => (
                <div key={node.id}>
                    {node.isGroup ? (
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 mt-3 mb-1 px-2 font-semibold">
                            {node.label}
                        </div>
                    ) : (
                        <button
                            onClick={() => onSelect(node.id)}
                            className={`w-full text-left px-2 py-1 text-sm rounded-sm transition-colors ${
                                selectedId === node.id
                                    ? 'bg-white/10 text-white font-medium'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            {node.label}
                        </button>
                    )}
                    {node.children && (
                        <CategoryTree
                            tree={node.children}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            depth={depth + 1}
                        />
                    )}
                </div>
            ))}
        </div>
    );
}

/** Column header with sort indicator */
function ColumnHeader({
    column,
    sorts,
    onSort,
}: {
    column: OrganizerColumn;
    sorts: ColumnSort[];
    onSort: (columnId: string, shift: boolean) => void;
}) {
    const sortIndex = sorts.findIndex(s => s.columnId === column.id);
    const sortEntry = sortIndex >= 0 ? sorts[sortIndex] : null;

    return (
        <button
            onClick={(e) => onSort(column.id, e.shiftKey)}
            disabled={column.sortable === false}
            className={`text-left text-[10px] font-semibold uppercase tracking-wider px-2 py-2 truncate transition-colors ${
                column.sortable === false
                    ? 'text-gray-500 cursor-default'
                    : sortEntry
                        ? 'text-white'
                        : 'text-gray-400 hover:text-white cursor-pointer'
            }`}
            title={`${column.header}${sortEntry ? ` (sorted ${sortEntry.direction})` : ''}\nShift+Click to multi-sort`}
        >
            {column.header}
            {sortEntry && (
                <span className="ml-0.5 text-[9px]">
                    {sortEntry.direction === 'asc' ? '\u25B2' : '\u25BC'}
                    {sorts.length > 1 && (
                        <span className="text-gray-500 ml-0.5">{sortIndex + 1}</span>
                    )}
                </span>
            )}
        </button>
    );
}

/** Bulk action bar (floating at bottom) */
function BulkActionBar({
    selectedCount,
    onTag,
    onLock,
    onUnlock,
    onClear,
    onMove,
    characters,
}: {
    selectedCount: number;
    onTag: (tag: string | null) => void;
    onLock: () => void;
    onUnlock: () => void;
    onClear: () => void;
    onMove: (targetId: string) => void;
    characters: Record<string, any>;
}) {
    const [showTagMenu, setShowTagMenu] = useState(false);
    const [showMoveMenu, setShowMoveMenu] = useState(false);

    if (selectedCount === 0) return null;

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-void-surface border border-void-border rounded px-4 py-2 flex items-center gap-3 shadow-xl">
            <span className="text-sm text-gray-300 font-medium">{selectedCount} selected</span>
            <div className="w-px h-5 bg-white/10" />

            {/* Tag */}
            <div className="relative">
                <button
                    onClick={() => { setShowTagMenu(!showTagMenu); setShowMoveMenu(false); }}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
                >
                    Tag
                </button>
                {showTagMenu && (
                    <div className="absolute bottom-full mb-1 left-0 bg-void-surface border border-void-border rounded shadow-lg py-1 min-w-[100px]">
                        {TAG_OPTIONS.map(tag => (
                            <button
                                key={tag}
                                onClick={() => { onTag(tag); setShowTagMenu(false); }}
                                className="w-full text-left px-3 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white capitalize"
                            >
                                {getTagEmoji(tag)} {tag}
                            </button>
                        ))}
                        <div className="border-t border-white/10 my-1" />
                        <button
                            onClick={() => { onTag(null); setShowTagMenu(false); }}
                            className="w-full text-left px-3 py-1 text-xs text-gray-400 hover:bg-white/10 hover:text-white"
                        >
                            Clear Tag
                        </button>
                    </div>
                )}
            </div>

            <button
                onClick={onLock}
                className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
                title="Lock selected items"
            >
                Lock
            </button>
            <button
                onClick={onUnlock}
                className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
                title="Unlock selected items"
            >
                Unlock
            </button>

            {/* Move */}
            <div className="relative">
                <button
                    onClick={() => { setShowMoveMenu(!showMoveMenu); setShowTagMenu(false); }}
                    className="text-xs px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white transition-colors"
                >
                    Move
                </button>
                {showMoveMenu && (
                    <div className="absolute bottom-full mb-1 left-0 bg-void-surface border border-void-border rounded shadow-lg py-1 min-w-[100px]">
                        <button
                            onClick={() => { onMove('vault'); setShowMoveMenu(false); }}
                            className="w-full text-left px-3 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                        >
                            Vault
                        </button>
                        {Object.entries(characters).map(([charId, char]) => {
                            const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
                            return (
                                <button
                                    key={charId}
                                    onClick={() => { onMove(charId); setShowMoveMenu(false); }}
                                    className="w-full text-left px-3 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white"
                                >
                                    {classNames[char.classType] || 'Unknown'}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="w-px h-5 bg-white/10" />
            <button
                onClick={onClear}
                className="text-xs px-2 py-1 text-gray-400 hover:text-white transition-colors"
            >
                Clear
            </button>
        </div>
    );
}

/** Column visibility toggle panel */
function ColumnTogglePanel({
    columns,
    visibleIds,
    onToggle,
    onClose,
}: {
    columns: OrganizerColumn[];
    visibleIds: Set<string>;
    onToggle: (id: string) => void;
    onClose: () => void;
}) {
    const groups = useMemo(() => {
        const map: Record<string, OrganizerColumn[]> = {};
        for (const col of columns) {
            if (col.id === 'icon') continue;
            const group = col.group || 'other';
            if (!map[group]) map[group] = [];
            map[group].push(col);
        }
        return map;
    }, [columns]);

    const groupLabels: Record<string, string> = {
        core: 'Core',
        weapon: 'Weapon',
        stats: 'Stats',
        weapon_stats: 'Weapon Stats',
        meta: 'Metadata',
    };

    return (
        <div className="absolute right-0 top-full mt-1 z-50 bg-void-surface border border-void-border rounded shadow-xl p-3 min-w-[200px] max-h-[400px] overflow-y-auto">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Columns</span>
                <button onClick={onClose} className="text-gray-400 hover:text-white text-xs">Close</button>
            </div>
            {Object.entries(groups).map(([group, cols]) => (
                <div key={group} className="mb-2">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                        {groupLabels[group] || group}
                    </div>
                    {cols.map(col => (
                        <label key={col.id} className="flex items-center gap-2 py-0.5 cursor-pointer group">
                            <input
                                type="checkbox"
                                checked={visibleIds.has(col.id)}
                                onChange={() => onToggle(col.id)}
                                className="accent-white/80 w-3 h-3"
                            />
                            <span className="text-xs text-gray-400 group-hover:text-white">
                                {col.header || col.id}
                            </span>
                        </label>
                    ))}
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Organizer() {
    const { items, characters, manifest, metadata, moveItem, setLockState, updateMetadata } = useInventoryStore();
    const { selectedIds, toggle, selectMany, clear, isSelected } = useBulkSelectStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('weapons');
    const [sorts, setSorts] = useState<ColumnSort[]>([]);
    const [renderCount, setRenderCount] = useState(INITIAL_RENDER_COUNT);
    const [showColumnToggle, setShowColumnToggle] = useState(false);
    const [visibleColumnIds, setVisibleColumnIds] = useState<Set<string> | null>(null);

    const sentinelRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Determine if we're viewing weapons or armor based on category
    const category = useMemo(() => findCategory(selectedCategory), [selectedCategory]);

    const isArmorCategory = useMemo(() => {
        if (!category) return false;
        // Walk up: if the category is under "armor" tree, use armor columns
        const armorCats: number[] = [ItemCategoryHashes.Armor, ItemCategoryHashes.Titan, ItemCategoryHashes.Hunter, ItemCategoryHashes.Warlock];
        if (category.categoryHashes?.some(h => armorCats.includes(h))) return true;
        if (category.bucketHashes) return true; // bucket-based = armor slots
        return false;
    }, [category]);

    // Select appropriate column set
    const allColumnsForMode = isArmorCategory ? ARMOR_COLUMNS : WEAPON_COLUMNS;

    // Visible columns
    const columns = useMemo(() => {
        if (!visibleColumnIds) {
            // Default: show columns with defaultVisible=true
            return allColumnsForMode.filter(c => c.defaultVisible !== false);
        }
        return allColumnsForMode.filter(c => c.id === 'icon' || visibleColumnIds.has(c.id));
    }, [allColumnsForMode, visibleColumnIds]);

    // Column context
    const ctx: ColumnContext = useMemo(() => ({
        manifest,
        characters,
        metadata,
    }), [manifest, characters, metadata]);

    // Filter items by search query
    const searchFiltered = useMemo(() => {
        return filterItems(items, searchQuery, manifest);
    }, [items, searchQuery, manifest]);

    // Filter by category
    const categoryFiltered = useMemo(() => {
        if (!category) return searchFiltered;
        return filterByCategory(searchFiltered, category, manifest);
    }, [searchFiltered, category, manifest]);

    // Build & sort rows
    const sortedRows = useMemo(() => {
        const rows = buildRows(categoryFiltered, allColumnsForMode, ctx);
        return sortRows(rows, sorts);
    }, [categoryFiltered, allColumnsForMode, ctx, sorts]);

    // Progressive rendering
    const visibleRows = useMemo(() => {
        return sortedRows.slice(0, renderCount);
    }, [sortedRows, renderCount]);

    // Reset render count when category or search changes
    useEffect(() => {
        setRenderCount(INITIAL_RENDER_COUNT);
    }, [selectedCategory, searchQuery]);

    // IntersectionObserver for progressive rendering
    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && renderCount < sortedRows.length) {
                    setRenderCount(prev => Math.min(prev + RENDER_INCREMENT, sortedRows.length));
                }
            },
            { root: containerRef.current, threshold: 0.1 }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [renderCount, sortedRows.length]);

    // Sort handler (click = replace sort, shift+click = add to sort chain)
    const handleSort = useCallback((columnId: string, shift: boolean) => {
        setSorts(prev => {
            const existing = prev.find(s => s.columnId === columnId);

            if (shift) {
                // Multi-column sort
                if (existing) {
                    // Toggle direction or remove if already desc
                    if (existing.direction === 'asc') {
                        return prev.map(s => s.columnId === columnId ? { ...s, direction: 'desc' as const } : s);
                    } else {
                        return prev.filter(s => s.columnId !== columnId);
                    }
                } else {
                    return [...prev, { columnId, direction: 'asc' as const }];
                }
            } else {
                // Single column sort
                if (existing) {
                    if (existing.direction === 'asc') {
                        return [{ columnId, direction: 'desc' as const }];
                    } else {
                        return []; // Remove sort
                    }
                } else {
                    return [{ columnId, direction: 'asc' as const }];
                }
            }
        });
    }, []);

    // Row click handler (select/deselect)
    const handleRowClick = useCallback((item: GuardianItem, e: React.MouseEvent) => {
        if (!item.itemInstanceId) return;

        if (e.shiftKey && useBulkSelectStore.getState().lastClickedId) {
            // Range select
            const lastId = useBulkSelectStore.getState().lastClickedId;
            const startIdx = sortedRows.findIndex(r => r.item.itemInstanceId === lastId);
            const endIdx = sortedRows.findIndex(r => r.item.itemInstanceId === item.itemInstanceId);
            if (startIdx >= 0 && endIdx >= 0) {
                const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
                const ids = sortedRows.slice(from, to + 1)
                    .map(r => r.item.itemInstanceId)
                    .filter((id): id is string => !!id);
                selectMany(ids);
            }
        } else {
            toggle(item.itemInstanceId);
        }
    }, [sortedRows, toggle, selectMany]);

    // Bulk actions
    const handleBulkTag = useCallback(async (tag: string | null) => {
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await updateMetadata(id, 'tag', tag);
        }
    }, [selectedIds, updateMetadata]);

    const handleBulkLock = useCallback(async () => {
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await setLockState(id, true);
        }
    }, [selectedIds, setLockState]);

    const handleBulkUnlock = useCallback(async () => {
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            await setLockState(id, false);
        }
    }, [selectedIds, setLockState]);

    const handleBulkMove = useCallback(async (targetId: string) => {
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            const item = items.find(i => i.itemInstanceId === id);
            if (item) {
                await moveItem(id, item.itemHash, targetId, targetId === 'vault');
            }
        }
    }, [selectedIds, items, moveItem]);

    // CSV export
    const handleExport = useCallback(() => {
        const csv = exportToCSV(sortedRows, columns, ctx);
        const catLabel = category?.label || 'items';
        downloadCSV(csv, `guardian-nexus-${catLabel.toLowerCase().replace(/\s+/g, '-')}.csv`);
    }, [sortedRows, columns, ctx, category]);

    // Column toggle
    const handleColumnToggle = useCallback((id: string) => {
        setVisibleColumnIds(prev => {
            const current = prev || new Set(allColumnsForMode.filter(c => c.defaultVisible !== false).map(c => c.id));
            const next = new Set(current);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, [allColumnsForMode]);

    // Select all visible
    const handleSelectAll = useCallback(() => {
        const allIds = visibleRows
            .map(r => r.item.itemInstanceId)
            .filter((id): id is string => !!id);
        if (selectedIds.size === allIds.length) {
            clear();
        } else {
            selectMany(allIds);
        }
    }, [visibleRows, selectedIds.size, clear, selectMany]);

    // Grid template
    const gridTemplate = useMemo(() => {
        // Checkbox column + data columns
        return `32px ${columns.map(c => c.gridWidth).join(' ')}`;
    }, [columns]);

    return (
        <div className="min-h-screen bg-void-bg text-void-text font-destiny">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-void-bg/95 backdrop-blur border-b border-void-border p-4 flex items-center gap-6">
                <h1 className="text-2xl font-bold tracking-wider">GUARDIAN NEXUS</h1>
                <Navigation />
                <div className="ml-auto flex items-center gap-3">
                    <input
                        type="text"
                        placeholder="Filter items... (e.g., is:exotic perk:outlaw)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-black/50 border border-white/20 rounded px-3 py-1.5 text-white text-sm w-72 focus:outline-none focus:border-white/50"
                    />
                </div>
            </header>

            <div className="flex" style={{ height: 'calc(100vh - 65px)' }}>
                {/* Sidebar — Category Selector */}
                <aside className="w-48 flex-shrink-0 border-r border-void-border overflow-y-auto p-3">
                    <div className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 font-semibold">
                        Categories
                    </div>
                    <CategoryTree
                        tree={CATEGORY_TREE}
                        selectedId={selectedCategory}
                        onSelect={(id) => { setSelectedCategory(id); clear(); }}
                    />
                </aside>

                {/* Main Table Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Toolbar */}
                    <div className="flex items-center justify-between px-4 py-2 border-b border-void-border bg-black/20">
                        <div className="flex items-center gap-3">
                            <h2 className="text-lg font-rajdhani text-white font-semibold">
                                {category?.label || 'All Items'}
                            </h2>
                            <span className="text-xs text-gray-500">
                                {sortedRows.length} items
                            </span>
                        </div>
                        <div className="flex items-center gap-2 relative">
                            <button
                                onClick={handleExport}
                                className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-300 hover:text-white transition-colors"
                                title="Export to CSV"
                            >
                                CSV
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setShowColumnToggle(!showColumnToggle)}
                                    className="text-xs px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-gray-300 hover:text-white transition-colors"
                                    title="Toggle columns"
                                >
                                    Columns
                                </button>
                                {showColumnToggle && (
                                    <ColumnTogglePanel
                                        columns={allColumnsForMode}
                                        visibleIds={visibleColumnIds || new Set(allColumnsForMode.filter(c => c.defaultVisible !== false).map(c => c.id))}
                                        onToggle={handleColumnToggle}
                                        onClose={() => setShowColumnToggle(false)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Table */}
                    <div ref={containerRef} className="flex-1 overflow-auto">
                        {/* Header Row (CSS Grid) */}
                        <div
                            className="sticky top-0 z-10 bg-void-bg border-b border-white/10"
                            style={{ display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center' }}
                        >
                            {/* Select-all checkbox */}
                            <div className="flex items-center justify-center">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size > 0 && selectedIds.size === visibleRows.filter(r => r.item.itemInstanceId).length}
                                    onChange={handleSelectAll}
                                    className="accent-white/80 w-3.5 h-3.5 cursor-pointer"
                                    title="Select all"
                                />
                            </div>
                            {columns.map(col => (
                                <ColumnHeader key={col.id} column={col} sorts={sorts} onSort={handleSort} />
                            ))}
                        </div>

                        {/* Data Rows */}
                        {visibleRows.map((row) => (
                            <OrganizerRowComponent
                                key={row.item.itemInstanceId || row.item.itemHash}
                                row={row}
                                columns={columns}
                                gridTemplate={gridTemplate}
                                isSelected={isSelected(row.item.itemInstanceId || '')}
                                onClick={handleRowClick}
                            />
                        ))}

                        {/* Sentinel for progressive rendering */}
                        {renderCount < sortedRows.length && (
                            <div ref={sentinelRef} className="h-12 flex items-center justify-center text-xs text-gray-500">
                                Loading more... ({renderCount}/{sortedRows.length})
                            </div>
                        )}

                        {sortedRows.length === 0 && (
                            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                                No items match the current filters.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bulk Action Bar */}
            <BulkActionBar
                selectedCount={selectedIds.size}
                onTag={handleBulkTag}
                onLock={handleBulkLock}
                onUnlock={handleBulkUnlock}
                onClear={clear}
                onMove={handleBulkMove}
                characters={characters}
            />
        </div>
    );
}

// ============================================================================
// MEMOIZED ROW COMPONENT
// ============================================================================

import { memo } from 'react';

const OrganizerRowComponent = memo(function OrganizerRowComponent({
    row,
    columns,
    gridTemplate,
    isSelected,
    onClick,
}: {
    row: OrganizerRow;
    columns: OrganizerColumn[];
    gridTemplate: string;
    isSelected: boolean;
    onClick: (item: GuardianItem, e: React.MouseEvent) => void;
}) {
    const { item } = row;

    return (
        <div
            className={`border-b border-white/5 transition-colors cursor-pointer ${
                isSelected ? 'bg-white/10' : 'hover:bg-white/[0.03]'
            }`}
            style={{ display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center' }}
            onClick={(e) => onClick(item, e)}
        >
            {/* Checkbox */}
            <div className="flex items-center justify-center">
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}} // Handled by row click
                    className="accent-white/80 w-3.5 h-3.5 pointer-events-none"
                />
            </div>

            {/* Data cells */}
            {columns.map(col => (
                <div key={col.id} className="px-2 py-1.5 truncate text-sm">
                    <CellRenderer column={col} row={row} />
                </div>
            ))}
        </div>
    );
});

/** Render individual cells with column-specific formatting */
function CellRenderer({
    column,
    row,
}: {
    column: OrganizerColumn;
    row: OrganizerRow;
}) {
    const { item, def } = row;
    const value = row.values[column.id];

    switch (column.id) {
        case 'icon': {
            const icon = def.displayProperties?.icon;
            const tierType = def.inventory?.tierType ?? 0;
            const isMasterwork = (item.state & 4) !== 0;
            if (!icon) return null;
            return (
                <img
                    src={`https://www.bungie.net${icon}`}
                    alt=""
                    className="w-7 h-7 object-contain rounded-sm"
                    style={{
                        borderLeft: `2px solid ${RARITY_COLORS[tierType] || '#333'}`,
                        boxShadow: isMasterwork ? `inset 0 0 4px #eade8b40` : undefined,
                    }}
                    loading="lazy"
                />
            );
        }

        case 'name': {
            const isMasterwork = (item.state & 4) !== 0;
            return (
                <span
                    className="font-medium text-gray-200"
                    style={{ color: isMasterwork ? '#eade8b' : undefined }}
                >
                    {String(value)}
                </span>
            );
        }

        case 'power': {
            const power = value as number;
            return power > 0 ? (
                <span className="text-yellow-400 font-medium tabular-nums">{power}</span>
            ) : (
                <span className="text-gray-600">-</span>
            );
        }

        case 'tier': {
            const tierType = value as number;
            const tierNames: Record<number, string> = {
                6: 'Exotic', 5: 'Legendary', 4: 'Rare', 3: 'Uncommon', 2: 'Common',
            };
            return (
                <span
                    className="text-xs font-medium"
                    style={{ color: RARITY_COLORS[tierType] || '#888' }}
                >
                    {tierNames[tierType] || ''}
                </span>
            );
        }

        case 'element': {
            const dt = value as number;
            if (!dt || dt === 1) return <span className="text-gray-400 text-xs">{getDamageLabel(dt)}</span>;
            return (
                <span className="text-xs font-medium" style={{ color: getDamageColor(dt) }}>
                    {getDamageLabel(dt)}
                </span>
            );
        }

        case 'tag': {
            const tag = value as string;
            if (!tag) return null;
            return (
                <span className="text-xs">
                    {getTagEmoji(tag)} {getTagLabel(tag)}
                </span>
            );
        }

        case 'locked': {
            return (
                <span className={`text-xs ${value ? 'text-yellow-500' : 'text-gray-600'}`}>
                    {value ? '\uD83D\uDD12' : ''}
                </span>
            );
        }

        case 'masterwork': {
            return value ? (
                <span className="text-xs" style={{ color: '#eade8b' }}>MW</span>
            ) : null;
        }

        case 'crafted': {
            return value ? (
                <span className="text-xs text-orange-400">Yes</span>
            ) : null;
        }

        case 'energy': {
            const e = value as number;
            return e > 0 ? (
                <span className="text-xs text-blue-300 tabular-nums">{e}</span>
            ) : null;
        }

        case 'season': {
            const sn = value as number;
            return sn > 0 ? (
                <span className="text-xs text-gray-400 tabular-nums">S{sn}</span>
            ) : null;
        }

        case 'kills': {
            const k = value as number;
            return k > 0 ? (
                <span className="text-xs text-gray-300 tabular-nums">{k.toLocaleString()}</span>
            ) : null;
        }

        // Stat columns (armor + weapon)
        default: {
            if (column.id.startsWith('stat_') || column.id.startsWith('wstat_')) {
                const v = value as number;
                if (v === 0) return <span className="text-gray-600 tabular-nums text-xs">-</span>;

                // Color gradient for stats
                let color = '#d0d0d0';
                if (column.id.startsWith('stat_') && column.id !== 'stat_total') {
                    // Armor stats: 0-42 scale → red to green
                    const pct = Math.min(v / 42, 1);
                    const hue = pct * 120; // 0=red, 120=green
                    color = `hsl(${hue}, 60%, 55%)`;
                } else if (column.id === 'stat_total') {
                    // Total: 40-70 typical range
                    const pct = Math.min(Math.max((v - 40) / 30, 0), 1);
                    const hue = pct * 120;
                    color = `hsl(${hue}, 60%, 55%)`;
                }

                return (
                    <span className="tabular-nums text-xs font-medium" style={{ color }}>
                        {v}
                    </span>
                );
            }

            // Generic text value
            return <span className="text-xs text-gray-400 truncate">{String(value)}</span>;
        }
    }
}
