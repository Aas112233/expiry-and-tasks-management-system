import { Request, Response } from 'express';
import prisma, { withTransactionRetry } from '../prisma';
import { paginatedResponse, errorResponse } from '../lib/apiResponse';

/**
 * Mobile Sync Controller
 * Provides delta sync endpoints optimized for mobile apps
 * Allows efficient data synchronization without downloading full dataset
 */

interface SyncRequest {
    lastSyncedAt: string; // ISO date string
    branch?: string;
}

/**
 * Sync inventory items changed after lastSyncedAt
 */
export const syncInventory = async (req: Request, res: Response) => {
    try {
        const { lastSyncedAt, branch }: SyncRequest = req.body;

        if (!lastSyncedAt) {
            errorResponse(res, 'lastSyncedAt is required', 400);
            return;
        }

        const syncDate = new Date(lastSyncedAt);
        if (isNaN(syncDate.getTime())) {
            errorResponse(res, 'Invalid lastSyncedAt date format', 400);
            return;
        }

        // Build query filter
        const whereClause: any = {
            updatedAt: { gt: syncDate }
        };

        // Apply branch filter if provided and user is not admin
        const user = (req as any).user;
        if (branch && user?.role !== 'Admin') {
            whereClause.branch = branch;
        } else if (user?.branch && user?.branch !== 'all' && user?.role !== 'Admin') {
            whereClause.branch = user.branch;
        }

        // Fetch updated/created items
        const items: any[] = await withTransactionRetry(() =>
            (prisma as any).inventoryItem.findMany({
                where: whereClause,
                orderBy: { updatedAt: 'desc' }
            })
        );

        // Get current server time for next sync
        const serverTime = new Date();

        res.json({
            success: true,
            data: {
                items,
                serverTime: serverTime.toISOString(),
                totalCount: items.length
            },
            timestamp: serverTime.toISOString()
        });

    } catch (error: any) {
        console.error('[Mobile Sync] Inventory sync error:', error);
        errorResponse(res, 'Failed to sync inventory data', 500);
    }
};

/**
 * Sync tasks changed after lastSyncedAt
 */
export const syncTasks = async (req: Request, res: Response) => {
    try {
        const { lastSyncedAt, branch }: SyncRequest = req.body;

        if (!lastSyncedAt) {
            errorResponse(res, 'lastSyncedAt is required', 400);
            return;
        }

        const syncDate = new Date(lastSyncedAt);
        if (isNaN(syncDate.getTime())) {
            errorResponse(res, 'Invalid lastSyncedAt date format', 400);
            return;
        }

        // Build query filter
        const whereClause: any = {
            updatedAt: { gt: syncDate }
        };

        // Apply branch filter if provided and user is not admin
        const user = (req as any).user;
        if (branch && user?.role !== 'Admin') {
            whereClause.branch = branch;
        } else if (user?.branch && user?.branch !== 'all' && user?.role !== 'Admin') {
            whereClause.branch = user.branch;
        }

        // Fetch updated/created tasks
        const tasks: any[] = await withTransactionRetry(() =>
            (prisma as any).task.findMany({
                where: whereClause,
                orderBy: { updatedAt: 'desc' }
            })
        );

        const serverTime = new Date();

        res.json({
            success: true,
            data: {
                tasks,
                serverTime: serverTime.toISOString(),
                totalCount: tasks.length
            },
            timestamp: serverTime.toISOString()
        });

    } catch (error: any) {
        console.error('[Mobile Sync] Tasks sync error:', error);
        errorResponse(res, 'Failed to sync tasks data', 500);
    }
};

/**
 * Full sync metadata (branches, counts, etc.)
 */
export const getSyncMetadata = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;

        // Get branch list
        let branches: any[] = await withTransactionRetry(() =>
            (prisma as any).branch.findMany({
                where: { status: 'Active' },
                select: { id: true, name: true, status: true }
            })
        );

        // Get counts
        const inventoryCount = await withTransactionRetry(() =>
            (prisma as any).inventoryItem.count({
                where: user?.branch && user?.branch !== 'all' && user?.role !== 'Admin'
                    ? { branch: user.branch }
                    : {}
            })
        );

        const tasksCount = await withTransactionRetry(() =>
            (prisma as any).task.count({
                where: user?.branch && user?.branch !== 'all' && user?.role !== 'Admin'
                    ? { branch: user.branch }
                    : {}
            })
        );

        const catalogCount = await withTransactionRetry(() =>
            (prisma as any).productCatalog.count()
        );

        const serverTime = new Date();

        res.json({
            success: true,
            data: {
                serverTime: serverTime.toISOString(),
                counts: {
                    inventory: inventoryCount,
                    tasks: tasksCount,
                    branches: branches.length,
                    catalog: catalogCount
                },
                branches,
                userBranch: user?.branch || null,
                userRole: user?.role || null
            },
            timestamp: serverTime.toISOString()
        });

    } catch (error: any) {
        console.error('[Mobile Sync] Metadata sync error:', error);
        errorResponse(res, 'Failed to sync metadata', 500);
    }
};

/**
 * Register device for push notifications (future-ready)
 */
export const registerDevice = async (req: Request, res: Response) => {
    try {
        const { deviceToken, platform, deviceId }: { deviceToken: string; platform: string; deviceId: string } = req.body;

        if (!deviceToken || !platform || !deviceId) {
            errorResponse(res, 'deviceToken, platform, and deviceId are required', 400);
            return;
        }

        // TODO: Store device token in database for push notifications
        // For now, just acknowledge registration
        console.log(`[Mobile Sync] Device registered: ${deviceId} (${platform})`);

        res.json({
            success: true,
            data: {
                deviceId,
                platform,
                registeredAt: new Date().toISOString()
            },
            message: 'Device registered successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Mobile Sync] Device registration error:', error);
        errorResponse(res, 'Failed to register device', 500);
    }
};

/**
 * Bulk operations for mobile efficiency
 */
export const bulkUpdateInventory = async (req: Request, res: Response) => {
    try {
        const { operations } = req.body;

        if (!operations || !Array.isArray(operations)) {
            errorResponse(res, 'operations array is required', 400);
            return;
        }

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        };

        for (const operation of operations) {
            try {
                const { type: opType, id: itemId, data: updateData } = operation;

                if (!opType || !itemId) {
                    results.failed++;
                    results.errors.push(`Operation missing type or id: ${JSON.stringify(operation)}`);
                    continue;
                }

                if (opType === 'update') {
                    await withTransactionRetry(() =>
                        (prisma as any).inventoryItem.update({
                            where: { id: itemId },
                            data: updateData
                        })
                    );
                    results.success++;
                } else if (opType === 'delete') {
                    await withTransactionRetry(() =>
                        (prisma as any).inventoryItem.delete({
                            where: { id: itemId }
                        })
                    );
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push(`Unknown operation type: ${opType}`);
                }
            } catch (opError: any) {
                results.failed++;
                results.errors.push(`Failed ${operation.type} on ${operation.id}: ${opError.message}`);
            }
        }

        res.json({
            success: true,
            data: results,
            message: `Bulk operation completed: ${results.success} succeeded, ${results.failed} failed`,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('[Mobile Sync] Bulk update error:', error);
        errorResponse(res, 'Bulk operation failed', 500);
    }
};
