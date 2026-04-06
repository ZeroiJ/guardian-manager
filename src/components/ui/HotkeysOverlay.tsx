import { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, HelpCircle } from 'lucide-react';
import { HOTKEY_MAP } from '@/hooks/useHotkeys';

interface HotkeysOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

interface HotkeyEntry {
    keys: string;
    description: string;
}

const HOTKEYS: HotkeyEntry[] = [
    { keys: '/  or  Ctrl+K', description: HOTKEY_MAP.SEARCH_FOCUS.description },
    { keys: 'Esc', description: HOTKEY_MAP.ESCAPE.description },
    { keys: 'R', description: HOTKEY_MAP.REFRESH.description },
    { keys: 'L', description: HOTKEY_MAP.LOCK.description },
    { keys: '1', description: HOTKEY_MAP.NAV_INVENTORY.description },
    { keys: '2', description: HOTKEY_MAP.NAV_LOADOUTS.description },
    { keys: '3', description: HOTKEY_MAP.NAV_PROGRESS.description },
    { keys: '4', description: HOTKEY_MAP.NAV_VENDORS.description },
];

export function HotkeysOverlay({ isOpen, onClose }: HotkeysOverlayProps) {
    const handleEscape = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (!isOpen) return;
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, handleEscape]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                >
                    <motion.div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        className="relative z-10 w-full max-w-md mx-4 rounded-lg border border-void-border bg-void-elevated shadow-2xl overflow-hidden"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-5 py-4 border-b border-void-border">
                            <h2 className="text-lg font-bold text-void-text font-rajdhani tracking-[0.1em] uppercase">
                                Keyboard Shortcuts
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded text-void-text-secondary hover:text-void-text hover:bg-white/5 transition-colors"
                                aria-label="Close shortcuts"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="px-5 py-4">
                            <table className="w-full text-sm">
                                <tbody>
                                    {HOTKEYS.map((hk, i) => (
                                        <tr
                                            key={i}
                                            className="border-b border-void-border last:border-0"
                                        >
                                            <td className="py-2.5 pr-4">
                                                <kbd className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-mono font-medium text-void-text bg-void-surface border border-void-border rounded-sm shadow-sm">
                                                    {hk.keys}
                                                </kbd>
                                            </td>
                                            <td className="py-2.5 text-void-text-secondary">
                                                {hk.description}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="px-5 py-3 border-t border-void-border bg-void-surface/50">
                            <p className="text-xs text-void-text-muted text-center">
                                Press <kbd className="px-1.5 py-0.5 font-mono bg-void-elevated border border-void-border rounded text-void-text-secondary">Esc</kbd> to close
                            </p>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}

export function HotkeysButton({ onClick }: { onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className="p-1.5 rounded text-void-text-secondary hover:text-void-text hover:bg-white/5 transition-colors"
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts (?)"
        >
            <HelpCircle size={16} />
        </button>
    );
}
