import { Request, Response } from 'express';
import prisma, { withTransactionRetry } from '../prisma';
import { sendErrorResponse } from '../lib/errors';

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
        sendErrorResponse(res, error, 'Unable to fetch catalog item.', 'Catalog Fetch By Barcode');
    }
};

export const getAllCatalogItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const { page = '1', limit = '50', search = '' } = req.query;
        const pageNum = parseInt(page as string, 10) || 1;
        const limitNum = parseInt(limit as string, 10) || 50;
        const skip = (pageNum - 1) * limitNum;

        const whereClause: any = {};
        if (search) {
            const searchStr = search as string;
            whereClause.OR = [
                { barcode: { contains: searchStr, mode: 'insensitive' } },
                { itemCode: { contains: searchStr, mode: 'insensitive' } },
                { productName: { contains: searchStr, mode: 'insensitive' } },
                { productName2: { contains: searchStr, mode: 'insensitive' } },
                { productName3: { contains: searchStr, mode: 'insensitive' } },
            ];
        }

        const [items, totalCount, totalProducts, dualNamedProducts, uniqueBarcodesGroup] = await withTransactionRetry(() =>
            Promise.all([
                (prisma as any).productCatalog.findMany({
                    where: whereClause,
                    orderBy: { updatedAt: 'desc' },
                    skip,
                    take: limitNum
                }),
                (prisma as any).productCatalog.count({
                    where: whereClause
                }),
                // Total products overall
                (prisma as any).productCatalog.count(),
                // Dual named products overall
                (prisma as any).productCatalog.count({
                    where: {
                        productName2: { not: null }
                    }
                }),
                // Group by barcode to get unique barcodes overall
                (prisma as any).productCatalog.groupBy({
                    by: ['barcode']
                })
            ])
        );

        const uniqueBarcodes = (uniqueBarcodesGroup as any[]).length;
        const totalPages = Math.ceil(totalCount / limitNum);

        res.json({
            items,
            pagination: {
                totalCount,
                page: pageNum,
                limit: limitNum,
                totalPages,
                hasPrevPage: pageNum > 1,
                hasNextPage: pageNum < totalPages
            },
            summary: {
                totalProducts,
                uniqueBarcodes,
                dualNamedProducts
            }
        });
    } catch (error: any) {
        sendErrorResponse(res, error, 'Unable to load catalog items.', 'Catalog Fetch All');
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
        sendErrorResponse(res, error, 'Unable to create catalog item.', 'Catalog Create');
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
        sendErrorResponse(res, error, 'Unable to update catalog item.', 'Catalog Update');
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
        sendErrorResponse(res, error, 'Unable to delete catalog item.', 'Catalog Delete');
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
        sendErrorResponse(res, error, 'Unable to sync catalog with inventory.', 'Catalog Sync');
    }
};
