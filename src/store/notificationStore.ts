import { create } from 'zustand';

/**
 * Notification types for styling.
 * - success: green accent
 * - error: red accent
 * - warning: amber accent
 * - info: cyan accent
 * - progress: cyan accent with spinner
 */
export type NotificationType = 'success' | 'info' | 'warning' | 'error' | 'progress';

/** Input shape for showNotification(). */
export interface NotifyInput {
    title: string;
    body?: string;
    type?: NotificationType;
    /** Duration in ms before auto-dismiss. Set 0 for persistent. */
    duration?: number;
    /** If provided, an "Undo" button will be shown. */
    onUndo?: () => void;
}

/** Internal notification with generated id. */
export interface Notify extends Required<Pick<NotifyInput, 'title' | 'type'>> {
    id: number;
    body?: string;
    duration: number;
    onUndo?: () => void;
}

interface NotificationState {
    notifications: Notify[];
    /** Show a toast notification. Returns the notification id. */
    showNotification: (input: NotifyInput) => number;
    /** Dismiss a notification by id. */
    dismissNotification: (id: number) => void;
}

let nextId = 0;

/**
 * Global notification store — call showNotification() from anywhere
 * to display a toast in the bottom-right corner.
 */
export const useNotificationStore = create<NotificationState>((set) => ({
    notifications: [],

    showNotification: (input) => {
        const id = nextId++;
        const notification: Notify = {
            id,
            title: input.title,
            body: input.body,
            type: input.type ?? 'info',
            duration: input.duration ?? 5000,
            onUndo: input.onUndo,
        };

        set((state) => ({
            notifications: [...state.notifications, notification],
        }));

        // Auto-dismiss after duration (unless 0 = persistent)
        if (notification.duration > 0) {
            setTimeout(() => {
                set((state) => ({
                    notifications: state.notifications.filter((n) => n.id !== id),
                }));
            }, notification.duration);
        }

        return id;
    },

    dismissNotification: (id) => {
        set((state) => ({
            notifications: state.notifications.filter((n) => n.id !== id),
        }));
    },
}));

/**
 * Convenience function that can be called from non-React code
 * (e.g. inside equipManager.ts, transfer services).
 */
export function showNotification(input: NotifyInput): number {
    return useNotificationStore.getState().showNotification(input);
}
