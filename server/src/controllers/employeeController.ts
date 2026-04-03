import { Request, Response } from 'express';
import prisma, { withTransactionRetry } from '../prisma';
import * as bcrypt from 'bcryptjs';
import { sendErrorResponse } from '../lib/errors';

const syncPermissions = async (userId: string, permissionsJson: string | any) => {
    try {
        if (!permissionsJson) return;
        const perms = typeof permissionsJson === 'string' ? JSON.parse(permissionsJson) : permissionsJson;

        // Remove old permissions first
        await withTransactionRetry(() =>
            (prisma as any).userPermission.deleteMany({ where: { userId } })
        );

        // Create new ones
        const modules = Object.keys(perms);
        for (const module of modules) {
            const modPerms = perms[module];
            if (Array.isArray(modPerms)) {
                await withTransactionRetry(() =>
                    (prisma as any).userPermission.create({
                        data: {
                            userId,
                            module,
                            canRead: modPerms.includes('read') || modPerms.includes('write'),
                            canWrite: modPerms.includes('write')
                        }
                    })
                );
            }
        }
    } catch (e) {
        console.error("Failed to sync permissions:", e);
    }
};

export const getAllEmployees = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = (req as any).user;
        const where: any = {};

        if (user?.role !== 'Admin' && user?.branch !== 'all') {
            where.branch = user?.branch;
        }

        const employees = await withTransactionRetry(() =>
            prisma.user.findMany({
                where,
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
            })
        );
        res.json(employees);
    } catch (error) {
        sendErrorResponse(res, error, 'Unable to fetch employees.', 'Employees Fetch');
    }
};

export const createEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        let { name, email, role, branch, phone, employeeId, password, status, permissions } = req.body;
        email = email?.toLowerCase().trim();

        const existingUser: any = await withTransactionRetry(() =>
            prisma.user.findUnique({ where: { email } })
        );

        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const user = (req as any).user;
        if (user?.role !== 'Admin' && user?.branch !== 'all' && branch !== user?.branch) {
            res.status(403).json({ message: `Access denied: You can only create employees for ${user?.branch}.` });
            return;
        }

        const plainPassword = password || 'defaultPassword123';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const employee = await withTransactionRetry(() =>
            prisma.user.create({
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    role,
                    branch,
                    phone,
                    employeeId: employeeId || `EMP-${Math.floor(Math.random() * 10000)}`,
                    status: status || 'Active',
                    permissions,
                    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
                }
            })
        );

        // Sync to new table
        await syncPermissions(employee.id, permissions);

        res.status(201).json(employee);
    } catch (error) {
        sendErrorResponse(res, error, 'Unable to create employee.', 'Employees Create');
    }
};

export const updateEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        let { name, email, role, branch, status, permissions, phone, avatar } = req.body;

        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) {
            updateData.email = email.toLowerCase().trim();
        }
        if (role !== undefined) updateData.role = role;
        if (branch !== undefined) updateData.branch = branch;
        if (status !== undefined) updateData.status = status;
        if (permissions !== undefined) updateData.permissions = permissions;
        if (phone !== undefined) updateData.phone = phone;
        if (avatar !== undefined) updateData.avatar = avatar;

        const user = (req as any).user;

        const existingEmp: any = await withTransactionRetry(() =>
            (prisma as any).user.findUnique({
                where: { id: id }
            })
        );

        if (!existingEmp) {
            res.status(404).json({ message: 'Employee not found' });
            return;
        }

        if (user?.role !== 'Admin' && user?.branch !== 'all' && existingEmp.branch !== user?.branch) {
            res.status(403).json({ message: 'Access denied: You cannot edit employees from another branch.' });
            return;
        }

        if (user?.role !== 'Admin' && user?.branch !== 'all' && branch && branch !== user?.branch) {
            res.status(403).json({ message: `Access denied: You cannot move employees to ${branch}.` });
            return;
        }

        const employee = await withTransactionRetry(() =>
            prisma.user.update({
                where: { id: String(id) },
                data: updateData
            })
        );

        // Sync to new table
        if (permissions) {
            await syncPermissions(String(id), permissions);
        }

        res.json(employee);
    } catch (error: any) {
        sendErrorResponse(res, error, 'Unable to update employee.', 'Employees Update');
    }
};

export const deleteEmployee = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = (req as any).user;
        const loggedInUserId = (req as any).user?.id;

        const existingEmp: any = await withTransactionRetry(() =>
            (prisma as any).user.findUnique({
                where: { id: id }
            })
        );

        if (!existingEmp) {
            res.status(404).json({ message: 'Employee not found' });
            return;
        }

        if (loggedInUserId && loggedInUserId === id) {
            res.status(400).json({ message: 'You cannot delete your own account.' });
            return;
        }

        if (user?.role !== 'Admin' && user?.branch !== 'all' && existingEmp.branch !== user?.branch) {
            res.status(403).json({ message: 'Access denied: You cannot delete employees from another branch.' });
            return;
        }

        await withTransactionRetry(() =>
            prisma.user.delete({ where: { id: String(id) } })
        );
        res.json({ message: 'Employee deleted' });
    } catch (error) {
        sendErrorResponse(res, error, 'Unable to delete employee.', 'Employees Delete');
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

        await withTransactionRetry(() =>
            prisma.user.update({
                where: { id: String(id) },
                data: { password: hashedPassword }
            })
        );

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        sendErrorResponse(res, error, 'Unable to reset password.', 'Employees Reset Password');
    }
};

