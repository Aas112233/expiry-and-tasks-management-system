import { apiFetch } from './apiConfig';

// Service for analytics API
export interface DashboardStats {
    overview: {
        title: string;
        value: string;
        trend: string;
        color: string;
    }[];
}

export interface ExpiryTrend {
    name: string;
    expired: number;
    nearExpiry: number;
}

export interface BranchDistribution {
    name: string;
    value: number;
}

class AnalyticsService {
    async getOverview(): Promise<DashboardStats> {
        return await apiFetch('/analytics/overview');
    }

    async getTrends(): Promise<ExpiryTrend[]> {
        return await apiFetch('/analytics/trends');
    }

    async getBranchDistribution(): Promise<BranchDistribution[]> {
        return await apiFetch('/analytics/branch-distribution');
    }
}

export const analyticsService = new AnalyticsService();
