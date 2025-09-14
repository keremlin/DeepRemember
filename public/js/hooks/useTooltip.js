/**
 * useTooltip.js - Custom hook for tooltip management
 * Handles tooltip state, auto-hide timers, and cleanup
 */

const { useState, useEffect, useRef, useCallback } = React;

const useTooltip = (autoHideDelay = 5000) => {
    const [showTooltip, setShowTooltip] = useState(null);
    const [tooltipContent, setTooltipContent] = useState('');
    const timeoutRef = useRef(null);

    const showTooltipFor = useCallback((id, content) => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        setShowTooltip(id);
        setTooltipContent(content);
        
        // Set auto-hide timeout
        timeoutRef.current = setTimeout(() => {
            setShowTooltip(null);
            setTooltipContent('');
        }, autoHideDelay);
    }, [autoHideDelay]);

    const hideTooltip = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setShowTooltip(null);
        setTooltipContent('');
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return {
        showTooltip,
        tooltipContent,
        showTooltipFor,
        hideTooltip
    };
};

// Export for global access
window.useTooltip = useTooltip;
