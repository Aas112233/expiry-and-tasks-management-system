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

export const syncCatalogWithInventory = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. Fetch all unique barcode/productName/unit combinations from inventory
        const inventoryItems = await (prisma as any).expiredItem.findMany({
            where: {
                AND: [
                    { barcode: { not: null } },
                    { barcode: { not: "" } }
                ]
            },
            select: {
                barcode: true,
                productName: true,
                unit: true
            }
        });

        // 2. Fetch all existing catalog items
        const catalogItems = await (prisma as any).productCatalog.findMany({
            select: {
                barcode: true,
                productName: true,
                unit: true
            }
        });

        // 3. Find unique combinations in inventory not in catalog
        const catalogSet = new Set(catalogItems.map((c: any) => `${c.barcode}|${c.productName}|${c.unit}`));

        const newMappings = new Map<string, { barcode: string, productName: string, unit: string }>();

        for (const item of inventoryItems) {
            const key = `${item.barcode}|${item.productName}|${item.unit}`;
            if (!catalogSet.has(key)) {
                newMappings.set(key, {
                    barcode: item.barcode,
                    productName: item.productName,
                    unit: item.unit
                });
            }
        }

        const itemsToCreate = Array.from(newMappings.values());

        // 4. Create missing catalog entries
        if (itemsToCreate.length > 0) {
            await (prisma as any).productCatalog.createMany({
                data: itemsToCreate
            });
        }

        res.json({
            message: 'Synchronization complete',
            syncedCount: itemsToCreate.length,
            totalInventoryItemsProcessed: inventoryItems.length
        });
    } catch (error: any) {
        console.error('[Catalog] Sync error:', error);
        res.status(500).json({ message: 'Error syncing with inventory', error: error.message });
    }
};
