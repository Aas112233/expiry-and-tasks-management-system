import { Request, Response } from 'express';
import prisma, { withTransactionRetry } from '../prisma';

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
 * PRODUCTION INVENTORY CONTROLLER
 * Real database interactions with automatic status computation.
 */

export const getAllItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const where: any = {};

        // Non-admins can only see their own branch (unless they have global access 'all')
        if (user?.role !== 'Admin' && user?.branch !== 'all') {
            where.branch = user?.branch;
        }

        const items = await withTransactionRetry(() =>
            prisma.inventoryItem.findMany({
                where,
                orderBy: { createdAt: 'desc' }
            })
        );
        res.json(items);
    } catch (error) {
        console.error('[Inventory] Fetch error:', error);
        res.status(500).json({ message: 'Error fetching inventory', error });
    }
};

export const createItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            productName, barcode, quantity, remainingQty,
            unit, unitName, mfgDate, expDate, branch, notes
        } = req.body;

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
            prisma.inventoryItem.create({
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

        console.log(`[Inventory] Item created: ${productName} (${computedStatus})`);
        res.status(201).json(item);
    } catch (error: any) {
        console.error('[Inventory] Create error:', error);
        res.status(500).json({ message: 'Error creating item', error: error.message });
    }
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const {
            productName, barcode, quantity, remainingQty,
            unit, unitName, mfgDate, expDate, branch, notes
        } = req.body;

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
        const existingItem = await (prisma as any).inventoryItem.findUnique({
            where: { id: id }
        });

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
            prisma.inventoryItem.update({
                where: { id: id as string },
                data: updateData
            })
        );

        console.log(`[Inventory] Item updated: ${id}`);
        res.json(item);
    } catch (error: any) {
        console.error('[Inventory] Update error:', error);
        res.status(500).json({ message: 'Error updating item', error: error.message });
    }
};

export const deleteItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const existingItem = await (prisma as any).inventoryItem.findUnique({
            where: { id: id }
        });

        if (!existingItem) {
            res.status(404).json({ message: 'Item not found' });
            return;
        }

        if (user?.role !== 'Admin' && user?.branch !== 'all' && existingItem.branch !== user?.branch) {
            res.status(403).json({ message: 'Access denied: You cannot delete items from another branch.' });
            return;
        }

        await withTransactionRetry(() => prisma.inventoryItem.delete({ where: { id: id as string } }));
        console.log(`[Inventory] Item deleted: ${id}`);
        res.json({ message: 'Item deleted successfully' });
    } catch (error: any) {
        console.error('[Inventory] Delete error:', error);
        res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
};
