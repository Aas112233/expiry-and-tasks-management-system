import { NextFunction, Request, Response } from 'express';
import { AppError, normalizeError } from '../lib/errors';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
    next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));
}

export function errorHandler(
    error: unknown,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    const normalized = normalizeError(error);
    const requestId = res.getHeader('X-Request-ID');

    if (normalized.statusCode >= 500) {
        console.error(`[HTTP ${req.method} ${req.originalUrl}]`, error);
    } else {
        console.warn(`[HTTP ${req.method} ${req.originalUrl}] ${normalized.code}: ${normalized.message}`);
    }

    res.status(normalized.statusCode).json({
        message: normalized.message,
        code: normalized.code,
        details: normalized.details,
        requestId
    });
}
