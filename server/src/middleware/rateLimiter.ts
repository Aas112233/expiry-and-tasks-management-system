import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate Limiting Configuration
 * Balanced for mobile apps (considers NAT/CGNAT scenarios)
 */

// General API rate limiter
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
    },
    keyGenerator: (req: Request) => {
        // Use API key or user ID if available, fallback to IP
        return (req.headers['x-api-key'] as string) ||
            (req as any).user?.id ||
            req.ip ||
            req.socket.remoteAddress ||
            'unknown';
    },
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            error: 'Too many requests, please try again later.',
            timestamp: new Date().toISOString()
        });
    }
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // Limit to 20 login attempts per window
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many login attempts, please try again later.',
        timestamp: new Date().toISOString()
    },
    handler: (req: Request, res: Response) => {
        res.status(429).json({
            success: false,
            error: 'Too many login attempts. Please wait 15 minutes before trying again.',
            timestamp: new Date().toISOString()
        });
    }
});

// Strict rate limiter for sensitive operations
export const strictLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit to 10 requests per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many sensitive operations, please try again later.',
        timestamp: new Date().toISOString()
    }
});

// Backup/restore operations limiter
export const backupLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit to 5 backup operations per hour
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Too many backup operations, please try again later.',
        timestamp: new Date().toISOString()
    }
});
