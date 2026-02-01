import { RefreshCw } from 'lucide-react';

/** Props for the RefreshButton component */
interface RefreshButtonProps {
    /** Timestamp of the last successful refresh */
    lastUpdated: Date | null;
    /** Whether a refresh is currently in progress */
    isRefreshing: boolean;
    /** Callback to trigger a manual refresh */
    onRefresh: () => void;
}

/**
 * Calculates a human-readable relative time string.
 * 
 * @param date - The date to format relative to now
 * @returns A string like "Just now", "30s ago", "2m ago"
 */
function getRelativeTime(date: Date | null): string {
    if (!date) return 'Never';

    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

/**
 * Refresh button with spinning animation and "last updated" tooltip.
 * Used in the top navigation bar to show refresh status and trigger manual refreshes.
 */
export function RefreshButton({ lastUpdated, isRefreshing, onRefresh }: RefreshButtonProps) {
    const relativeTime = getRelativeTime(lastUpdated);

    return (
        <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title={`Last updated: ${relativeTime}`}
            className="p-1.5 rounded hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={isRefreshing ? 'Refreshing...' : `Refresh. Last updated: ${relativeTime}`}
        >
            <RefreshCw
                className={`size-4 text-gray-400 hover:text-white transition-colors ${isRefreshing ? 'animate-spin text-[#f5dc56]' : ''
                    }`}
            />
        </button>
    );
}
