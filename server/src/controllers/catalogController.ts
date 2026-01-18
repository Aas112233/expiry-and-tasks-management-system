import { Request, Response } from 'express';
import prisma from '../prisma';

export const getCatalogItemByBarcode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { barcode } = (req as any).params;

        if (!barcode) {
            res.status(400).json({ message: 'Barcode is required' });
            return;
        }

        // Return the latest matching entry by default for auto-fill
        const item = await (prisma as any).productCatalog.findFirst({
            where: { barcode },
            orderBy: { updatedAt: 'desc' }
        });

        if (!item) {
            res.status(404).json({ message: 'Product not found in catalog' });
            return;
        }

        res.json(item);
    } catch (error: any) {
        console.error('[Catalog] Fetch error:', error);
        res.status(500).json({ message: 'Error fetching product information', error: error.message });
    }
};

export const getAllCatalogItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await (prisma as any).productCatalog.findMany({
            orderBy: { updatedAt: 'desc' }
        });
        res.json(items);
    } catch (error: any) {
        console.error('[Catalog] Fetch all error:', error);
        res.status(500).json({ message: 'Error fetching catalog items', error: error.message });
    }
};

export const deleteCatalogItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req as any).params;
        await (prisma as any).productCatalog.delete({
            where: { id }
        });
        res.json({ message: 'Catalog item deleted successfully' });
    } catch (error: any) {
        console.error('[Catalog] Delete error:', error);
        res.status(500).json({ message: 'Error deleting catalog item', error: error.message });
    }
};

export const updateCatalogItem = async (barcode: string, productName: string, unit: string) => {
    try {
        // Check if this specific combination already exists
        const existing = await (prisma as any).productCatalog.findFirst({
            where: { barcode, productName, unit }
        });

        if (existing) {
            await (prisma as any).productCatalog.update({
                where: { id: existing.id },
                data: { updatedAt: new Date() }
            });
        } else {
            await (prisma as any).productCatalog.create({
                data: { barcode, productName, unit }
            });
        }
    } catch (error) {
        console.error('[Catalog] Auto-update error:', error);
    }
};
