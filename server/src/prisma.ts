import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

/**
 * PRISMA MONGODB CONFIGURATION
 * Replaced SQLite/Postgres logic with MongoDB-compatible initialization.
 */
const prisma = new PrismaClient({
    log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'query', emit: 'event' },
    ],
});

export class DatabaseUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DatabaseUnavailableError';
    }
}

export const dbStatus = {
    isConnected: false,
    isInitializing: false,
    error: null as string | null
};

let initializationPromise: Promise<boolean> | null = null;

function hasMongoDatabaseName(connectionString?: string): boolean {
    if (!connectionString) {
        return false;
    }

    const match = connectionString.match(/^mongodb(?:\+srv)?:\/\/[^/]+\/([^?]+)/i);
    return !!match?.[1]?.trim();
}

function validateDatabaseUrl(): string | null {
    const url = process.env.DATABASE_URL;

    if (!url) {
        return 'DATABASE_URL is missing.';
    }

    if (!url.startsWith('mongodb://') && !url.startsWith('mongodb+srv://')) {
        return 'DATABASE_URL must be a MongoDB connection string.';
    }

    if (!hasMongoDatabaseName(url)) {
        return 'DATABASE_URL must include a database name, e.g. ...mongodb.net/expproappdb?...';
    }

    return null;
}

export async function ensureDatabaseReady(): Promise<void> {
    const ready = await initializeDb();
    if (!ready) {
        throw new DatabaseUnavailableError(
            dbStatus.error || 'Database is unavailable.'
        );
    }
}

export async function initializeDb() {
    if (dbStatus.isConnected) {
        return true;
    }

    if (initializationPromise) {
        return initializationPromise;
    }

    const validationError = validateDatabaseUrl();
    if (validationError) {
        dbStatus.isConnected = false;
        dbStatus.isInitializing = false;
        dbStatus.error = validationError;
        console.error(`[DB] Configuration error: ${validationError}`);
        return false;
    }

    dbStatus.isInitializing = true;
    dbStatus.error = null;

    // Mask the MongoDB URL for security in logs
    const maskedUrl = process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':****@');
    console.log(`[DB] Initializing MongoDB: ${maskedUrl}`);

    initializationPromise = (async () => {
        let retries = 5;
        let attempt = 1;

        while (retries > 0) {
            try {
                console.log(`[DB] Connection Attempt ${attempt}/5...`);
                await prisma.$connect();

                // Verification: MongoDB doesn't require table creation, but we check connectivity.
                await prisma.inventoryItem.count();

                console.log('[DB] MongoDB connection established and verified.');
                dbStatus.isConnected = true;
                dbStatus.isInitializing = false;
                dbStatus.error = null;
                return true;
            } catch (error: any) {
                retries -= 1;
                attempt += 1;
                dbStatus.isConnected = false;
                dbStatus.error = error.message;
                console.error(`[DB] MongoDB connection failed: ${error.message}. Retries left: ${retries}`);
                await prisma.$disconnect().catch(() => undefined);

                if (retries === 0) {
                    console.error('[DB] CRITICAL: Final MongoDB connection attempt failed.');
                    dbStatus.isInitializing = false;
                    return false;
                }

                await new Promise(res => setTimeout(res, 2000));
            }
        }

        dbStatus.isInitializing = false;
        return false;
    })();

    try {
        return await initializationPromise;
    } finally {
        initializationPromise = null;
    }
}

(prisma as any).$on('error', (e: any) => {
    console.error('[Prisma Error]:', e.message);
});

export async function withTransactionRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
): Promise<T> {
    let lastError;
    for (let i = 0; i < maxRetries; i++) {
        try {
            await ensureDatabaseReady();
            return await operation();
        } catch (error: any) {
            lastError = error;

            if (error instanceof DatabaseUnavailableError) {
                throw error;
            }

            console.warn(`[DB] Operation failed (Attempt ${i + 1}/${maxRetries}): ${error.message}`);

            if (i < maxRetries - 1) {
                await new Promise(res => setTimeout(res, 1000));
                continue;
            }
            throw error;
        }
    }
    throw lastError;
}

export async function closeDatabase(): Promise<void> {
    dbStatus.isConnected = false;
    dbStatus.isInitializing = false;
    initializationPromise = null;
    await prisma.$disconnect().catch(() => undefined);
}

export default prisma;
