import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
        branch: string;
        permissions?: Record<string, string[]>;
    };
}

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        res.status(401).json({ message: 'Access denied: No token provided' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

        // Check token version against database (for global logout support)
        if (decoded.id) {
            const user = await prisma.user.findUnique({
                where: { id: decoded.id },
                select: { tokenVersion: true }
            });

            if (!user) {
                res.status(403).json({ message: 'User not found' });
                return;
            }

            // If token doesn't have a version (legacy) or versions mismatch
            // We can allow legacy tokens if we want, but enforced versioning is better.
            // Assuming new tokens have version. 
            // If DB version > token version, then token is invalid.
            const tokenVersion = decoded.tokenVersion || 0;
            if (tokenVersion !== (user.tokenVersion || 0)) {
                res.status(403).json({ message: 'Session expired (Logged out from another device)' });
                return;
            }
        }

        req.user = decoded;
        next();
    } catch (error) {
        res.status(403).json({ message: 'Invalid or expired token' });
    }
};

export const authorizeRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            console.log(`[AuthMiddleware] Access denied for user role: ${req.user?.role}. Required roles: ${roles.join(', ')}`);
            res.status(403).json({ message: 'Access denied: Insufficient permissions' });
            return;
        }
        next();
    };
};

export const authorizePermission = (module: string, action: string) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        const user = req.user;
        if (!user) {
            res.status(403).json({ message: 'Access denied: No user found' });
            return;
        }

        // Admin always allowed
        if (user.role === 'Admin') {
            next();
            return;
        }

        // Check Permissions
        // Ensure permissions exist and include the requested action for the module
        if (user.permissions && user.permissions[module] && user.permissions[module].includes(action)) {
            next();
            return;
        }

        console.log(`[AuthMiddleware] Permission denied. Role: ${user.role}, Module: ${module}, Action: ${action}`);
        res.status(403).json({ message: 'Access denied: Insufficient permissions' });
    };
};
