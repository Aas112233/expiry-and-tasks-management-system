import { ExpiredItem, ExpiryStatus } from '../types';
import { apiFetch } from './apiConfig';

class InventoryService {
    private mapToFrontend(item: any): ExpiredItem {
        return {
            ...item,
            remainingQty: item.quantity,
            unitName: item.unit
        };
    }

    async getAllItems(): Promise<ExpiredItem[]> {
        const items = await apiFetch('/inventory');
        return items.map((item: any) => this.mapToFrontend(item));
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
