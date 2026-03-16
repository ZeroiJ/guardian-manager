import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, Undo2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotificationStore, type Notify, type NotificationType } from '@/store/notificationStore';

// ─── Accent colors by notification type ──────────────────────────────
const TYPE_STYLES: Record<NotificationType, { border: string; bg: string; icon: React.ReactNode }> = {
    success: {
        border: 'border-l-emerald-500',
        bg: 'bg-emerald-500/5',
        icon: <CheckCircle size={16} className="text-emerald-400 flex-shrink-0" />,
    },
    error: {
        border: 'border-l-red-500',
        bg: 'bg-red-500/5',
        icon: <AlertTriangle size={16} className="text-red-400 flex-shrink-0" />,
    },
    warning: {
        border: 'border-l-amber-500',
        bg: 'bg-amber-500/5',
        icon: <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />,
    },
    info: {
        border: 'border-l-cyan-500',
        bg: 'bg-cyan-500/5',
        icon: <Info size={16} className="text-cyan-400 flex-shrink-0" />,
    },
    progress: {
        border: 'border-l-cyan-500',
        bg: 'bg-cyan-500/5',
        icon: <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />,
    },
};

// ─── Single Toast ─────────────────────────────────────────────────────
const Toast: React.FC<{ notification: Notify }> = ({ notification }) => {
    const dismiss = useNotificationStore((s) => s.dismissNotification);
    const [paused, setPaused] = useState(false);

    const style = TYPE_STYLES[notification.type] || TYPE_STYLES.info;

    const handleDismiss = useCallback(() => {
        dismiss(notification.id);
    }, [dismiss, notification.id]);

    const handleUndo = useCallback(() => {
        notification.onUndo?.();
        handleDismiss();
    }, [notification, handleDismiss]);

    // Pause/resume auto-dismiss on hover
    const [remainingMs, setRemainingMs] = useState(notification.duration);
    const [startTime, setStartTime] = useState(Date.now());

    useEffect(() => {
        if (paused || notification.duration <= 0) return;
        setStartTime(Date.now());
        const timer = setTimeout(handleDismiss, remainingMs);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paused, handleDismiss]);

    const handleMouseEnter = () => {
        setPaused(true);
        setRemainingMs((prev) => Math.max(prev - (Date.now() - startTime), 500));
    };
    const handleMouseLeave = () => {
        setPaused(false);
    };

    return (
        <div
            className={`
                relative flex items-start gap-3 px-4 py-3 rounded-sm border border-white/10 border-l-4
                ${style.border} ${style.bg}
                backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)]
                w-[360px] max-w-[calc(100vw-2rem)]
            `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Type icon */}
            <div className="pt-0.5">{style.icon}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white font-rajdhani tracking-wide leading-tight">
                    {notification.title}
                </div>
                {notification.body && (
                    <div className="text-xs text-gray-400 mt-0.5 leading-snug break-words">
                        {notification.body}
                    </div>
                )}

                {/* Undo button */}
                {notification.onUndo && (
                    <button
                        onClick={handleUndo}
                        className="mt-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-cyan-400 hover:text-cyan-300 transition-colors font-rajdhani"
                    >
                        <Undo2 size={10} />
                        Undo
                    </button>
                )}
            </div>

            {/* Close button */}
            <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-gray-600 hover:text-white transition-colors"
            >
                <X size={14} />
            </button>

            {/* Auto-dismiss progress bar */}
            {notification.duration > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden rounded-b-sm">
                    <div
                        className="h-full bg-white/20"
                        style={{
                            animation: paused
                                ? 'none'
                                : `toast-timer ${remainingMs}ms linear forwards`,
                            animationPlayState: paused ? 'paused' : 'running',
                        }}
                    />
                </div>
            )}
        </div>
    );
};

// ─── Container (rendered at App root) ─────────────────────────────────
export const NotificationContainer: React.FC = () => {
    const notifications = useNotificationStore((s) => s.notifications);

    return (
        <div className="fixed bottom-4 right-4 z-[9998] flex flex-col-reverse gap-2 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {notifications.map((n) => (
                    <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, x: 80, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 80, scale: 0.95 }}
                        transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                        className="pointer-events-auto"
                    >
                        <Toast notification={n} />
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};
