import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

/**
 * PRODUCTION AUTH CONTROLLER
 * Real database lookups and JWT generation.
 */

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }

        // 1. Find user in MongoDB
        const user = await (prisma as any).user.findUnique({
            where: { email },
            include: { modulePermissions: true }
        });

        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // 2. Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // 3. Generate JWT
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, branch: user.branch },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 4. Return user data (omit password)
        const { password: _, ...userData } = user;

        console.log(`[Auth] User logged in: ${user.email}`);
        res.json({
            token,
            user: userData
        });

    } catch (error) {
        console.error('[Auth] Login Error:', error);
        res.status(500).json({ message: 'Internal server error during login' });
    }
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email, password, branch, role } = req.body;

        if (!name || !email || !password || !branch) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }

        // 1. Check if user exists
        const existingUser = await (prisma as any).user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'Email already in use' });
            return;
        }

        // 2. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Create user in MongoDB
        const user = await (prisma as any).user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                branch,
                role: role || 'Staff',
                status: 'Active',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                permissions: JSON.stringify({ "Inventory": "read", "Tasks": "read" }) // Default permissions
            }
        });

        res.status(201).json({ message: 'User registered successfully', userId: user.id });

    } catch (error) {
        console.error('[Auth] Registration Error:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
};

export const verifyUser = async (req: any, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const user = await (prisma as any).user.findUnique({
            where: { id: userId },
            include: { modulePermissions: true }
        });
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const { password, ...userData } = user;
        res.json(userData);

    } catch (error) {
        res.status(500).json({ message: 'Error verifying session' });
    }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Logged out successfully' });
};
