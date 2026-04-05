import { Request, Response, NextFunction } from 'express';

/**
 * Standardized API Response Format
 * Optimized for mobile app consumption
 */

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    pagination?: PaginationMeta;
    meta?: Record<string, any>;
    timestamp: string;
    requestId?: string;
}

export interface PaginationMeta {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

/**
 * Success response helper
 */
export const successResponse = <T>(
    res: Response,
    data: T,
    message?: string,
    statusCode: number = 200
): Response => {
    return res.status(statusCode).json({
        success: true,
        data,
        message,
        timestamp: new Date().toISOString(),
        requestId: (res as any).req?.requestId
    });
};

/**
 * Paginated response helper
 */
export const paginatedResponse = <T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    meta?: Record<string, any>
): Response => {
    return res.status(200).json({
        success: true,
        data,
        pagination,
        meta,
        timestamp: new Date().toISOString(),
        requestId: (res as any).req?.requestId
    });
};

/**
 * Error response helper
 */
export const errorResponse = (
    res: Response,
    message: string,
    statusCode: number = 400,
    error?: string
): Response => {
    return res.status(statusCode).json({
        success: false,
        error: message,
        message: error,
        timestamp: new Date().toISOString(),
        requestId: (res as any).req?.requestId
    });
};

/**
 * Middleware to add mobile-compatible headers
 */
export const mobileHeaders = (req: Request, res: Response, next: NextFunction) => {
    // Add CORS headers for mobile (if needed)
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
};
