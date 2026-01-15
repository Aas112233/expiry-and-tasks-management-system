import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, role, branch } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'User already exists' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: role || 'Staff',
                branch: branch || 'Main Branch'
            }
        });

        res.status(201).json({ message: 'User created successfully', userId: user.id });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const verifyUser = async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user.id; // Added by auth middleware
        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            branch: user.branch,
            permissions: user.permissions,
            avatar: user.avatar
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(400).json({ message: 'Invalid credentials' });
            return;
        }

        let permissionsObj = {};
        try {
            permissionsObj = user.permissions ? JSON.parse(user.permissions) : {};
        } catch (e) {
            console.error('Failed to parse permissions for token', e);
        }

        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                branch: user.branch,
                permissions: permissionsObj,
                tokenVersion: user.tokenVersion
            },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                branch: user.branch,
                permissions: user.permissions,
                avatar: user.avatar
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error });
    }
};

export const logout = async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (userId) {
            await prisma.user.update({
                where: { id: userId },
                data: { tokenVersion: { increment: 1 } }
            });
        }
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Logout failed', error });
    }
};
