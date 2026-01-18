import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const filePath = 'D:\\DOWNLOADS\\inventory_backup_20260117_120945.json';

interface OldProduct {
    id: number;
    productName: string;
    branchName: string;
    productType: string;
    barcode: string;
    batch: string;
    initialQuantity: number;
    currentQuantity: number;
    mfgDate: number;
    expireDate: number;
    createdAt: number;
    isExpired: boolean;
}

interface BackupData {
    backup_date: number;
    version: string;
    products: OldProduct[];
}

function determineStatus(expDate: Date): string {
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return 'Expired';
    } else if (diffDays <= 30) {
        return 'Critical';
    } else {
        return 'Active';
    }
}

async function main() {
    try {
        console.log(`Reading file from ${filePath}...`);
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found at ${filePath}`);
        }

        const rawData = fs.readFileSync(filePath, 'utf-8');
        const data: BackupData = JSON.parse(rawData);

        console.log(`Found ${data.products.length} products to import.`);

        // Fetch existing imported items to avoid duplicates
        console.log(`Fetching existing imported items to avoid duplicates...`);
        const existingItems = await prisma.inventoryItem.findMany({
            where: { notes: { contains: "Imported from backup. Old ID:" } },
            select: { notes: true }
        });

        const existingIds = new Set<string>();
        existingItems.forEach(item => {
            const match = item.notes?.match(/Old ID: (\d+)/);
            if (match) {
                existingIds.add(match[1]);
            }
        });
        console.log(`Found ${existingIds.size} existing items in DB.`);

        const validItems = [];

        for (const product of data.products) {
            if (existingIds.has(String(product.id))) {
                continue;
            }
            try {
                const mfgDate = new Date(product.mfgDate);
                const expDate = new Date(product.expireDate);
                const createdAt = new Date(product.createdAt);

                if (isNaN(mfgDate.getTime()) || isNaN(expDate.getTime()) || isNaN(createdAt.getTime())) {
                    console.warn(`Skipping product ${product.productName} (ID: ${product.id}) due to invalid dates.`);
                    continue;
                }

                const status = determineStatus(expDate);
                const unit = product.productType || "pcs";

                validItems.push({
                    productName: product.productName,
                    barcode: product.barcode,
                    quantity: product.currentQuantity,
                    unit: unit,
                    mfgDate: mfgDate,
                    expDate: expDate,
                    branch: product.branchName,
                    status: status,
                    notes: `Imported from backup. Old ID: ${product.id}`,
                    createdAt: createdAt,
                    updatedAt: new Date()
                });
            } catch (e) {
                console.warn(`Skipping product ${product.productName} due to error:`, e);
            }
        }

        console.log(`Preparing to bulk insert ${validItems.length} items...`);

        // Bulk insert all at once
        const result = await prisma.inventoryItem.createMany({
            data: validItems
        });

        console.log(`Finished import. Total successfully imported: ${result.count}`);

    } catch (error) {
        console.error("Error executing import script:", error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
