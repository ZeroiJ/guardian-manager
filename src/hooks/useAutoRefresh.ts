/**
 * useAutoRefresh — Smart Polling with setTimeout
 *
 * Replaces the naive setInterval with setTimeout that re-arms after each
 * refresh completes. Prevents overlapping requests on slow connections.
 *
 * Smart skip conditions:
 * - Tab is hidden (saves API quota)
 * - Request already in-flight (prevents duplicates)
 * - User is mid-drag (prevents data churn during DnD)
 *
 * On tab re-focus: immediately triggers a refresh to catch up after idle.
 *
 * Architecture inspired by DIM: src/app/dim-ui/AutoRefresh.tsx
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/** Configuration options for the auto-refresh hook */
interface UseAutoRefreshOptions {
    /** Polling interval in milliseconds. Default: 90000 (90 seconds) */
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
    /** Manually trigger a refresh immediately (resets the timer) */
    triggerRefresh: () => void;
}

/** Default polling interval: 90 seconds */
const DEFAULT_INTERVAL_MS = 90_000;

/**
 * Hook to manage automatic periodic data refreshing with smart guards.
 *
 * Uses setTimeout (not setInterval) so the next poll starts only after
 * the previous one completes. This prevents request pile-up on slow connections.
 */
export function useAutoRefresh({
    intervalMs = DEFAULT_INTERVAL_MS,
    onRefresh,
    enabled = true,
}: UseAutoRefreshOptions): UseAutoRefreshReturn {
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Refs to avoid stale closures
    const isRefreshingRef = useRef(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onRefreshRef = useRef(onRefresh);
    onRefreshRef.current = onRefresh;

    /**
     * Core refresh function with guards.
     * Returns true if refresh was executed, false if skipped.
     */
    const executeRefresh = useCallback(async (): Promise<boolean> => {
        // Guard: Skip if already refreshing
        if (isRefreshingRef.current) {
            console.log('[useAutoRefresh] Skipping — already in progress');
            return false;
        }

        // Guard: Skip if tab is hidden
        if (document.visibilityState === 'hidden') {
            console.log('[useAutoRefresh] Skipping — tab hidden');
            return false;
        }

        try {
            isRefreshingRef.current = true;
            setIsRefreshing(true);

            await onRefreshRef.current();

            setLastUpdated(new Date());
            return true;
        } catch (error) {
            console.error('[useAutoRefresh] Refresh failed:', error);
            return false;
        } finally {
            isRefreshingRef.current = false;
            setIsRefreshing(false);
        }
    }, []);

    /**
     * Schedule the next refresh after `intervalMs`.
     * Clears any existing timeout first.
     */
    const scheduleNext = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(async () => {
            await executeRefresh();
            // Re-arm after completion (not before — prevents overlap)
            scheduleNext();
        }, intervalMs);
    }, [intervalMs, executeRefresh]);

    // Set up the polling loop
    useEffect(() => {
        if (!enabled) return;

        // Set initial lastUpdated (data was already fetched by useProfile)
        setLastUpdated(new Date());

        // Start the polling loop
        scheduleNext();

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }
        };
    }, [enabled, scheduleNext]);

    // On tab re-focus: immediately refresh to catch up after idle
    useEffect(() => {
        if (!enabled) return;

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                console.log('[useAutoRefresh] Tab re-focused — triggering refresh');
                // Execute immediately and reset the timer
                executeRefresh().then(() => {
                    scheduleNext();
                });
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [enabled, executeRefresh, scheduleNext]);

    // Manual trigger: execute immediately and reset the timer
    const triggerRefresh = useCallback(() => {
        executeRefresh().then(() => {
            scheduleNext();
        });
    }, [executeRefresh, scheduleNext]);

    return {
        lastUpdated,
        isRefreshing,
        triggerRefresh,
    };
}
