import { apiFetch } from './apiConfig';

export interface CatalogItem {
    id: string;
    barcode: string;
    productName: string;
    unit: string;
    createdAt: string;
    updatedAt: string;
}

class CatalogService {
    async getAll(): Promise<CatalogItem[]> {
        return await apiFetch('/catalog');
    }

    async getByBarcode(barcode: string): Promise<CatalogItem | null> {
        try {
            return await apiFetch(`/catalog/${barcode}`);
        } catch (error) {
            return null;
        }
    }

    async deleteItem(id: string): Promise<void> {
        await apiFetch(`/catalog/${id}`, {
            method: 'DELETE'
        });
    }

    async createItem(item: Omit<CatalogItem, 'id' | 'updatedAt' | 'createdAt'>): Promise<CatalogItem> {
        return await apiFetch('/catalog', {
            method: 'POST',
            body: JSON.stringify(item)
        });
    }

    async updateItem(id: string, item: Partial<CatalogItem>): Promise<CatalogItem> {
        return await apiFetch(`/catalog/${id}`, {
            method: 'PUT',
            body: JSON.stringify(item)
        });
    }

    async syncWithInventory(): Promise<{ syncedCount: number, message: string }> {
        return await apiFetch('/catalog/sync-inventory', {
            method: 'POST'
        });
    }
}

export const catalogService = new CatalogService();
