import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

interface RealtimeConfig {
    /** Polling interval in milliseconds (default: 30000ms = 30s) */
    interval?: number;
    /** Whether to enable polling (default: true) */
    enabled?: boolean;
    /** Whether to refetch when window regains focus (default: true) */
    refetchOnFocus?: boolean;
    /** Whether to refetch when network reconnects (default: true) */
    refetchOnReconnect?: boolean;
    /** Callback when visibility changes */
    onVisibilityChange?: (isVisible: boolean) => void;
}

interface RealtimeState {
    isPolling: boolean;
    lastRefetch: Date | null;
    refetchCount: number;
}

/**
 * Hook for managing real-time data updates via polling
 * Integrates with React Query for seamless cache management
 */
export function useRealtime(
    queryKeys: string[][],
    config: RealtimeConfig = {}
) {
    const {
        interval = 30000,
        enabled = true,
        refetchOnFocus = true,
        refetchOnReconnect = true,
        onVisibilityChange,
    } = config;

    const queryClient = useQueryClient();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const [state, setState] = useState<RealtimeState>({
        isPolling: false,
        lastRefetch: null,
        refetchCount: 0,
    });

    // Refetch all provided query keys
    const refetch = useCallback(async () => {
        if (!enabled) return;

        setState(prev => ({
            ...prev,
            isPolling: true,
        }));

        try {
            await Promise.all(
                queryKeys.map(key => 
                    queryClient.invalidateQueries({ queryKey: key })
                )
            );

            setState(prev => ({
                isPolling: false,
                lastRefetch: new Date(),
                refetchCount: prev.refetchCount + 1,
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                isPolling: false,
            }));
            console.error('Realtime refetch failed:', error);
        }
    }, [queryClient, queryKeys, enabled]);

    // Start/stop polling based on enabled state
    useEffect(() => {
        if (!enabled) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Initial refetch
        refetch();

        // Set up interval
        intervalRef.current = setInterval(refetch, interval);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [enabled, interval, refetch]);

    // Handle visibility changes
    useEffect(() => {
        if (!refetchOnFocus) return;

        const handleVisibilityChange = () => {
            const isVisible = document.visibilityState === 'visible';
            onVisibilityChange?.(isVisible);

            if (isVisible && enabled) {
                // Refetch when tab becomes visible
                refetch();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [refetchOnFocus, enabled, refetch, onVisibilityChange]);

    // Handle online/offline
    useEffect(() => {
        if (!refetchOnReconnect) return;

        const handleOnline = () => {
            if (enabled) {
                refetch();
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [refetchOnReconnect, enabled, refetch]);

    return {
        ...state,
        refetch,
    };
}

/**
 * Hook for WebSocket-like real-time updates (simulated via polling)
 * Useful for critical data that needs frequent updates
 */
export function useFastPolling(
    queryKeys: string[][],
    interval: number = 5000,
    enabled: boolean = true
) {
    return useRealtime(queryKeys, {
        interval,
        enabled,
        refetchOnFocus: true,
        refetchOnReconnect: true,
    });
}

/**
 * Hook for slow polling - good for non-critical background data
 */
export function useSlowPolling(
    queryKeys: string[][],
    interval: number = 60000,
    enabled: boolean = true
) {
    return useRealtime(queryKeys, {
        interval,
        enabled,
        refetchOnFocus: false,
        refetchOnReconnect: true,
    });
}

/**
 * Hook to manually trigger refresh with visual feedback
 */
export function useRefreshButton(queryKeys: string[][]) {
    const { refetch, isPolling, lastRefetch } = useRealtime(queryKeys, {
        enabled: false, // Don't auto-poll
    });

    const handleRefresh = useCallback(async () => {
        await refetch();
    }, [refetch]);

    return {
        refresh: handleRefresh,
        isRefreshing: isPolling,
        lastRefreshed: lastRefetch,
    };
}

export default useRealtime;
