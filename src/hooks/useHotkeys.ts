import { useEffect, useCallback, useRef } from 'react';

export interface HotkeyBinding {
    /** Key identifier (e.g., 'l', 'Escape', '/', 'r') */
    key: string;
    /** Ctrl/Cmd modifier required */
    ctrl?: boolean;
    /** Shift modifier required */
    shift?: boolean;
    /** Alt modifier required */
    alt?: boolean;
    /** Handler function */
    handler: (e: KeyboardEvent) => void;
    /** Description for help display */
    description?: string;
    /** If true, fires even when an input/textarea is focused */
    global?: boolean;
}

/**
 * Global keyboard shortcut hook.
 * Registers keybindings on the document and cleans up on unmount.
 * By default, shortcuts are suppressed when an input/textarea/select is focused
 * unless `global: true` is set on the binding.
 */
export function useHotkeys(bindings: HotkeyBinding[]) {
    // Use a ref so the effect doesn't re-register on every render
    const bindingsRef = useRef(bindings);
    bindingsRef.current = bindings;

    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        const isInputFocused =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable;

        for (const binding of bindingsRef.current) {
            // Skip non-global bindings when input is focused
            if (isInputFocused && !binding.global) continue;

            // Match key (case-insensitive for letters)
            const keyMatch =
                e.key === binding.key ||
                e.key.toLowerCase() === binding.key.toLowerCase();

            if (!keyMatch) continue;

            // Match modifiers
            const ctrlMatch = binding.ctrl ? (e.ctrlKey || e.metaKey) : !(e.ctrlKey || e.metaKey);
            const shiftMatch = binding.shift ? e.shiftKey : !e.shiftKey;
            const altMatch = binding.alt ? e.altKey : !e.altKey;

            if (ctrlMatch && shiftMatch && altMatch) {
                e.preventDefault();
                e.stopPropagation();
                binding.handler(e);
                return;
            }
        }
    }, []);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown, true);
        return () => document.removeEventListener('keydown', handleKeyDown, true);
    }, [handleKeyDown]);
}

/** Standard hotkey definitions for reference/help display */
export const HOTKEY_MAP = {
    SEARCH_FOCUS: { key: '/', description: 'Focus search bar' },
    SEARCH_FOCUS_ALT: { key: 'k', ctrl: true, description: 'Focus search bar' },
    ESCAPE: { key: 'Escape', description: 'Close popup / clear search', global: true },
    REFRESH: { key: 'r', description: 'Refresh profile' },
    LOCK: { key: 'l', description: 'Lock / unlock item' },
    NAV_INVENTORY: { key: '1', description: 'Go to Inventory' },
    NAV_LOADOUTS: { key: '2', description: 'Go to Loadouts' },
    NAV_PROGRESS: { key: '3', description: 'Go to Progress' },
    NAV_VENDORS: { key: '4', description: 'Go to Vendors' },
} as const;
