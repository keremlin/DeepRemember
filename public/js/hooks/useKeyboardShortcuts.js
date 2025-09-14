/**
 * useKeyboardShortcuts.js - Custom hook for keyboard event handling
 * Manages keyboard shortcuts with proper cleanup
 */

import { useEffect, useCallback } from 'react';

export const useKeyboardShortcuts = (shortcuts, dependencies = []) => {
    const handleKeyDown = useCallback((event) => {
        const key = event.key.toLowerCase();
        const ctrlKey = event.ctrlKey || event.metaKey;
        const shiftKey = event.shiftKey;
        const altKey = event.altKey;

        // Create key combination string
        const keyCombo = [
            ctrlKey ? 'ctrl' : '',
            altKey ? 'alt' : '',
            shiftKey ? 'shift' : '',
            key
        ].filter(Boolean).join('+');

        // Find matching shortcut
        const shortcut = shortcuts.find(s => s.key === keyCombo || s.key === key);
        
        if (shortcut) {
            event.preventDefault();
            shortcut.handler(event);
        }
    }, dependencies);

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

export default useKeyboardShortcuts;
