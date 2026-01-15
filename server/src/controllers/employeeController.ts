import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ... imports

export const getAllEmployees = async (req: Request, res: Response): Promise<void> => {
    try {
        const employees = await prisma.user.findMany({
            select: {
                id: true,
                employeeId: true,
                name: true,
                email: true,
                role: true,
                branch: true,
                phone: true,
                avatar: true,
                status: true,
                permissions: true,
                lastActive: true
            }
        });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching employees', error });
    }
};

export const createEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, role, branch, phone, employeeId, password, status, permissions } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const plainPassword = password || 'defaultPassword123';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const employee = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                branch,
                phone,
                employeeId: employeeId || `EMP-${Math.floor(Math.random() * 10000)}`,
                status: status || 'Active',
                permissions, // Add permissions
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
            }
        });
        res.status(201).json(employee);
    } catch (error) {
        res.status(500).json({ message: 'Error creating employee', error });
    }
};

// ... update and delete remain same

export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, email, role, branch, status, permissions, phone, avatar } = req.body;

        // Construct clean update object
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;
        if (branch !== undefined) updateData.branch = branch;
        if (status !== undefined) updateData.status = status;
        if (permissions !== undefined) updateData.permissions = permissions;
        if (phone !== undefined) updateData.phone = phone;
        if (avatar !== undefined) updateData.avatar = avatar;

        const employee = await prisma.user.update({
            where: { id: String(id) },
            data: updateData
        });
        res.json(employee);
    } catch (error: any) {
        console.error("Error updating employee:", error);
        res.status(500).json({ message: 'Error updating employee', error: error.message });
    }
};

export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const loggedInUserId = (req as any).user?.id; // Access user from auth middleware

        if (loggedInUserId && loggedInUserId === id) {
            res.status(400).json({ message: 'You cannot delete your own account.' });
            return;
        }

        await prisma.user.delete({ where: { id: String(id) } });
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting employee', error });
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password || password.length < 6) {
            res.status(400).json({ message: 'Password must be at least 6 characters long' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.update({
            where: { id: String(id) },
            data: { password: hashedPassword }
        });

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Error resetting password', error });
    }
};
