import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import prisma, { withTransactionRetry, ensureDatabaseReady } from '../prisma';
import { sendErrorResponse } from '../lib/errors';

interface ExcelRow {
    itemCode: string;
    itemName: string;
    itemUnitCode: string;
    unitType: number;
    unitName: string;
    unitFraction: string;
    costPrice: string;
    extraCodes: string | null;
    priceChannel3: string | null;
    allCodes: string | null;
}

interface ImportResult {
    success: boolean;
    created: number;
    updated: number;
    skipped: number;
    namesMerged: number;
    nameSlotsFullSkipped: number;
    totalProcessed: number;
    totalRows: number;
    errors: string[];
    durationMs: number;
}

interface SSEProgressEvent {
    phase: 'uploading' | 'parsing' | 'analyzing' | 'comparing' | 'creating' | 'updating' | 'complete' | 'error';
    message: string;
    progress: number;
    detail?: Record<string, any>;
}

// ---------------------------------------------------------------------------
// SSE Helper
// ---------------------------------------------------------------------------

function sendSSE(res: Response, event: SSEProgressEvent): void {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
}

// ---------------------------------------------------------------------------
// Excel Parsing (optimized — single pass, pre-allocated)
// ---------------------------------------------------------------------------

function parseExcelRows(buffer: Buffer): ExcelRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (rawData.length < 2) {
        throw new Error('Excel file is empty or has no data rows');
    }

    const headers = rawData[0];
    console.log('[CatalogImport] Excel headers:', headers);
    console.log(`[CatalogImport] Total data rows: ${rawData.length - 1}`);

    // Pre-allocate with estimated size to avoid array resizing
    const rows: ExcelRow[] = new Array(rawData.length - 1);
    let count = 0;

    for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || !row[0] || !row[1]) continue;

        rows[count++] = {
            itemCode: String(row[0] || '').trim(),
            itemName: String(row[1] || '').trim(),
            itemUnitCode: String(row[2] || '').trim(),
            unitType: Number(row[3]) || 0,
            unitName: String(row[4] || '').trim(),
            unitFraction: String(row[5] || '').trim(),
            costPrice: String(row[6] || '').trim(),
            extraCodes: row[7] ? String(row[7]).trim() : null,
            priceChannel3: row[8] ? String(row[8]).trim() : null,
            allCodes: row[9] ? String(row[9]).trim() : null,
        };
    }

    // Trim to actual count
    rows.length = count;
    return rows;
}

// ---------------------------------------------------------------------------
// Barcode Extraction & Map Building
// ---------------------------------------------------------------------------

function extractBarcodes(row: ExcelRow): string[] {
    if (row.allCodes) {
        return row.allCodes
            .split('|')
            .map(code => code.trim())
            .filter(code => code.length > 0);
    }
    if (row.itemUnitCode) {
        return [row.itemUnitCode];
    }
    return [];
}

interface BarcodeEntry {
    productName: string;
    unitName: string;
    unitFraction: string;
    itemCode: string;
    unit: string;
}

function buildBarcodeMap(rows: ExcelRow[]): Map<string, BarcodeEntry> {
    const map = new Map<string, BarcodeEntry>();

    for (const row of rows) {
        const barcodes = extractBarcodes(row);
        for (const barcode of barcodes) {
            if (!map.has(barcode)) {
                map.set(barcode, {
                    productName: row.itemName,
                    unitName: row.unitName,
                    unitFraction: row.unitFraction,
                    itemCode: row.itemCode,
                    unit: row.unitName || 'pcs',
                });
            }
        }
    }

    return map;
}

// ---------------------------------------------------------------------------
// Chunked DB Query — Only fetch items matching Excel barcodes
// ---------------------------------------------------------------------------

interface ExistingCatalogItem {
    id: string;
    barcode: string;
    productName: string;
    productName2: string | null;
    productName3: string | null;
    unit: string;
    unitName: string | null;
    unitFraction: string | null;
    itemCode: string | null;
    source: string | null;
}

const CATALOG_SELECT = {
    id: true,
    barcode: true,
    productName: true,
    productName2: true,
    productName3: true,
    unit: true,
    unitName: true,
    unitFraction: true,
    itemCode: true,
    source: true,
} as const;

/**
 * Fetch only the catalog items whose barcodes appear in the Excel data.
 * Uses chunked IN-queries (1000 per chunk) to avoid oversized queries.
 */
async function fetchMatchingCatalogItems(
    barcodes: string[],
    safeSend: (event: SSEProgressEvent) => void
): Promise<ExistingCatalogItem[]> {
    const CHUNK = 1000;
    const allItems: ExistingCatalogItem[] = [];

    for (let i = 0; i < barcodes.length; i += CHUNK) {
        const chunk = barcodes.slice(i, i + CHUNK);
        const items: ExistingCatalogItem[] = await (prisma as any).productCatalog.findMany({
            where: { barcode: { in: chunk } },
            select: CATALOG_SELECT,
        });
        allItems.push(...items);

        // Progress within comparing phase (40 → 50)
        const chunkProgress = 40 + Math.round(((i + chunk.length) / barcodes.length) * 10);
        safeSend({
            phase: 'comparing',
            message: `Loaded ${allItems.length.toLocaleString()} matching records...`,
            progress: Math.min(chunkProgress, 50),
            detail: { loaded: allItems.length, chunks: Math.ceil(barcodes.length / CHUNK) },
        });
    }

    return allItems;
}

// ---------------------------------------------------------------------------
// Main Import Handler (SSE Streaming)
// ---------------------------------------------------------------------------

export const importExcelCatalog = async (req: Request, res: Response): Promise<void> => {
    // SSE setup
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    let clientDisconnected = false;
    req.on('close', () => { clientDisconnected = true; });

    const safeSend = (event: SSEProgressEvent) => {
        if (!clientDisconnected) sendSSE(res, event);
    };

    const startTime = Date.now();

    try {
        if (!req.file) {
            safeSend({ phase: 'error', message: 'No file uploaded. Please upload an .xlsx file.', progress: 0 });
            res.end();
            return;
        }

        const fileName = req.file.originalname;
        const fileSize = (req.file.size / 1024).toFixed(1);
        console.log(`[CatalogImport] Received file: ${fileName} (${fileSize} KB)`);

        // Ensure DB is ready once at the start (not per-query)
        await ensureDatabaseReady();

        // ── Phase: Uploading ──
        safeSend({
            phase: 'uploading',
            message: `File received: ${fileName}`,
            progress: 5,
            detail: { fileName, fileSize: `${fileSize} KB` },
        });

        // ── Phase: Parsing ──
        safeSend({ phase: 'parsing', message: 'Parsing Excel spreadsheet...', progress: 10 });

        const rows = parseExcelRows(req.file.buffer);
        console.log(`[CatalogImport] Parsed ${rows.length} valid rows from Excel`);

        safeSend({
            phase: 'parsing',
            message: `Parsed ${rows.length.toLocaleString()} valid rows`,
            progress: 25,
            detail: { rowCount: rows.length },
        });

        // ── Phase: Analyzing ──
        safeSend({ phase: 'analyzing', message: 'Extracting unique barcodes...', progress: 30 });

        const barcodeMap = buildBarcodeMap(rows);
        const barcodeList = Array.from(barcodeMap.keys());
        console.log(`[CatalogImport] Extracted ${barcodeList.length} unique barcodes`);

        safeSend({
            phase: 'analyzing',
            message: `Extracted ${barcodeList.length.toLocaleString()} unique barcodes`,
            progress: 35,
            detail: { uniqueBarcodes: barcodeList.length, totalRows: rows.length },
        });

        // ── Phase: Comparing ──
        safeSend({ phase: 'comparing', message: 'Fetching matching catalog records...', progress: 40 });

        // Only fetch items whose barcodes appear in the Excel — not the entire catalog
        const existingItems = await fetchMatchingCatalogItems(barcodeList, safeSend);

        // Build barcode → item lookup
        const existingByBarcode = new Map<string, ExistingCatalogItem>();
        for (const item of existingItems) {
            existingByBarcode.set(item.barcode, item);
        }

        console.log(`[CatalogImport] Found ${existingItems.length} matching catalog items`);

        safeSend({
            phase: 'comparing',
            message: `Comparing ${barcodeList.length.toLocaleString()} barcodes against ${existingByBarcode.size.toLocaleString()} existing...`,
            progress: 50,
            detail: { existingItems: existingItems.length, existingBarcodes: existingByBarcode.size },
        });

        // ── Diff Logic (pure CPU — fast) ──
        const result: ImportResult = {
            success: true,
            created: 0,
            updated: 0,
            skipped: 0,
            namesMerged: 0,
            nameSlotsFullSkipped: 0,
            totalProcessed: barcodeMap.size,
            totalRows: rows.length,
            errors: [],
            durationMs: 0,
        };

        const itemsToCreate: any[] = [];
        const itemsToUpdate: { id: string; data: any }[] = [];

        for (const [barcode, excelEntry] of barcodeMap) {
            const existing = existingByBarcode.get(barcode);

            if (existing) {
                const existingNames = [
                    existing.productName?.trim().toLowerCase(),
                    existing.productName2?.trim().toLowerCase(),
                    existing.productName3?.trim().toLowerCase(),
                ].filter(Boolean) as string[];

                const incomingName = excelEntry.productName.trim();
                const incomingNameLower = incomingName.toLowerCase();

                if (existingNames.includes(incomingNameLower)) {
                    // Same name — only update empty metadata fields
                    const updateData: any = {};
                    if (!existing.unitName && excelEntry.unitName) updateData.unitName = excelEntry.unitName;
                    if (!existing.unitFraction && excelEntry.unitFraction) updateData.unitFraction = excelEntry.unitFraction;
                    if (!existing.itemCode && excelEntry.itemCode) updateData.itemCode = excelEntry.itemCode;

                    if (Object.keys(updateData).length > 0) {
                        itemsToUpdate.push({ id: existing.id, data: updateData });
                        result.updated++;
                    } else {
                        result.skipped++;
                    }
                } else {
                    // Different name — merge into available slot
                    const updateData: any = {};

                    if (!existing.productName2) {
                        updateData.productName2 = incomingName;
                        result.namesMerged++;
                    } else if (!existing.productName3) {
                        updateData.productName3 = incomingName;
                        result.namesMerged++;
                    } else {
                        result.nameSlotsFullSkipped++;
                    }

                    if (!existing.unitName && excelEntry.unitName) updateData.unitName = excelEntry.unitName;
                    if (!existing.unitFraction && excelEntry.unitFraction) updateData.unitFraction = excelEntry.unitFraction;
                    if (!existing.itemCode && excelEntry.itemCode) updateData.itemCode = excelEntry.itemCode;

                    if (Object.keys(updateData).length > 0) {
                        itemsToUpdate.push({ id: existing.id, data: updateData });
                        result.updated++;
                    } else {
                        result.skipped++;
                    }
                }
            } else {
                itemsToCreate.push({
                    barcode,
                    productName: excelEntry.productName,
                    unit: excelEntry.unit,
                    unitName: excelEntry.unitName || null,
                    unitFraction: excelEntry.unitFraction || null,
                    itemCode: excelEntry.itemCode || null,
                    source: 'smacc-import',
                });
                result.created++;
            }
        }

        console.log(`[CatalogImport] Batch summary — Create: ${itemsToCreate.length}, Update: ${itemsToUpdate.length}, Skip: ${result.skipped}`);

        safeSend({
            phase: 'comparing',
            message: `Analysis complete — ${itemsToCreate.length} to create, ${itemsToUpdate.length} to update, ${result.skipped} unchanged`,
            progress: 55,
            detail: { toCreate: itemsToCreate.length, toUpdate: itemsToUpdate.length, skipped: result.skipped },
        });

        // ── Phase: Creating ──
        const totalWriteOps = itemsToCreate.length + itemsToUpdate.length;
        let completedWriteOps = 0;

        const calcWriteProgress = () => 60 + Math.round((completedWriteOps / Math.max(totalWriteOps, 1)) * 35);

        if (itemsToCreate.length > 0) {
            safeSend({
                phase: 'creating',
                message: `Creating ${itemsToCreate.length.toLocaleString()} new catalog entries...`,
                progress: 58,
                detail: { created: 0, total: itemsToCreate.length },
            });

            // Chunked createMany with skipDuplicates to avoid entire-batch failure
            const CREATE_CHUNK = 500;
            let totalCreated = 0;

            for (let i = 0; i < itemsToCreate.length; i += CREATE_CHUNK) {
                const chunk = itemsToCreate.slice(i, i + CREATE_CHUNK);

                try {
                    const createResult = await (prisma as any).productCatalog.createMany({
                        data: chunk,
                        skipDuplicates: true,
                    });
                    totalCreated += createResult.count;
                } catch (chunkError: any) {
                    // If chunked createMany fails, fall back to individual for this chunk only
                    console.warn(`[CatalogImport] Chunk create failed (${i}-${i + chunk.length}), falling back:`, chunkError.message);
                    for (const item of chunk) {
                        try {
                            await (prisma as any).productCatalog.create({ data: item });
                            totalCreated++;
                        } catch (singleErr: any) {
                            result.errors.push(`Create failed for barcode ${item.barcode}: ${singleErr.message}`);
                            result.created--;
                        }
                    }
                }

                completedWriteOps += chunk.length;
                safeSend({
                    phase: 'creating',
                    message: `Created ${totalCreated.toLocaleString()} of ${itemsToCreate.length.toLocaleString()} entries`,
                    progress: calcWriteProgress(),
                    detail: { created: totalCreated, total: itemsToCreate.length },
                });
            }

            console.log(`[CatalogImport] Created ${totalCreated}/${itemsToCreate.length} items`);
        } else {
            safeSend({
                phase: 'creating',
                message: 'No new entries to create',
                progress: 70,
                detail: { created: 0, total: 0 },
            });
        }

        // ── Phase: Updating ──
        if (itemsToUpdate.length > 0) {
            safeSend({
                phase: 'updating',
                message: `Updating ${itemsToUpdate.length.toLocaleString()} existing entries...`,
                progress: calcWriteProgress(),
                detail: { updated: 0, total: itemsToUpdate.length },
            });

            // Group updates by identical data payload so we can batch them
            const updateGroups = groupUpdatesByData(itemsToUpdate);
            let updatedSoFar = 0;

            // Build individual Prisma update functions
            const operationsList: {
                idsCount: number;
                run: () => Promise<any>;
                fallback: () => Promise<number>;
            }[] = [];

            for (const group of updateGroups) {
                if (group.ids.length === 1) {
                    operationsList.push({
                        idsCount: 1,
                        run: () => (prisma as any).productCatalog.update({
                            where: { id: group.ids[0] },
                            data: { ...group.data, updatedAt: new Date() },
                        }),
                        fallback: async () => {
                            try {
                                await (prisma as any).productCatalog.update({
                                    where: { id: group.ids[0] },
                                    data: { ...group.data, updatedAt: new Date() },
                                });
                                return 1;
                            } catch (singleErr: any) {
                                result.errors.push(`Update failed for ID ${group.ids[0]}: ${singleErr.message}`);
                                return 0;
                            }
                        }
                    });
                } else {
                    operationsList.push({
                        idsCount: group.ids.length,
                        run: () => (prisma as any).productCatalog.updateMany({
                            where: { id: { in: group.ids } },
                            data: { ...group.data, updatedAt: new Date() },
                        }),
                        fallback: async () => {
                            let successCount = 0;
                            for (const id of group.ids) {
                                try {
                                    await (prisma as any).productCatalog.update({
                                        where: { id },
                                        data: { ...group.data, updatedAt: new Date() },
                                    });
                                    successCount++;
                                } catch (singleErr: any) {
                                    result.errors.push(`Update failed for ID ${id}: ${singleErr.message}`);
                                }
                            }
                            return successCount;
                        }
                    });
                }
            }

            const CONCURRENCY_LIMIT = 30; // Run up to 30 updates/batches in parallel to fully utilize connection pool
            for (let i = 0; i < operationsList.length; i += CONCURRENCY_LIMIT) {
                const batch = operationsList.slice(i, i + CONCURRENCY_LIMIT);

                // Execute this batch concurrently
                const promises = batch.map(async (op) => {
                    try {
                        await op.run();
                        return op.idsCount;
                    } catch (err: any) {
                        console.warn(`[CatalogImport] Batch operation failed, executing fallback:`, err.message);
                        return await op.fallback();
                    }
                });

                const results = await Promise.all(promises);
                const batchUpdatedCount = results.reduce((sum, count) => sum + count, 0);

                updatedSoFar += batchUpdatedCount;
                completedWriteOps += batch.reduce((sum, op) => sum + op.idsCount, 0);

                // Send progress updates
                safeSend({
                    phase: 'updating',
                    message: `Updated ${updatedSoFar.toLocaleString()} of ${itemsToUpdate.length.toLocaleString()} entries`,
                    progress: calcWriteProgress(),
                    detail: { updated: updatedSoFar, total: itemsToUpdate.length },
                });
            }

            console.log(`[CatalogImport] Updated ${updatedSoFar}/${itemsToUpdate.length} items`);
        } else {
            safeSend({
                phase: 'updating',
                message: 'No entries to update',
                progress: 95,
                detail: { updated: 0, total: 0 },
            });
        }

        // ── Phase: Complete ──
        result.durationMs = Date.now() - startTime;
        console.log(`[CatalogImport] Import complete in ${(result.durationMs / 1000).toFixed(1)}s:`, result);

        safeSend({
            phase: 'complete',
            message: `Import completed in ${(result.durationMs / 1000).toFixed(1)}s`,
            progress: 100,
            detail: { ...result },
        });

        res.end();
    } catch (error: any) {
        console.error('[CatalogImport] Import failed:', error);
        safeSend({
            phase: 'error',
            message: error.message || 'Import failed unexpectedly.',
            progress: 0,
        });
        res.end();
    }
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Group updates that share identical data payloads so they can be
 * executed as a single `updateMany` instead of N individual updates.
 *
 * For example, if 200 items all need { unitName: "box" } added,
 * that becomes one `updateMany({ where: { id: { in: [...200 ids] } }, data: ... })`
 * instead of 200 separate update calls.
 */
function groupUpdatesByData(
    items: { id: string; data: any }[]
): { ids: string[]; data: any }[] {
    const groupMap = new Map<string, { ids: string[]; data: any }>();

    for (const item of items) {
        // Create a stable key from the data object
        const key = JSON.stringify(item.data, Object.keys(item.data).sort());

        const existing = groupMap.get(key);
        if (existing) {
            existing.ids.push(item.id);
        } else {
            groupMap.set(key, { ids: [item.id], data: item.data });
        }
    }

    return Array.from(groupMap.values());
}
