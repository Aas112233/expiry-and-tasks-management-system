import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllTasks = async (req: Request, res: Response): Promise<void> => {
    try {
        const tasks = await prisma.task.findMany({
            include: {
                assignedTo: {
                    select: { name: true, avatar: true }
                }
            },
            orderBy: { dueDate: 'asc' }
        });

        // Transform to match frontend interface if needed
        // Currently frontend expects flat structure mostly.
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching tasks', error });
    }
};

export const createTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, priority, status, dueDate, branch, assignedToId, assignedTo } = req.body;

        const task = await prisma.task.create({
            data: {
                title,
                description,
                priority,
                status,
                dueDate: new Date(dueDate),
                branch,
                assignedToId: assignedToId || undefined,
                assigneeName: assignedTo || undefined // fallback
            }
        });
        res.status(201).json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error creating task', error });
    }
};

export const updateTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, priority, status, dueDate, branch, assignedToId, assignedTo } = req.body;

        const task = await prisma.task.update({
            where: { id: id as string },
            data: {
                title,
                description,
                priority,
                status,
                dueDate: dueDate ? new Date(dueDate) : undefined,
                branch,
                assignedToId,
                assigneeName: assignedTo // update text if provided
            }
        });
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: 'Error updating task', error });
    }
};

export const deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await prisma.task.delete({ where: { id: id as string } });
        res.json({ message: 'Task deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting task', error });
    }
};
