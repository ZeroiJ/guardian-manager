/**
 * Loadout Optimizer Store
 * 
 * Zustand store for managing the loadout optimization state and worker communication.
 */

import { create } from 'zustand';
import {
    ProcessItem,
    ProcessItemsByBucket,
    ProcessResult,
    ProcessArmorSet,
    StatConstraint,
    ArmorBucketHash,
    DEFAULT_STAT_CONSTRAINTS,
    ARMOR_BUCKET_HASHES,
} from '@/lib/loadout-optimizer/types';
import LoadoutOptimizerWorker from '@/workers/loadout-optimizer.worker?worker';

interface OptimizerState {
    // Configuration
    classType: number;
    constraints: StatConstraint[];
    pinnedItems: Partial<Record<ArmorBucketHash, ProcessItem>>;
    excludedItems: Set<string>;
    anyExotic: boolean;
    stopOnFirstSet: boolean;

    // Worker state
    worker: Worker | null;
    isRunning: boolean;
    progress: { completed: number; total: number } | null;

    // Results
    result: ProcessResult | null;
    selectedSet: ProcessArmorSet | null;
    error: string | null;

    // Actions
    setClassType: (classType: number) => void;
    setConstraints: (constraints: StatConstraint[]) => void;
    updateConstraint: (statHash: number, updates: Partial<StatConstraint>) => void;
    toggleConstraintIgnored: (statHash: number) => void;
    setPinnedItem: (bucket: ArmorBucketHash, item: ProcessItem | null) => void;
    toggleExcludedItem: (itemId: string) => void;
    setAnyExotic: (anyExotic: boolean) => void;
    setStopOnFirstSet: (stop: boolean) => void;
    
    // Worker actions
    runOptimization: (items: ProcessItemsByBucket) => void;
    cancelOptimization: () => void;
    selectSet: (set: ProcessArmorSet | null) => void;
    clearResults: () => void;
}

export const useOptimizerStore = create<OptimizerState>((set, get) => ({
    // Initial configuration
    classType: 0, // Titan by default
    constraints: DEFAULT_STAT_CONSTRAINTS,
    pinnedItems: {},
    excludedItems: new Set(),
    anyExotic: false,
    stopOnFirstSet: false,

    // Initial worker state
    worker: null,
    isRunning: false,
    progress: null,

    // Initial results
    result: null,
    selectedSet: null,
    error: null,

    // Configuration actions
    setClassType: (classType) => set({ classType }),

    setConstraints: (constraints) => set({ constraints }),

    updateConstraint: (statHash, updates) => set((state) => ({
        constraints: state.constraints.map(c =>
            c.statHash === statHash ? { ...c, ...updates } : c
        ),
    })),

    toggleConstraintIgnored: (statHash) => set((state) => ({
        constraints: state.constraints.map(c =>
            c.statHash === statHash ? { ...c, ignored: !c.ignored } : c
        ),
    })),

    setPinnedItem: (bucket, item) => set((state) => ({
        pinnedItems: item
            ? { ...state.pinnedItems, [bucket]: item }
            : Object.fromEntries(
                Object.entries(state.pinnedItems).filter(([key]) => key !== String(bucket))
            ),
    })),

    toggleExcludedItem: (itemId) => set((state) => {
        const newExcluded = new Set(state.excludedItems);
        if (newExcluded.has(itemId)) {
            newExcluded.delete(itemId);
        } else {
            newExcluded.add(itemId);
        }
        return { excludedItems: newExcluded };
    }),

    setAnyExotic: (anyExotic) => set({ anyExotic }),
    setStopOnFirstSet: (stopOnFirstSet) => set({ stopOnFirstSet }),

    // Worker actions
    runOptimization: (items) => {
        const state = get();
        
        // Cancel any existing worker
        if (state.worker) {
            state.worker.terminate();
        }

        // Create new worker
        const worker = new LoadoutOptimizerWorker();

        // Set up progress handler
        worker.onmessage = (event) => {
            const { type, payload } = event.data;

            switch (type) {
                case 'progress':
                    set({ progress: payload });
                    break;

                case 'result':
                    set({
                        result: payload,
                        isRunning: false,
                        progress: null,
                        error: null,
                    });
                    // Auto-select first set
                    if (payload.sets.length > 0) {
                        set({ selectedSet: payload.sets[0] });
                    }
                    // Terminate worker when done
                    worker.terminate();
                    set({ worker: null });
                    break;

                case 'error':
                    set({
                        error: payload.message,
                        isRunning: false,
                        progress: null,
                    });
                    worker.terminate();
                    set({ worker: null });
                    break;
            }
        };

        worker.onerror = (error) => {
            set({
                error: error.message,
                isRunning: false,
                progress: null,
            });
            worker.terminate();
            set({ worker: null });
        };

        set({
            worker,
            isRunning: true,
            progress: { completed: 0, total: 0 },
            result: null,
            selectedSet: null,
            error: null,
        });

        // Send optimization request
        worker.postMessage({
            type: 'optimize',
            payload: {
                items,
                constraints: state.constraints,
                pinnedItems: state.pinnedItems,
                excludedItems: Array.from(state.excludedItems),
                anyExotic: state.anyExotic,
                stopOnFirstSet: state.stopOnFirstSet,
            },
        });
    },

    cancelOptimization: () => {
        const { worker } = get();
        if (worker) {
            worker.terminate();
            set({
                worker: null,
                isRunning: false,
                progress: null,
            });
        }
    },

    selectSet: (selectedSet) => set({ selectedSet }),

    clearResults: () => set({
        result: null,
        selectedSet: null,
        error: null,
        progress: null,
    }),
}));

export default useOptimizerStore;
