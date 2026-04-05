import { ExpiredItem, ExpiryStatus } from '../types';
import { apiFetch, buildQueryString } from './apiConfig';

export interface InventoryQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    branch?: string;
    unit?: string;
    barcodeState?: 'all' | 'with-barcode' | 'without-barcode';
    notesState?: 'all' | 'with-notes' | 'without-notes';
}

export interface PaginatedInventoryResponse {
    items: ExpiredItem[];
    pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPrevPage: boolean;
    };
    summary?: {
        all: number;
        expired: number;
        critical: number;
        warning: number;
        good: number;
        safe: number;
    };
}

class InventoryService {
    private mapToFrontend(item: any): ExpiredItem {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const exp = new Date(item.expDate);
        const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let liveStatus = ExpiryStatus.Safe;
        if (diffDays <= 0) liveStatus = ExpiryStatus.Expired;
        else if (diffDays <= 15) liveStatus = ExpiryStatus.Critical;
        else if (diffDays <= 45) liveStatus = ExpiryStatus.Warning;
        else if (diffDays <= 60) liveStatus = ExpiryStatus.Good;

        return {
            ...item,
            quantity: item.quantity,
            unit: item.unit,
            remainingQty: item.quantity,
            unitName: item.unit,
            serverStatus: item.status,
            status: liveStatus
        };
    }

    async getAllItems(params: InventoryQueryParams = {}): Promise<PaginatedInventoryResponse> {
        const queryString = buildQueryString(params);
        const response = await apiFetch<PaginatedInventoryResponse>(`/inventory${queryString}`);

        // Map items to frontend format
        return {
            ...response,
            items: response.items.map((item: any) => this.mapToFrontend(item))
        };
    }

    async createItem(itemData: Omit<ExpiredItem, 'id' | 'status'>): Promise<ExpiredItem> {
        // Calculate initial status
        const today = new Date();
        const exp = new Date(itemData.expDate);
        const diffTime = exp.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = ExpiryStatus.Safe;
        if (diffDays < 0) status = ExpiryStatus.Expired;
        else if (diffDays <= 15) status = ExpiryStatus.Critical;
        else if (diffDays <= 45) status = ExpiryStatus.Warning;
        else if (diffDays <= 60) status = ExpiryStatus.Good;

        const response = await apiFetch('/inventory', {
            method: 'POST',
            body: JSON.stringify({ ...itemData, status })
        });
        return this.mapToFrontend(response);
    }

    async updateItem(id: string, updates: Partial<ExpiredItem>): Promise<ExpiredItem> {
        let newStatus = updates.status;

        // Recalculate status if expDate changes and status wasn't explicitly provided
        if (updates.expDate && !newStatus) {
            const today = new Date();
            const exp = new Date(updates.expDate);
            const diffTime = exp.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) newStatus = ExpiryStatus.Expired;
            else if (diffDays <= 15) newStatus = ExpiryStatus.Critical;
            else if (diffDays <= 45) newStatus = ExpiryStatus.Warning;
            else if (diffDays <= 60) newStatus = ExpiryStatus.Good;
            else newStatus = ExpiryStatus.Safe;
        }

        const payload = { ...updates };
        if (newStatus) payload.status = newStatus;

        const response = await apiFetch(`/inventory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });
        return this.mapToFrontend(response);
    }

    async deleteItem(id: string): Promise<boolean> {
        await apiFetch(`/inventory/${id}`, {
            method: 'DELETE'
        });
        return true;
    }
}

export const inventoryService = new InventoryService();
