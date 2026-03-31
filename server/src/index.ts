import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import app from './app';
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

    app.listen(PORT, () => {
        console.log('--- SYSTEM STARTUP ---');
        console.log(`Server is running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
}

export default app;

