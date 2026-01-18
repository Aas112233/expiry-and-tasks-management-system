import { Request, Response } from 'express';
import prisma from '../prisma';

export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const today = new Date();

        // Use a 30-day window for "Expiring Soon"
        const next30Days = new Date();
        next30Days.setDate(today.getDate() + 30);

        const user = (req as any).user;
        const where: any = {};
        const taskWhere: any = {};

        if (user?.role !== 'Admin' && user?.branch !== 'all') {
            where.branch = user?.branch;
            taskWhere.branch = user?.branch;
        }

        // Run queries in parallel for efficiency
        const [
            totalInventory,
            totalTasks,
            expiringSoon,
            pendingTasks
        ] = await Promise.all([
            prisma.inventoryItem.count({ where }),
            (prisma as any).task.count({ where: taskWhere }),
            prisma.inventoryItem.count({
                where: {
                    ...where,
                    expDate: {
                        gte: today,
                        lte: next30Days
                    },
                    status: { not: 'Expired' }
                }
            }),
            (prisma as any).task.count({
                where: {
                    ...taskWhere,
                    status: { in: ['Open', 'In Progress'] }
                }
            })
        ]);

        res.json({
            overview: [
                { title: 'Total Inventory', value: totalInventory.toString(), trend: '+5%', color: 'from-blue-500 to-cyan-400' },
                { title: 'Expiring Soon', value: expiringSoon.toString(), trend: '+12%', color: 'from-orange-500 to-red-400' },
                { title: 'Total Tasks', value: totalTasks.toString(), trend: '+8%', color: 'from-purple-500 to-pink-400' },
                { title: 'Pending Tasks', value: pendingTasks.toString(), trend: '-2%', color: 'from-green-500 to-emerald-400' }
            ]
        });

    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats', error });
    }
};

export const getExpiryTrends = async (req: Request, res: Response): Promise<void> => {
    try {
        const today = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(today.getDate() + 30);

        const user = (req as any).user;
        const where: any = {};
        if (user?.role !== 'Admin' && user?.branch !== 'all') {
            where.branch = user?.branch;
        }

        // Fetch items expiring in the next 30 days
        const items = await prisma.inventoryItem.findMany({
            where: {
                ...where,
                expDate: {
                    gte: today,
                    lte: thirtyDaysLater
                }
            },
            select: {
                expDate: true
            }
        });

        // Group by date (YYYY-MM-DD)
        const trendMap = new Map<string, number>();

        // Initialize map for the next 30 days to ensure a continuous line chart
        for (let i = 0; i < 30; i++) {
            const d = new Date();
            d.setDate(today.getDate() + i);
            const key = d.toISOString().split('T')[0];
            trendMap.set(key, 0);
        }

        items.forEach(item => {
            // expDate from Prisma is a Date object. Convert to YYYY-MM-DD
            const dateStr = item.expDate.toISOString().split('T')[0];
            if (trendMap.has(dateStr)) {
                trendMap.set(dateStr, trendMap.get(dateStr)! + 1);
            }
        });

        const formatted = Array.from(trendMap.entries()).map(([date, count]) => ({
            date,
            count
        })).sort((a, b) => a.date.localeCompare(b.date));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching trends', error });
    }
};

export const getBranchDistribution = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;

        // If not Admin (and no global access), they only see one branch anyway
        if (user?.role !== 'Admin' && user?.branch !== 'all') {
            const count = await prisma.inventoryItem.count({
                where: { branch: user.branch }
            });
            res.json([{ name: user.branch, value: count }]);
            return;
        }

        // Group inventory count by branch
        const distribution = await prisma.inventoryItem.groupBy({
            by: ['branch'],
            _count: {
                id: true
            }
        });

        // Format for Recharts { name, value }
        const formatted = distribution.map(item => ({
            name: item.branch,
            value: item._count.id
        }));

        res.json(formatted);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching branch distribution', error });
    }
};
