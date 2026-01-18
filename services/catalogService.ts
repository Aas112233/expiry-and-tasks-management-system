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

    async syncWithInventory(): Promise<{ syncedCount: number, message: string }> {
        return await apiFetch('/catalog/sync-inventory', {
            method: 'POST'
        });
    }
}

export const catalogService = new CatalogService();
