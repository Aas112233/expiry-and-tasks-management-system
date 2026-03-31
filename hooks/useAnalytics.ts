import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '../services/analyticsService';

// Query keys for analytics
export const analyticsKeys = {
    all: ['analytics'] as const,
    overview: () => [...analyticsKeys.all, 'overview'] as const,
    trends: () => [...analyticsKeys.all, 'trends'] as const,
    branchDistribution: () => [...analyticsKeys.all, 'branchDistribution'] as const,
};

// Hook for dashboard overview stats with polling
export const useDashboardStats = (options?: {
    pollingInterval?: number;
    enabled?: boolean;
}) => {
    const { pollingInterval = 60000, enabled = true } = options || {};
    
    return useQuery({
        queryKey: analyticsKeys.overview(),
        queryFn: () => analyticsService.getOverview(),
        staleTime: 1000 * 60 * 5, // 5 minutes
        refetchInterval: pollingInterval,
        refetchIntervalInBackground: false,
        refetchOnWindowFocus: true,
        enabled,
    });
};

// Hook for expiry trends
export const useExpiryTrends = (options?: {
    pollingInterval?: number;
    enabled?: boolean;
}) => {
    const { pollingInterval = 300000, enabled = true } = options || {}; // 5 minutes default
    
    return useQuery({
        queryKey: analyticsKeys.trends(),
        queryFn: () => analyticsService.getTrends(),
        staleTime: 1000 * 60 * 10, // 10 minutes
        refetchInterval: pollingInterval,
        refetchIntervalInBackground: false,
        enabled,
    });
};

// Hook for branch distribution
export const useBranchDistribution = (options?: {
    pollingInterval?: number;
    enabled?: boolean;
}) => {
    const { pollingInterval = 300000, enabled = true } = options || {}; // 5 minutes default
    
    return useQuery({
        queryKey: analyticsKeys.branchDistribution(),
        queryFn: () => analyticsService.getBranchDistribution(),
        staleTime: 1000 * 60 * 10, // 10 minutes
        refetchInterval: pollingInterval,
        refetchIntervalInBackground: false,
        enabled,
    });
};
