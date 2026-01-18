process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

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

export const dbStatus = {
    isConnected: false,
    isInitializing: false,
    error: null as string | null
};

export async function initializeDb() {
    if (dbStatus.isInitializing) return;
    dbStatus.isInitializing = true;

    // Mask the MongoDB URL for security in logs
    const maskedUrl = process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':****@');
    console.log(`[DB] Initializing MongoDB: ${maskedUrl}`);

    let retries = 5;
    let attempt = 1;

    while (retries > 0) {
        try {
            console.log(`[DB] Connection Attempt ${attempt}/5...`);
            await prisma.$connect();

            // Verification: MongoDB doesn't require table creation, but we check connectivity
            await prisma.inventoryItem.count();

            console.log('[DB] MongoDB connection established and verified.');
            dbStatus.isConnected = true;
            dbStatus.isInitializing = false;
            dbStatus.error = null;
            return true;
        } catch (error: any) {
            retries -= 1;
            attempt += 1;
            dbStatus.error = error.message;
            console.error(`[DB] MongoDB Connection failed: ${error.message}. Retries left: ${retries}`);

            if (retries === 0) {
                console.error('[DB] CRITICAL: Final MongoDB connection attempt failed.');
                dbStatus.isInitializing = false;
                return false;
            } else {
                await new Promise(res => setTimeout(res, 2000));
            }
        }
    }
    dbStatus.isInitializing = false;
    return false;
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
            if (!dbStatus.isConnected && !dbStatus.isInitializing) {
                await initializeDb();
            }
            return await operation();
        } catch (error: any) {
            lastError = error;
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

export default prisma;
