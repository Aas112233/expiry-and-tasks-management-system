import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey123';

interface AuthRequest extends Request {
    user?: any;
}

/**
 * PRODUCTION AUTHENTICATION MIDDLEWARE
 * Verifies JWT and handles role/permission enforcement.
 */

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.warn(`[Auth Middleware] Missing token for ${req.method} ${req.originalUrl}`);
        res.status(401).json({ message: 'Authentication required. Please log in.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error: any) {
        console.error('[Auth Middleware] Token verification failed:', error.message);
        res.status(403).json({ message: 'Session expired or invalid. Please log in again.' });
    }
};

export const authorizeRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ message: 'Access denied: Insufficient permissions for this role.' });
            return;
        }
        next();
    };
};

/**
 * Granular Permission Checker
 * Checks if the user's permission set (stored in DB/JWT) allows the action.
 */
export const authorizePermission = (module: string, action: 'read' | 'write') => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        const user = req.user;

        // 1. Admins have absolute access
        if (user?.role === 'Admin') {
            return next();
        }

        try {
            // 2. Check the new UserPermission table (Source of Truth)
            const dbPermission = await (prisma as any).userPermission.findFirst({
                where: {
                    userId: user.id,
                    module: module
                }
            });

            if (dbPermission) {
                const hasAccess = action === 'write' ? dbPermission.canWrite : (dbPermission.canRead || dbPermission.canWrite);
                if (hasAccess) return next();
            }

            // 3. Fallback to Legacy JSON Permissions (for existing users/JWTs)
            const permissions = typeof user?.permissions === 'string'
                ? JSON.parse(user.permissions)
                : user?.permissions;

            if (permissions) {
                const modP = permissions[module];
                if (Array.isArray(modP)) {
                    if (modP.includes(action)) return next();
                    if (action === 'read' && modP.includes('write')) return next();
                } else if (typeof modP === 'string') {
                    // Handle case where it was stored as a single string
                    if (modP === action || (action === 'read' && modP === 'write')) return next();
                }
            }

            console.warn(`[Auth] Permission denied for user ${user.email} on ${module}:${action}`);
            res.status(403).json({ message: `Access denied: You do not have ${action} permission for ${module}.` });
        } catch (e) {
            console.error('[Auth] Permission check error:', e);
            res.status(403).json({ message: 'Access denied: Permission check failed.' });
        }
    };
};
