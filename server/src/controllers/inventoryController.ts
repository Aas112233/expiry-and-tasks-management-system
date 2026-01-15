import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const items = await prisma.inventoryItem.findMany({
            orderBy: { expDate: 'asc' }
        });
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching inventory', error });
    }
};

export const createItem = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Received createItem body:', req.body);
        const { productName, barcode, quantity, remainingQty, unit, unitName, mfgDate, expDate, branch, status, notes } = req.body;

        // Frontend sends 'unitName', DB uses 'unit'. Map them.
        const dbUnit = unit || unitName || 'pcs';
        // Frontend sends 'remainingQty', DB uses 'quantity'. Map them.
        const dbQuantity = quantity !== undefined ? Number(quantity) : (remainingQty !== undefined ? Number(remainingQty) : undefined);

        if (!productName || dbQuantity === undefined || !mfgDate || !expDate || !branch) {
            console.error('Validation error: Missing required fields');
            res.status(400).json({ message: 'Missing required fields' });
            return;
        }

        const item = await prisma.inventoryItem.create({
            data: {
                productName,
                barcode,
                quantity: dbQuantity,
                unit: dbUnit,
                mfgDate: new Date(mfgDate),
                expDate: new Date(expDate),
                branch,
                status,
                notes
            }
        });
        console.log('Item created:', item);
        res.status(201).json(item);
    } catch (error) {
        console.error('Error creating item:', error);
        res.status(500).json({ message: 'Error creating item', error });
    }
};

export const updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { productName, barcode, quantity, remainingQty, unit, unitName, mfgDate, expDate, branch, status, notes } = req.body;

        const dbQuantity = quantity !== undefined ? Number(quantity) : (remainingQty !== undefined ? Number(remainingQty) : undefined);
        const dbUnit = unit || unitName;

        const item = await prisma.inventoryItem.update({
            where: { id: String(id) },
            data: {
                productName: productName as string,
                barcode: barcode as string | null,
                quantity: dbQuantity,
                unit: dbUnit as string,
                mfgDate: mfgDate ? new Date(mfgDate as string) : undefined,
                expDate: expDate ? new Date(expDate as string) : undefined,
                branch: branch as string,
                status: status as string,
                notes: notes as string | null
            }
        });
        res.json(item);
    } catch (error) {
        console.error('Error updating item:', error);
        res.status(500).json({ message: 'Error updating item', error });
    }
};

export const deleteItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await prisma.inventoryItem.delete({ where: { id: String(id) } });
        res.json({ message: 'Item deleted' });
    } catch (error) {
        console.error('Error deleting item:', error);
        res.status(500).json({ message: 'Error deleting item', error });
    }
};
