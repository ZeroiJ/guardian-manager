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
import { ManifestManager } from '@/services/manifest/manager';
import { buildVendorGroups } from '@/lib/vendors/build-vendors';
import type { VendorGroupModel } from '@/lib/vendors/types';
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
    /** Raw Bungie vendor response for this vendor when detail fetch is used */
    rawResponse?: any;
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
    /** Transformed vendor groups for the active character */
    vendorGroups: VendorGroupModel[];
    /** Raw Bungie vendors response keyed by characterId */
    responsesByCharacter: Record<string, any>;
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

/** In-flight fetch guard — prevents duplicate concurrent fetches for the same character */
let activeFetchCharacterId: string | null = null;

/**
 * Load all vendor-related definition tables from the manifest.
 * Uses ManifestManager's two-tier cache (memory → IndexedDB → network).
 */
async function loadVendorDefinitions() {
    const [vendorDefs, vendorGroupDefs, destinationDefs, placeDefs, itemDefs] = await Promise.all([
        ManifestManager.loadTable('DestinyVendorDefinition'),
        ManifestManager.loadTable('DestinyVendorGroupDefinition'),
        ManifestManager.loadTable('DestinyDestinationDefinition'),
        ManifestManager.loadTable('DestinyPlaceDefinition'),
        ManifestManager.loadTable('DestinyInventoryItemDefinition'),
    ]);
    return { vendorDefs, vendorGroupDefs, destinationDefs, placeDefs, itemDefs };
}

async function rebuildVendorGroupsForCharacter(characterId: string, response: any): Promise<VendorGroupModel[]> {
    const inventoryState = useInventoryStore.getState();
    const profile = inventoryState.profile;
    const manifest = inventoryState.manifest;

    const { vendorDefs, vendorGroupDefs, destinationDefs, placeDefs, itemDefs } = await loadVendorDefinitions();

    // Merge: full item definition table + inventory manifest overlay (inventory manifest
    // may have slightly richer data for items the player owns, but the full table ensures
    // vendor-only items like bounties, quests, rank rewards are always resolved)
    const mergedItemDefs = { ...itemDefs, ...manifest };

    return buildVendorGroups({
        characterId,
        vendorsResponse: response,
        profileResponse: profile,
        itemDefs: mergedItemDefs,
        vendorDefs,
        vendorGroupDefs,
        destinationDefs,
        placeDefs,
    });
}

// ============================================================================
// STORE
// ============================================================================

export const useVendorStore = create<VendorState>()((set, get) => ({
    vendors: {},
    vendorHashes: [],
    vendorGroups: [],
    responsesByCharacter: {},
    activeCharacterId: null,
    loading: false,
    error: null,
    lastFetched: null,
    detailLoading: new Set(),

    fetchVendors: async (characterId: string) => {
        // Deduplicate: skip if already fetching for this character
        if (activeFetchCharacterId === characterId) {
            return;
        }

        const membership = getMembershipInfo();
        if (!membership) {
            set({ error: 'Not logged in — no membership data available.' });
            return;
        }

        activeFetchCharacterId = characterId;
        set({ loading: true, error: null, activeCharacterId: characterId });

        try {
            const response = await APIClient.getVendors(
                membership.membershipType,
                membership.membershipId,
                characterId,
            );

            const inventoryState = useInventoryStore.getState();
            const manifest = inventoryState.manifest;

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
                    rawResponse: undefined,
                };
            }

            const vendorGroups = await rebuildVendorGroupsForCharacter(characterId, response);

            set({
                vendors,
                vendorHashes,
                vendorGroups,
                responsesByCharacter: {
                    ...get().responsesByCharacter,
                    [characterId]: response,
                },
                loading: false,
                lastFetched: Date.now(),
            });
        } catch (err: any) {
            console.error('[VendorStore] Failed to fetch vendors:', err);
            set({
                loading: false,
                error: err?.message || 'Failed to fetch vendors',
            });
        } finally {
            activeFetchCharacterId = null;
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
            const responsesByCharacter = { ...get().responsesByCharacter };
            if (updated[key]) {
                updated[key] = {
                    ...updated[key],
                    hasItemDetails: true,
                    itemComponents: response?.itemComponents || null,
                    rawResponse: response,
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

            const baseResponse = responsesByCharacter[characterId];
            if (baseResponse) {
                responsesByCharacter[characterId] = {
                    ...baseResponse,
                    vendors: {
                        ...baseResponse.vendors,
                        data: {
                            ...baseResponse.vendors?.data,
                            [vendorHash]: response?.vendor?.data || baseResponse.vendors?.data?.[vendorHash],
                        },
                    },
                    categories: {
                        ...baseResponse.categories,
                        data: {
                            ...baseResponse.categories?.data,
                            [vendorHash]: response?.categories?.data
                                ? { categories: response.categories.data.categories || [] }
                                : baseResponse.categories?.data?.[vendorHash],
                        },
                    },
                    sales: {
                        ...baseResponse.sales,
                        data: {
                            ...baseResponse.sales?.data,
                            [vendorHash]: response?.sales?.data
                                ? { saleItems: response.sales.data || {} }
                                : baseResponse.sales?.data?.[vendorHash],
                        },
                    },
                    itemComponents: {
                        ...(baseResponse.itemComponents || {}),
                        [vendorHash]: response?.itemComponents || (baseResponse.itemComponents || {})[vendorHash],
                    },
                };
            }

            const vendorGroups = characterId === get().activeCharacterId && responsesByCharacter[characterId]
                ? await rebuildVendorGroupsForCharacter(characterId, responsesByCharacter[characterId])
                : get().vendorGroups;

            const doneLoading = new Set(get().detailLoading);
            doneLoading.delete(vendorHash);
            set({
                vendors: updated,
                responsesByCharacter,
                vendorGroups,
                detailLoading: doneLoading,
            });
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
            vendorGroups: [],
            responsesByCharacter: {},
            activeCharacterId: null,
            loading: false,
            error: null,
        lastFetched: null,
        detailLoading: new Set(),
    }),
}));
