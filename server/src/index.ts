import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import app from './app';
import { closeDatabase } from './prisma';
const PORT = process.env.PORT || 5000;

const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
    const clientBuildPath = path.join(__dirname, '../../dist');

    if (fs.existsSync(clientBuildPath)) {
        app.use(express.static(clientBuildPath));

        app.get('*', (req: any, res: any) => {
            res.sendFile(path.join(clientBuildPath, 'index.html'));
        });
    } else {
        console.warn(`[Static] Frontend build not found at ${clientBuildPath}. Skipping static asset hosting.`);
    }

    const server = app.listen(PORT, () => {
        console.log('--- SYSTEM STARTUP ---');
        console.log(`Server is running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });

    const shutdown = async (signal: string) => {
        console.log(`[SYSTEM] Received ${signal}. Shutting down gracefully...`);

        server.close(async () => {
            await closeDatabase();
            console.log('[SYSTEM] Shutdown complete.');
            process.exit(0);
        });

        setTimeout(() => {
            console.error('[SYSTEM] Forced shutdown after timeout.');
            process.exit(1);
        }, 10000).unref();
    };

    process.on('SIGINT', () => void shutdown('SIGINT'));
    process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

export default app;

