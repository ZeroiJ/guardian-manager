/**
 * Vendor Store — Zustand store for vendor data.
 *
 * Manages fetching and caching vendor data from Bungie's GetVendors/GetVendor endpoints.
 * Data is per-character (vendors change per class/character progression).
 *
 * Architecture:
 * - Phase 1 (lightweight): GetVendors for all vendor sales, categories, availability
 * - Phase 2 (on-demand): GetVendor for individual vendors needing item details (stats, perks)
 */
import { create } from 'zustand';
import { APIClient } from '@/services/api/client';
import { useInventoryStore } from './useInventoryStore';

// ============================================================================
// TYPES
// ============================================================================

/** Processed vendor data ready for the UI */
export interface VendorData {
    /** Vendor definition hash */
    vendorHash: number;
    /** Character ID this data is for */
    characterId: string;
    /** Vendor component from Bungie (nextRefreshDate, enabled, etc.) */
    component: any;
    /** Vendor categories (display groupings) */
    categories: any[];
    /** Sale items keyed by vendorItemIndex */
    sales: Record<string, VendorSaleItem>;
    /** Whether we've fetched detailed item components for this vendor */
    hasItemDetails: boolean;
    /** Item component data (stats, sockets, perks) from detailed fetch */
    itemComponents: any | null;
}

/** A single sale item from a vendor */
export interface VendorSaleItem {
    /** Vendor item index (position in vendor's inventory) */
    vendorItemIndex: number;
    /** Item definition hash */
    itemHash: number;
    /** Quantity available (-1 = unlimited) */
    quantity: number;
    /** Cost entries */
    costs: Array<{ itemHash: number; quantity: number }>;
    /** Whether the player owns this already (for collectibles) */
    saleStatus: number;
    /** Override style info */
    overrideStyleItemHash?: number;
    /** Augments info */
    augments?: number;
    /** API quantity (for currency items) */
    overrideNextRefreshDate?: string;
}

interface VendorState {
    /** Vendor data keyed by `${characterId}_${vendorHash}` */
    vendors: Record<string, VendorData>;
    /** All vendor hashes returned for the current character */
    vendorHashes: number[];
    /** Character ID currently loaded for */
    activeCharacterId: string | null;
    /** Loading state */
    loading: boolean;
    /** Error message */
    error: string | null;
    /** Timestamp of last fetch */
    lastFetched: number | null;
    /** Set of vendor hashes currently being detail-fetched */
    detailLoading: Set<number>;

    // Actions
    /** Fetch all vendors for a character */
    fetchVendors: (characterId: string) => Promise<void>;
    /** Fetch detailed item components for a single vendor */
    fetchVendorDetails: (characterId: string, vendorHash: number) => Promise<void>;
    /** Clear all vendor data */
    clear: () => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function getMembershipInfo(): { membershipType: number; membershipId: string } | null {
    const profile = useInventoryStore.getState().profile;
    const userInfo = profile?.profile?.data?.userInfo;
    if (!userInfo) return null;
    return {
        membershipType: userInfo.membershipType || 3,
        membershipId: userInfo.membershipId,
    };
}

function vendorKey(characterId: string, vendorHash: number): string {
    return `${characterId}_${vendorHash}`;
}

// ============================================================================
// STORE
// ============================================================================

export const useVendorStore = create<VendorState>()((set, get) => ({
    vendors: {},
    vendorHashes: [],
    activeCharacterId: null,
    loading: false,
    error: null,
    lastFetched: null,
    detailLoading: new Set(),

    fetchVendors: async (characterId: string) => {
        const membership = getMembershipInfo();
        if (!membership) {
            set({ error: 'Not logged in — no membership data available.' });
            return;
        }

        set({ loading: true, error: null, activeCharacterId: characterId });

        try {
            const response = await APIClient.getVendors(
                membership.membershipType,
                membership.membershipId,
                characterId,
            );

            // Parse the vendor response
            const vendorComponents = response?.vendors?.data || {};
            const vendorCategories = response?.categories?.data || {};
            const vendorSales = response?.sales?.data || {};

            const vendorHashes: number[] = [];
            const vendors: Record<string, VendorData> = {};

            for (const [hashStr, component] of Object.entries(vendorComponents)) {
                const vendorHash = Number(hashStr);
                vendorHashes.push(vendorHash);

                const categories = (vendorCategories[hashStr] as any)?.categories || [];
                const salesMap: Record<string, VendorSaleItem> = {};

                const salesData = (vendorSales[hashStr] as any)?.saleItems || {};
                for (const [indexStr, sale] of Object.entries(salesData)) {
                    const s = sale as any;
                    salesMap[indexStr] = {
                        vendorItemIndex: Number(indexStr),
                        itemHash: s.itemHash,
                        quantity: s.quantity ?? -1,
                        costs: s.costs || [],
                        saleStatus: s.saleStatus ?? 0,
                        overrideStyleItemHash: s.overrideStyleItemHash,
                        augments: s.augments,
                        overrideNextRefreshDate: s.overrideNextRefreshDate,
                    };
                }

                vendors[vendorKey(characterId, vendorHash)] = {
                    vendorHash,
                    characterId,
                    component: component as any,
                    categories,
                    sales: salesMap,
                    hasItemDetails: false,
                    itemComponents: null,
                };
            }

            set({
                vendors,
                vendorHashes,
                loading: false,
                lastFetched: Date.now(),
            });
        } catch (err: any) {
            console.error('[VendorStore] Failed to fetch vendors:', err);
            set({
                loading: false,
                error: err?.message || 'Failed to fetch vendors',
            });
        }
    },

    fetchVendorDetails: async (characterId: string, vendorHash: number) => {
        const membership = getMembershipInfo();
        if (!membership) return;

        const key = vendorKey(characterId, vendorHash);
        const existing = get().vendors[key];
        if (!existing || existing.hasItemDetails) return;

        // Mark as loading
        const loading = new Set(get().detailLoading);
        loading.add(vendorHash);
        set({ detailLoading: loading });

        try {
            const response = await APIClient.getVendor(
                membership.membershipType,
                membership.membershipId,
                characterId,
                vendorHash,
            );

            // Merge item components into existing vendor data
            const updated = { ...get().vendors };
            if (updated[key]) {
                updated[key] = {
                    ...updated[key],
                    hasItemDetails: true,
                    itemComponents: response?.itemComponents || null,
                    // Also update sales if the detailed response has them
                    ...(response?.sales?.data ? {
                        sales: (() => {
                            const salesMap: Record<string, VendorSaleItem> = {};
                            const salesData = response.sales.data.saleItems || {};
                            for (const [indexStr, sale] of Object.entries(salesData)) {
                                const s = sale as any;
                                salesMap[indexStr] = {
                                    vendorItemIndex: Number(indexStr),
                                    itemHash: s.itemHash,
                                    quantity: s.quantity ?? -1,
                                    costs: s.costs || [],
                                    saleStatus: s.saleStatus ?? 0,
                                    overrideStyleItemHash: s.overrideStyleItemHash,
                                    augments: s.augments,
                                    overrideNextRefreshDate: s.overrideNextRefreshDate,
                                };
                            }
                            return salesMap;
                        })(),
                    } : {}),
                };
            }

            const doneLoading = new Set(get().detailLoading);
            doneLoading.delete(vendorHash);
            set({ vendors: updated, detailLoading: doneLoading });
        } catch (err: any) {
            console.error(`[VendorStore] Failed to fetch vendor ${vendorHash}:`, err);
            const doneLoading = new Set(get().detailLoading);
            doneLoading.delete(vendorHash);
            set({ detailLoading: doneLoading });
        }
    },

    clear: () => set({
        vendors: {},
        vendorHashes: [],
        activeCharacterId: null,
        loading: false,
        error: null,
        lastFetched: null,
        detailLoading: new Set(),
    }),
}));
