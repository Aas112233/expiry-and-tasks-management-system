import { Request, Response } from 'express';
import prisma, { withTransactionRetry } from '../prisma';

export const getCatalogItemByBarcode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { barcode } = (req as any).params;

        if (!barcode) {
            res.status(400).json({ message: 'Barcode is required' });
            return;
        }

        const item = await withTransactionRetry(() =>
            (prisma as any).productCatalog.findFirst({
                where: { barcode },
                orderBy: { updatedAt: 'desc' }
            })
        );

        if (!item) {
            res.status(404).json({ message: 'Product not found in catalog' });
            return;
        }

        res.json(item);
    } catch (error: any) {
        console.error('[Catalog] Fetch error:', error);
        res.status(500).json({ message: `Failed to fetch catalog: ${error.message}` });
    }
};

export const getAllCatalogItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await withTransactionRetry(() =>
            (prisma as any).productCatalog.findMany({
                orderBy: { updatedAt: 'desc' }
            })
        );
        res.json(items);
    } catch (error: any) {
        console.error('[Catalog] Fetch all error:', error);
        res.status(500).json({ message: `Failed to load catalog items: ${error.message}` });
    }
};

export const createCatalogItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { barcode, productName, unit } = req.body;

        if (!barcode || !productName) {
            res.status(400).json({ message: 'Barcode and Product Name are required' });
            return;
        }

        const newItem = await withTransactionRetry(() =>
            (prisma as any).productCatalog.create({
                data: { barcode, productName, unit: unit || 'pcs' }
            })
        );
        res.status(201).json(newItem);
    } catch (error: any) {
        console.error('[Catalog] Create error:', error);
        res.status(500).json({ message: `Failed to create catalog item: ${error.message}` });
    }
};

export const manualUpdateCatalogItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req as any).params;
        const { barcode, productName, unit } = req.body;

        const updated = await withTransactionRetry(() =>
            (prisma as any).productCatalog.update({
                where: { id },
                data: { barcode, productName, unit, updatedAt: new Date() }
            })
        );
        res.json(updated);
    } catch (error: any) {
        console.error('[Catalog] Manual update error:', error);
        res.status(500).json({ message: `Failed to update catalog item: ${error.message}` });
    }
};

export const deleteCatalogItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req as any).params;
        await withTransactionRetry(() =>
            (prisma as any).productCatalog.delete({
                where: { id }
            })
        );
        res.json({ message: 'Catalog item deleted successfully' });
    } catch (error: any) {
        console.error('[Catalog] Delete error:', error);
        res.status(500).json({ message: `Failed to delete item: ${error.message}` });
    }
};

export const updateCatalogItem = async (barcode: string, productName: string, unit: string) => {
    try {
        await withTransactionRetry(async () => {
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
        });
    } catch (error) {
        console.error('[Catalog] Auto-update error:', error);
    }
};

export const syncCatalogWithInventory = async (req: Request, res: Response): Promise<void> => {
    try {
        const result = await withTransactionRetry(async () => {
            // 1. Fetch inventory items with barcodes
            const inventoryItems = await (prisma as any).inventoryItem.findMany({
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

            // 2. Fetch current catalog
            const catalogItems = await (prisma as any).productCatalog.findMany({
                select: {
                    barcode: true,
                    productName: true,
                    unit: true
                }
            });

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

            if (itemsToCreate.length > 0) {
                // MongoDB createMany support check / fallback
                try {
                    await (prisma as any).productCatalog.createMany({
                        data: itemsToCreate
                    });
                } catch (e) {
                    console.warn('[Catalog] createMany failed, falling back to individual creates:', e);
                    // Fallback to individual creates if createMany fails
                    for (const item of itemsToCreate) {
                        try {
                            await (prisma as any).productCatalog.create({ data: item });
                        } catch (err) {
                            // Skip individual failures (likely duplicates from race condition)
                        }
                    }
                }
            }

            return {
                syncedCount: itemsToCreate.length,
                totalProcessed: inventoryItems.length
            };
        });

        res.json({
            message: 'Synchronization complete',
            syncedCount: result.syncedCount,
            totalInventoryItemsProcessed: result.totalProcessed
        });
    } catch (error: any) {
        console.error('[Catalog] Sync error:', error);
        res.status(500).json({ message: `Sync failed: ${error.message}` });
    }
};
