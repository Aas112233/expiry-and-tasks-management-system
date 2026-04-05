import { Request, Response } from 'express';
import prisma, { withTransactionRetry } from '../prisma';
import { updateCatalogItem } from './catalogController';
import { sendErrorResponse } from '../lib/errors';

/**
 * HELPER: Status Calculator
 * Centralizes the logic for determining expiry status based on dates.
 */
function calculateExpiryStatus(expDateStr: string | Date): string {
    const expDate = new Date(expDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return 'Expired';
    if (diffDays <= 15) return '0-15 days';
    if (diffDays <= 45) return '16-45 days';
    if (diffDays <= 60) return '46-60 days';
    return '60+';
}

/**
 * HELPER: Build date-range filter for a given status category.
 * This ensures filters are always up-to-date based on today's date,
 * rather than relying on a stored (potentially stale) status string.
 */
function buildStatusDateFilter(status: string): any {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const addDays = (d: Date, days: number) => {
        const result = new Date(d);
        result.setDate(result.getDate() + days);
        return result;
    };

    switch (status) {
        case 'Expired':
            return { expDate: { lte: today } };
        case '0-15 days':
            return { AND: [{ expDate: { gt: today } }, { expDate: { lte: addDays(today, 15) } }] };
        case '16-45 days':
            return { AND: [{ expDate: { gt: addDays(today, 15) } }, { expDate: { lte: addDays(today, 45) } }] };
        case '46-60 days':
            return { AND: [{ expDate: { gt: addDays(today, 45) } }, { expDate: { lte: addDays(today, 60) } }] };
        case '60+':
            return { expDate: { gt: addDays(today, 60) } };
        default:
            return {};
    }
}

type InventoryFilterArgs = {
    user: any;
    search?: string;
    status?: string;
    branch?: string;
    unit?: string;
    barcodeState?: string;
    notesState?: string;
};

const EMPTY_VALUE_FILTERS = [{ equals: null }, { equals: '' }];

function buildInventoryWhere({
    user,
    search,
    status,
    branch,
    unit,
    barcodeState,
    notesState
}: InventoryFilterArgs) {
    const andFilters: any[] = [];

    if (user?.role !== 'Admin' && user?.branch !== 'all') {
        andFilters.push({ branch: user?.branch });
    } else if (branch && branch !== 'all') {
        andFilters.push({ branch });
    }

    if (search) {
        andFilters.push({
            OR: [
                { productName: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
                { notes: { contains: search, mode: 'insensitive' } }
            ]
        });
    }

    if (unit && unit !== 'all') {
        andFilters.push({ unit });
    }

    if (barcodeState === 'with-barcode') {
        andFilters.push({ barcode: { not: null } });
        andFilters.push({ barcode: { not: '' } });
    } else if (barcodeState === 'without-barcode') {
        andFilters.push({ OR: EMPTY_VALUE_FILTERS.map((filter) => ({ barcode: filter })) });
    }

    if (notesState === 'with-notes') {
        andFilters.push({ notes: { not: null } });
        andFilters.push({ notes: { not: '' } });
    } else if (notesState === 'without-notes') {
        andFilters.push({ OR: EMPTY_VALUE_FILTERS.map((filter) => ({ notes: filter })) });
    }

    // Use date-range filter instead of stored status string
    if (status && status !== 'all') {
        const dateFilter = buildStatusDateFilter(status);
        andFilters.push(dateFilter);
    }

    return andFilters.length > 0 ? { AND: andFilters } : {};
}

/**
 * PAGINATED INVENTORY CONTROLLER
 * Real database interactions with automatic status computation and pagination.
 */

export const getAllItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        // Parse pagination params
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // Parse search params
        const search = req.query.search as string;
        const status = req.query.status as string;
        const branchFilter = req.query.branch as string;
        const unitFilter = req.query.unit as string;
        const barcodeState = req.query.barcodeState as string;
        const notesState = req.query.notesState as string;

        // Shared filter args (excluding status) for summary counts
        const sharedArgs = { user, search, branch: branchFilter, unit: unitFilter, barcodeState, notesState };

        // Build the base where (without status) and full where (with status)
        const baseWhere = buildInventoryWhere(sharedArgs);
        const where = buildInventoryWhere({ ...sharedArgs, status });

        // Get total count and summary counts in parallel using date-range filters
        const [totalCount, allCount, expiredCount, criticalCount, warningCount, goodCount, safeCount] = await Promise.all([
            withTransactionRetry<number>(() =>
                (prisma as any).inventoryItem.count({ where }) as Promise<number>
            ),
            withTransactionRetry<number>(() =>
                (prisma as any).inventoryItem.count({ where: baseWhere }) as Promise<number>
            ),
            withTransactionRetry<number>(() =>
                (prisma as any).inventoryItem.count({ where: buildInventoryWhere({ ...sharedArgs, status: 'Expired' }) }) as Promise<number>
            ),
            withTransactionRetry<number>(() =>
                (prisma as any).inventoryItem.count({ where: buildInventoryWhere({ ...sharedArgs, status: '0-15 days' }) }) as Promise<number>
            ),
            withTransactionRetry<number>(() =>
                (prisma as any).inventoryItem.count({ where: buildInventoryWhere({ ...sharedArgs, status: '16-45 days' }) }) as Promise<number>
            ),
            withTransactionRetry<number>(() =>
                (prisma as any).inventoryItem.count({ where: buildInventoryWhere({ ...sharedArgs, status: '46-60 days' }) }) as Promise<number>
            ),
            withTransactionRetry<number>(() =>
                (prisma as any).inventoryItem.count({ where: buildInventoryWhere({ ...sharedArgs, status: '60+' }) }) as Promise<number>
            )
        ]);

        const items: any[] = await withTransactionRetry(() =>
            (prisma as any).inventoryItem.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            })
        );

        // Recompute live status for every returned item
        const itemsWithLiveStatus = items.map((item: any) => ({
            ...item,
            status: calculateExpiryStatus(item.expDate)
        }));

        const totalPages = Math.max(1, Math.ceil(totalCount / limit));

        res.json({
            items: itemsWithLiveStatus,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages,
                hasNextPage: page * limit < totalCount,
                hasPrevPage: page > 1
            },
            summary: {
                all: allCount,
                expired: expiredCount,
                critical: criticalCount,
                warning: warningCount,
                good: goodCount,
                safe: safeCount
            }
        });
    } catch (error) {
        sendErrorResponse(res, error, 'Unable to fetch inventory.', 'Inventory Fetch');
    }
};

export const createItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            productName, barcode, quantity, remainingQty,
            unit, unitName, mfgDate, expDate, branch, notes
        } = (req as any).body;

        const dbUnit = unit || unitName || 'pcs';
        const dbQuantity = quantity !== undefined ? Number(quantity) : (remainingQty !== undefined ? Number(remainingQty) : 0);

        if (!productName || !mfgDate || !expDate || !branch) {
            res.status(400).json({ message: 'Missing required fields (Name, Mfg Date, Exp Date, Branch)' });
            return;
        }

        const user = (req as any).user;

        // Security check: Non-admins cannot create items for other branches (unless global access 'all')
        if (user?.role !== 'Admin' && user?.branch !== 'all' && branch !== user?.branch) {
            res.status(403).json({ message: `Access denied: You can only create items for ${user?.branch}.` });
            return;
        }

        // AUTO-CALCULATE STATUS
        const computedStatus = calculateExpiryStatus(expDate);

        const item = await withTransactionRetry(() =>
            (prisma as any).inventoryItem.create({
                data: {
                    productName,
                    barcode: barcode || null,
                    quantity: dbQuantity,
                    unit: dbUnit,
                    mfgDate: new Date(mfgDate),
                    expDate: new Date(expDate),
                    branch,
                    status: computedStatus,
                    notes: notes || null
                }
            })
        );

        // SYNC TO CATALOG
        if (barcode) {
            updateCatalogItem(barcode, productName, dbUnit);
        }

        console.log(`[Inventory] Item created: ${productName} (${computedStatus})`);
        res.status(201).json(item);
    } catch (error: any) {
        sendErrorResponse(res, error, 'Unable to create inventory item.', 'Inventory Create');
    }
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = (req as any).params;
        const {
            productName, barcode, quantity, remainingQty,
            unit, unitName, mfgDate, expDate, branch, notes
        } = (req as any).body;

        const dbQuantity = quantity !== undefined ? Number(quantity) : (remainingQty !== undefined ? Number(remainingQty) : undefined);
        const dbUnit = unit || unitName;

        const updateData: any = {};
        if (productName) updateData.productName = productName;
        if (barcode !== undefined) updateData.barcode = barcode || null;
        if (dbQuantity !== undefined) updateData.quantity = dbQuantity;
        if (dbUnit) updateData.unit = dbUnit;
        if (mfgDate) updateData.mfgDate = new Date(mfgDate);

        if (expDate) {
            updateData.expDate = new Date(expDate);
            updateData.status = calculateExpiryStatus(expDate);
        }

        if (branch) updateData.branch = branch;
        if (notes !== undefined) updateData.notes = notes || null;

        const user = (req as any).user;

        // Security check: Check if the item exists and belongs to the user's branch
        const existingItem: any = await withTransactionRetry(() =>
            (prisma as any).inventoryItem.findUnique({
                where: { id: id }
            })
        );

        if (!existingItem) {
            res.status(404).json({ message: 'Item not found' });
            return;
        }

        if (user?.role !== 'Admin' && user?.branch !== 'all' && existingItem.branch !== user?.branch) {
            res.status(403).json({ message: 'Access denied: You cannot edit items from another branch.' });
            return;
        }

        // Prevent moving an item to another branch if not admin (and no global access)
        if (user?.role !== 'Admin' && user?.branch !== 'all' && branch && branch !== user?.branch) {
            res.status(403).json({ message: `Access denied: You cannot move items to ${branch}.` });
            return;
        }

        const item = await withTransactionRetry(() =>
            (prisma as any).inventoryItem.update({
                where: { id: id as string },
                data: updateData
            })
        );

        // SYNC TO CATALOG IF BARCODE IS PRESENT
        const catalogBarcode = barcode || existingItem.barcode;
        const catalogName = productName || existingItem.productName;
        const catalogUnit = dbUnit || existingItem.unit;

        if (catalogBarcode) {
            updateCatalogItem(catalogBarcode, catalogName, catalogUnit);
        }

        console.log(`[Inventory] Item updated: ${id}`);
        res.json(item);
    } catch (error: any) {
        sendErrorResponse(res, error, 'Unable to update inventory item.', 'Inventory Update');
    }
};

export const deleteItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const existingItem: any = await withTransactionRetry(() =>
            (prisma as any).inventoryItem.findUnique({
                where: { id: id }
            })
        );

        if (!existingItem) {
            res.status(404).json({ message: 'Item not found' });
            return;
        }

        if (user?.role !== 'Admin' && user?.branch !== 'all' && existingItem.branch !== user?.branch) {
            res.status(403).json({ message: 'Access denied: You cannot delete items from another branch.' });
            return;
        }

        await withTransactionRetry(() => (prisma as any).inventoryItem.delete({ where: { id: id as string } }));
        console.log(`[Inventory] Item deleted: ${id}`);
        res.json({ message: 'Item deleted successfully' });
    } catch (error: any) {
        sendErrorResponse(res, error, 'Unable to delete inventory item.', 'Inventory Delete');
    }
};
