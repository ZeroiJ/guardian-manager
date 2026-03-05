/**
 * Organizer Types — Column definitions, row data, sort/filter types
 *
 * Inspired by DIM's organizer column system but adapted for our
 * Zustand + flat GuardianItem[] architecture.
 */

import type { GuardianItem } from '@/services/profile/types';
import type { ManifestDefinition } from '@/store/useInventoryStore';

// ============================================================================
// COLUMN DEFINITION
// ============================================================================

export type SortDirection = 'asc' | 'desc';

export interface ColumnSort {
    columnId: string;
    direction: SortDirection;
}

/** Context passed to every column value/cell/sort function */
export interface ColumnContext {
    manifest: Record<number, ManifestDefinition>;
    characters: Record<string, any>;
    metadata: { tags: Record<string, string>; notes: Record<string, string> } | null;
}

/**
 * A column definition for the organizer spreadsheet.
 * Each column knows how to extract a value, render a cell, sort, and export CSV.
 */
export interface OrganizerColumn {
    /** Unique column identifier */
    id: string;
    /** Display header text */
    header: string;
    /** CSS grid width (e.g., '36px', '1fr', '80px') */
    gridWidth: string;
    /** Extract a raw sortable/filterable value from an item */
    value: (item: GuardianItem, def: ManifestDefinition, ctx: ColumnContext) => string | number;
    /** Optional custom cell renderer (returns React node). If absent, value() is displayed as text. */
    cell?: (item: GuardianItem, def: ManifestDefinition, ctx: ColumnContext) => React.ReactNode;
    /** Whether this column is sortable (default true) */
    sortable?: boolean;
    /** CSV export value (defaults to value()) */
    csv?: (item: GuardianItem, def: ManifestDefinition, ctx: ColumnContext) => string;
    /** Whether this column is visible by default */
    defaultVisible?: boolean;
    /** Column group for toggling (e.g., 'stats', 'perks', 'meta') */
    group?: string;
}

// ============================================================================
// ROW DATA
// ============================================================================

/** Pre-computed row for fast sorting/rendering */
export interface OrganizerRow {
    item: GuardianItem;
    def: ManifestDefinition;
    /** Pre-computed column values keyed by column ID */
    values: Record<string, string | number>;
}

// ============================================================================
// CATEGORY TREE
// ============================================================================

export interface CategoryNode {
    /** Display name */
    label: string;
    /** Unique path segments (e.g., ['weapons', 'auto-rifle']) */
    id: string;
    /** Item category hashes to match (OR logic — item matches if it has ANY of these) */
    categoryHashes?: number[];
    /** Bucket hashes to match */
    bucketHashes?: number[];
    /** Additional filter (e.g., class type) */
    classType?: number;
    /** Child categories */
    children?: CategoryNode[];
    /** If true, this is a group header (not selectable itself) */
    isGroup?: boolean;
}
