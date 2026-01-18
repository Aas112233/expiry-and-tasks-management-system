import { Request, Response } from 'express';
import prisma, { withTransactionRetry } from '../prisma';

/**
 * PRODUCTION BRANCH CONTROLLER
 * Fetches real branches with dynamic health statistics.
 */

export const getAllBranches = async (req: Request, res: Response): Promise<void> => {
    try {
        const branches = await withTransactionRetry(async () => {
            const list = await (prisma as any).branch.findMany({
                orderBy: { name: 'asc' }
            });

            // Augment each branch with real database statistics
            const branchesWithStats = await Promise.all(list.map(async (branch: any) => {
                const [employeeCount, activeTasks, criticalItems] = await Promise.all([
                    (prisma as any).user.count({
                        where: { branch: branch.name, status: 'Active' }
                    }),
                    (prisma as any).task.count({
                        where: { branch: branch.name, status: { not: 'Done' } }
                    }),
                    prisma.inventoryItem.count({
                        where: {
                            branch: branch.name,
                            status: { in: ['Critical', 'Expired'] }
                        }
                    })
                ]);

                return {
                    ...branch,
                    employeeCount,
                    activeTasks,
                    criticalItems
                };
            }));

            return branchesWithStats;
        });

        res.json(branches);
    } catch (error) {
        console.error('[Branches] Fetch error:', error);
        res.status(500).json({ message: 'Error fetching branches', error });
    }
};

export const createBranch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, address, phone, manager, status } = req.body;
        if (!name) {
            res.status(400).json({ message: 'Branch name is required' });
            return;
        }

        const newBranch = await withTransactionRetry(() =>
            (prisma as any).branch.create({
                data: {
                    name,
                    address: address || '',
                    phone: phone || '',
                    manager: manager || 'Unassigned',
                    status: status || 'Active'
                }
            })
        );
        res.status(201).json(newBranch);
    } catch (error) {
        res.status(500).json({ message: 'Error creating branch', error });
    }
};

export const updateBranch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updates = req.body;
        const branch = await withTransactionRetry(() =>
            (prisma as any).branch.update({
                where: { id },
                data: updates
            })
        );
        res.json(branch);
    } catch (error) {
        res.status(500).json({ message: 'Error updating branch', error });
    }
};

export const deleteBranch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // 1. Get branch details to find its name
        const branch: any = await withTransactionRetry(() =>
            (prisma as any).branch.findUnique({ where: { id } })
        );

        if (!branch) {
            res.status(404).json({ message: 'Branch not found' });
            return;
        }

        // 2. Check if any inventory items are associated with this branch name
        const itemCount = await withTransactionRetry<number>(() =>
            (prisma as any).inventoryItem.count({
                where: { branch: branch.name }
            })
        );

        if (itemCount > 0) {
            res.status(400).json({
                message: `Cannot delete branch '${branch.name}'. It contains ${itemCount} inventory items. Please move or delete the items first.`
            });
            return;
        }

        // 3. Proceed with deletion
        await withTransactionRetry(() => (prisma as any).branch.delete({ where: { id } }));
        res.json({ message: 'Branch deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting branch', error });
    }
};

export const syncBranches = async (req: Request, res: Response): Promise<void> => {
    try {
        const inventoryItems: any[] = await withTransactionRetry(() =>
            (prisma as any).inventoryItem.findMany({
                select: { branch: true },
                distinct: ['branch']
            })
        );

        const inventoryBranchNames = Array.from(new Set(
            inventoryItems
                .map((i: any) => i.branch?.trim())
                .filter(Boolean)
        ));

        // Find existing branches
        const existingBranches: any[] = await withTransactionRetry(() =>
            (prisma as any).branch.findMany({
                select: { name: true }
            })
        );

        const existingNamesLower = new Set(existingBranches.map((b: any) => b.name.toLowerCase().trim()));
        const missingNames = inventoryBranchNames.filter(name => !existingNamesLower.has(name!.toLowerCase()));

        if (missingNames.length === 0) {
            res.json({ message: 'All branches are already synced', created: 0 });
            return;
        }

        // Create missing branches
        await withTransactionRetry(() =>
            (prisma as any).branch.createMany({
                data: missingNames.map(name => ({
                    name: name!,
                    status: 'Active',
                    manager: 'Unassigned',
                    address: 'Auto-created from Inventory'
                }))
            })
        );

        res.json({
            message: `Successfully synced ${missingNames.length} branches`,
            created: missingNames.length,
            names: missingNames
        });

    } catch (error) {
        console.error('[Branches] Sync Error:', error);
        res.status(500).json({ message: 'Error syncing branches', error });
    }
};
