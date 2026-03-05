/**
 * Organizer Utilities — Sorting, row building, CSV export, item filtering
 */

import type { GuardianItem } from '@/services/profile/types';
import type { ManifestDefinition } from '@/store/useInventoryStore';
import type { OrganizerColumn, OrganizerRow, ColumnSort, ColumnContext, CategoryNode } from './types';

// ============================================================================
// ROW BUILDING
// ============================================================================

/**
 * Pre-compute all column values for each item into an OrganizerRow.
 * This allows fast sorting without re-extracting values.
 */
export function buildRows(
    items: GuardianItem[],
    columns: OrganizerColumn[],
    ctx: ColumnContext,
): OrganizerRow[] {
    return items.reduce<OrganizerRow[]>((rows, item) => {
        const def = ctx.manifest[item.itemHash];
        if (!def) return rows;

        const values: Record<string, string | number> = {};
        for (const col of columns) {
            values[col.id] = col.value(item, def, ctx);
        }

        rows.push({ item, def, values });
        return rows;
    }, []);
}

// ============================================================================
// SORTING
// ============================================================================

/**
 * Build a chained comparator from multiple sort columns.
 * Earlier columns take priority; ties break by subsequent columns.
 */
export function sortRows(rows: OrganizerRow[], sorts: ColumnSort[]): OrganizerRow[] {
    if (sorts.length === 0) return rows;

    const sorted = [...rows];
    sorted.sort((a, b) => {
        for (const sort of sorts) {
            const aVal = a.values[sort.columnId];
            const bVal = b.values[sort.columnId];
            let cmp = 0;

            if (typeof aVal === 'number' && typeof bVal === 'number') {
                cmp = aVal - bVal;
            } else {
                const aStr = String(aVal ?? '');
                const bStr = String(bVal ?? '');
                cmp = aStr.localeCompare(bStr);
            }

            if (cmp !== 0) {
                return sort.direction === 'desc' ? -cmp : cmp;
            }
        }
        return 0;
    });

    return sorted;
}

// ============================================================================
// CATEGORY FILTERING
// ============================================================================

/**
 * Filter items by category node criteria.
 * Checks categoryHashes (OR), bucketHashes (OR), and classType.
 */
export function filterByCategory(
    items: GuardianItem[],
    category: CategoryNode,
    manifest: Record<number, ManifestDefinition>,
): GuardianItem[] {
    return items.filter(item => {
        const def = manifest[item.itemHash];
        if (!def) return false;

        // Category hash filter (item must have at least one matching category)
        if (category.categoryHashes && category.categoryHashes.length > 0) {
            const itemCats = def.itemCategoryHashes || [];
            const hasMatch = category.categoryHashes.some(h => itemCats.includes(h));
            if (!hasMatch) return false;
        }

        // Bucket hash filter
        if (category.bucketHashes && category.bucketHashes.length > 0) {
            // Check both runtime bucket and manifest bucket
            const runtimeBucket = item.bucketHash;
            const manifestBucket = def.inventory?.bucketTypeHash;
            const hasMatch = category.bucketHashes.some(h => h === runtimeBucket || h === manifestBucket);
            if (!hasMatch) return false;
        }

        // Class type filter
        if (category.classType !== undefined) {
            if (def.classType !== category.classType) return false;
        }

        return true;
    });
}

// ============================================================================
// CSV EXPORT
// ============================================================================

/**
 * Export rows to CSV format.
 * Uses the column's csv() function if defined, otherwise value().
 */
export function exportToCSV(
    rows: OrganizerRow[],
    columns: OrganizerColumn[],
    ctx: ColumnContext,
): string {
    const visibleColumns = columns.filter(c => c.id !== 'icon');

    // Header row
    const headers = visibleColumns.map(c => `"${c.header}"`);

    // Data rows
    const dataRows = rows.map(row => {
        return visibleColumns.map(col => {
            const csvFn = col.csv || col.value;
            const val = csvFn(row.item, row.def, ctx);
            // Escape quotes in CSV values
            return `"${String(val).replace(/"/g, '""')}"`;
        }).join(',');
    });

    return [headers.join(','), ...dataRows].join('\n');
}

/**
 * Trigger a CSV download in the browser.
 */
export function downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
