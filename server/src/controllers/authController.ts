import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';
const ACCESS_TOKEN_TTL = '24h';
const REFRESH_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

const signAccessToken = (user: any): string =>
    jwt.sign(
        { id: user.id, email: user.email, role: user.role, branch: user.branch },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_TTL }
    );

const sanitizeUser = (user: any) => {
    const { password, ...userData } = user;
    return userData;
};

const buildAuthResponse = (user: any) => {
    const token = signAccessToken(user);
    const decoded = jwt.decode(token) as jwt.JwtPayload | null;

    return {
        token,
        expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        user: sanitizeUser(user)
    };
};

export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        let { email, password } = req.body;
        email = email?.toLowerCase().trim();

        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }

        const user = await (prisma as any).user.findUnique({
            where: { email },
            include: { modulePermissions: true }
        });

        if (!user) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        console.log(`[Auth] User logged in: ${user.email}`);
        res.json(buildAuthResponse(user));
    } catch (error) {
        console.error('[Auth] Login Error:', error);
        res.status(500).json({ message: 'Internal server error during login' });
    }
};

export const refreshSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (!token) {
            res.status(401).json({ message: 'Refresh token is missing.' });
            return;
        }

        const decoded = jwt.verify(token, JWT_SECRET, {
            ignoreExpiration: true
        }) as jwt.JwtPayload;

        if (!decoded?.id) {
            res.status(401).json({ message: 'Refresh token is invalid.' });
            return;
        }

        if (decoded.exp) {
            const expirationTime = decoded.exp * 1000;
            if (Date.now() - expirationTime > REFRESH_GRACE_PERIOD_MS) {
                res.status(401).json({ message: 'Session refresh window has expired. Please log in again.' });
                return;
            }
        }

        const user = await (prisma as any).user.findUnique({
            where: { id: decoded.id },
            include: { modulePermissions: true }
        });

        if (!user) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        res.json(buildAuthResponse(user));
    } catch (error) {
        console.error('[Auth] Refresh Error:', error);
        res.status(401).json({ message: 'Unable to refresh the session. Please log in again.' });
    }
};

export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        let { name, email, password, branch, role } = req.body;
        email = email?.toLowerCase().trim();

        if (!name || !email || !password || !branch) {
            res.status(400).json({ message: 'All fields are required' });
            return;
        }

        const existingUser = await (prisma as any).user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ message: 'Email already in use' });
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await (prisma as any).user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                branch,
                role: role || 'Staff',
                status: 'Active',
                avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
                permissions: JSON.stringify({ Inventory: 'read', Tasks: 'read' })
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

        res.json(sanitizeUser(user));
    } catch (error) {
        res.status(500).json({ message: 'Error verifying session' });
    }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
    res.json({ message: 'Logged out successfully' });
};
