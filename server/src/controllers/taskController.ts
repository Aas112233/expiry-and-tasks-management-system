import { Request, Response } from 'express';
import prisma, { withTransactionRetry } from '../prisma';
import { sendErrorResponse } from '../lib/errors';

/**
 * PAGINATED TASK CONTROLLER
 * Real database interactions with user-assignee synchronization and pagination.
 */

export const getAllTasks = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const where: any = {};

        // Parse pagination params
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // Parse filter params
        const search = req.query.search as string;
        const status = req.query.status as string;
        const priority = req.query.priority as string;
        const branchFilter = req.query.branch as string;
        const assignedToId = req.query.assignedToId as string;

        if (user?.role !== 'Admin' && user?.branch !== 'all') {
            where.branch = user?.branch;
        } else if (branchFilter && branchFilter !== 'all') {
            where.branch = branchFilter;
        }

        // Add search filter
        if (search) {
            where.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { assigneeName: { contains: search, mode: 'insensitive' } }
            ];
        }

        // Add status filter
        if (status && status !== 'all') {
            where.status = status;
        }

        // Add priority filter
        if (priority && priority !== 'all') {
            where.priority = priority;
        }

        // Add assignee filter
        if (assignedToId && assignedToId !== 'all') {
            where.assignedToId = assignedToId;
        }

        // Get total count for pagination
        const totalCount = await withTransactionRetry<number>(() =>
            (prisma as any).task.count({ where }) as Promise<number>
        );

        const tasks = await withTransactionRetry(() =>
            (prisma as any).task.findMany({
                where,
                include: {
                    assignedTo: {
                        select: { name: true, avatar: true }
                    }
                },
                orderBy: { dueDate: 'asc' },
                skip,
                take: limit
            })
        );

        res.json({
            tasks,
            pagination: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit),
                hasNextPage: page * limit < totalCount,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        sendErrorResponse(res, error, 'Unable to fetch tasks.', 'Tasks Fetch');
    }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, priority, status, dueDate, branch, assignedToId, assignedTo } = req.body;

        if (!title || !dueDate || !branch) {
            res.status(400).json({ message: 'Title, Due Date, and Branch are required.' });
            return;
        }

        const user = (req as any).user;
        if (user?.role !== 'Admin' && user?.branch !== 'all' && branch !== user?.branch) {
            res.status(403).json({ message: `Access denied: You can only create tasks for ${user?.branch}.` });
            return;
        }

        let assigneeName = assignedTo;

        // If assignedToId is provided, let's fetch the user to ensure assigneeName is correct
        if (assignedToId) {
            const user: any = await withTransactionRetry(() =>
                (prisma as any).user.findUnique({ where: { id: assignedToId } })
            );
            if (user) {
                assigneeName = user.name;
            }
        }

        const task = await withTransactionRetry(() =>
            (prisma as any).task.create({
                data: {
                    title,
                    description: description || null,
                    priority: priority || 'Medium',
                    status: status || 'Open',
                    dueDate: new Date(dueDate),
                    branch,
                    assignedToId: assignedToId || null,
                    assigneeName: assigneeName || 'Unassigned'
                }
            })
        );

        console.log(`[Tasks] Task created: ${title}`);
        res.status(201).json(task);
    } catch (error: any) {
        sendErrorResponse(res, error, 'Unable to create task.', 'Tasks Create');
    }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, priority, status, dueDate, branch, assignedToId, assignedTo } = req.body;

        const updateData: any = {};
        if (title) updateData.title = title;
        if (description !== undefined) updateData.description = description || null;
        if (priority) updateData.priority = priority;
        if (status) updateData.status = status;
        if (dueDate) updateData.dueDate = new Date(dueDate);
        if (branch) updateData.branch = branch;

        if (assignedToId !== undefined) {
            updateData.assignedToId = assignedToId || null;
            if (assignedToId) {
                const user: any = await withTransactionRetry(() =>
                    (prisma as any).user.findUnique({ where: { id: assignedToId } })
                );
                if (user) {
                    updateData.assigneeName = user.name;
                }
            } else if (assignedTo) {
                updateData.assigneeName = assignedTo;
            } else {
                updateData.assigneeName = 'Unassigned';
            }
        } else if (assignedTo !== undefined) {
            updateData.assigneeName = assignedTo || 'Unassigned';
        }

        const user = (req as any).user;

        const existingTask: any = await withTransactionRetry(() =>
            (prisma as any).task.findUnique({
                where: { id: id }
            })
        );

        if (!existingTask) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        if (user?.role !== 'Admin' && user?.branch !== 'all' && existingTask.branch !== user?.branch) {
            res.status(403).json({ message: 'Access denied: You cannot edit tasks from another branch.' });
            return;
        }

        if (user?.role !== 'Admin' && user?.branch !== 'all' && branch && branch !== user?.branch) {
            res.status(403).json({ message: `Access denied: You cannot move tasks to ${branch}.` });
            return;
        }

        const task = await withTransactionRetry(() =>
            (prisma as any).task.update({
                where: { id: id },
                data: updateData
            })
        );

        console.log(`[Tasks] Task updated: ${id}`);
        res.json(task);
    } catch (error: any) {
        sendErrorResponse(res, error, 'Unable to update task.', 'Tasks Update');
    }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;

        const existingTask: any = await withTransactionRetry(() =>
            (prisma as any).task.findUnique({
                where: { id: id }
            })
        );

        if (!existingTask) {
            res.status(404).json({ message: 'Task not found' });
            return;
        }

        if (user?.role !== 'Admin' && user?.branch !== 'all' && existingTask.branch !== user?.branch) {
            res.status(403).json({ message: 'Access denied: You cannot delete tasks from another branch.' });
            return;
        }

        await withTransactionRetry(() => (prisma as any).task.delete({ where: { id: id } }));
        console.log(`[Tasks] Task deleted: ${id}`);
        res.json({ message: 'Task deleted successfully' });
    } catch (error: any) {
        sendErrorResponse(res, error, 'Unable to delete task.', 'Tasks Delete');
    }
};
