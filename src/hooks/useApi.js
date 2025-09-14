/**
 * useApi.js - Custom hook for API calls
 * Provides loading, error, and data state management for API requests
 */

import { useState, useCallback } from 'react';

export const useApi = (initialData = null) => {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const execute = useCallback(async (url, options = {}) => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            setData(result);
            return result;
        } catch (err) {
            setError(err);
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    const reset = useCallback(() => {
        setData(initialData);
        setError(null);
        setLoading(false);
    }, [initialData]);

    return { data, loading, error, execute, reset };
};

export default useApi;
