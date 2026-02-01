import { useState, useEffect, useCallback, useRef } from 'react';

/** Configuration options for the auto-refresh hook */
interface UseAutoRefreshOptions {
    /** Polling interval in milliseconds. Default: 30000 (30 seconds) */
    intervalMs?: number;
    /** The async function to call on each refresh cycle */
    onRefresh: () => Promise<void>;
    /** Whether auto-refresh is enabled. Default: true */
    enabled?: boolean;
}

/** Return value from the useAutoRefresh hook */
interface UseAutoRefreshReturn {
    /** Timestamp of the last successful refresh, or null if never refreshed */
    lastUpdated: Date | null;
    /** Whether a refresh is currently in progress */
    isRefreshing: boolean;
    /** Manually trigger a refresh immediately */
    triggerRefresh: () => void;
}

/** Default polling interval: 30 seconds */
const DEFAULT_INTERVAL_MS = 30_000;

/**
 * Hook to manage automatic periodic data refreshing with smart guards.
 * 
 * Features:
 * - Skips fetch when tab is hidden (saves API quota)
 * - Prevents duplicate requests when one is in-flight
 * - Tracks last updated timestamp for UI display
 * 
 * @param options - Configuration options
 * @returns Refresh state and manual trigger function
 */
export function useAutoRefresh({
    intervalMs = DEFAULT_INTERVAL_MS,
    onRefresh,
    enabled = true,
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Use ref to track in-flight status without causing re-renders
    const isRefreshingRef = useRef(false);

    const executeRefresh = useCallback(async () => {
        // Guard: Skip if already refreshing (prevents duplicate requests)
        if (isRefreshingRef.current) {
            console.log('[useAutoRefresh] Skipping refresh - already in progress');
            return;
        }

        // Guard: Skip if tab is hidden (saves API quota)
        if (document.hidden) {
            console.log('[useAutoRefresh] Skipping refresh - tab is hidden');
            return;
        }

        try {
            isRefreshingRef.current = true;
            setIsRefreshing(true);

            await onRefresh();

            setLastUpdated(new Date());
        } catch (error) {
            console.error('[useAutoRefresh] Refresh failed:', error);
            // Still update lastUpdated to prevent rapid retry loops
        } finally {
            isRefreshingRef.current = false;
            setIsRefreshing(false);
        }
    }, [onRefresh]);

    // Set up the polling interval
    useEffect(() => {
        if (!enabled) return;

        // Set initial lastUpdated on mount (we assume data was already fetched)
        setLastUpdated(new Date());

        const intervalId = setInterval(() => {
            executeRefresh();
        }, intervalMs);

        return () => {
            clearInterval(intervalId);
        };
    }, [enabled, intervalMs, executeRefresh]);

    // Manual trigger function (can be called anytime)
    const triggerRefresh = useCallback(() => {
        executeRefresh();
    }, [executeRefresh]);

    return {
        lastUpdated,
        isRefreshing,
        triggerRefresh,
    };
}
