import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { DatabaseUnavailableError } from '../prisma';

export class AppError extends Error {
    statusCode: number;
    code: string;
    details?: unknown;

    constructor(statusCode: number, message: string, code = 'APP_ERROR', details?: unknown) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

type NormalizedError = {
    statusCode: number;
    code: string;
    message: string;
    details?: unknown;
};

export function normalizeError(error: unknown, fallbackMessage = 'Internal server error'): NormalizedError {
    if (error instanceof AppError) {
        return {
            statusCode: error.statusCode,
            code: error.code,
            message: error.message,
            details: error.details
        };
    }

    if (error instanceof DatabaseUnavailableError) {
        return {
            statusCode: 503,
            code: 'DATABASE_UNAVAILABLE',
            message: error.message
        };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
            return {
                statusCode: 409,
                code: 'CONFLICT',
                message: 'A record with the same unique value already exists.',
                details: error.meta
            };
        }

        if (error.code === 'P2025') {
            return {
                statusCode: 404,
                code: 'NOT_FOUND',
                message: 'The requested record was not found.',
                details: error.meta
            };
        }

        return {
            statusCode: 400,
            code: error.code,
            message: error.message
        };
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        return {
            statusCode: 400,
            code: 'VALIDATION_ERROR',
            message: 'The request payload is invalid.'
        };
    }

    if (error instanceof Error) {
        return {
            statusCode: 500,
            code: 'INTERNAL_SERVER_ERROR',
            message: fallbackMessage,
            details: error.message
        };
    }

    return {
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: fallbackMessage
    };
}

export function sendErrorResponse(
    res: Response,
    error: unknown,
    fallbackMessage: string,
    context: string
): void {
    const normalized = normalizeError(error, fallbackMessage);

    if (normalized.statusCode >= 500) {
        console.error(`[${context}]`, error);
    } else {
        console.warn(`[${context}] ${normalized.code}: ${normalized.message}`);
    }

    res.status(normalized.statusCode).json({
        message: normalized.message,
        code: normalized.code,
        details: normalized.details
    });
}
