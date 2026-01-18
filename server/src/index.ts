process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import 'dotenv/config';
import express from 'express';
import path from 'path';
import cors from 'cors';
// import dotenv from 'dotenv'; // Removed
import authRoutes from './routes/authRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import taskRoutes from './routes/taskRoutes';

import employeeRoutes from './routes/employeeRoutes';
import branchRoutes from './routes/branchRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import backupRoutes from './routes/backupRoutes';

// ... 

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development
app.use(cors({
    origin: '*', // In production, replace with your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/backup', backupRoutes);

import prisma, { withTransactionRetry, initializeDb, dbStatus } from './prisma';

app.get('/api/health', async (req: any, res: any) => {
    try {
        if (dbStatus.isConnected) {
            // Triple check with a simple count for MongoDB
            await withTransactionRetry(() => prisma.inventoryItem.count());
            res.status(200).json({
                status: 'ok',
                database: 'connected',
                timestamp: new Date()
            });
        } else if (dbStatus.isInitializing) {
            res.status(503).json({
                status: 'initializing',
                database: 'connecting',
                message: 'Database is still warming up. Please wait.',
                timestamp: new Date()
            });
        } else {
            res.status(503).json({
                status: 'error',
                database: 'disconnected',
                error: dbStatus.error,
                timestamp: new Date()
            });
        }
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            timestamp: new Date(),
            error: (error as any).message
        });
    }
});

// Serve static files from the React frontend app
const clientBuildPath = path.join(__dirname, '../../dist');
app.use(express.static(clientBuildPath));

// Handle React routing, return all requests to React app
app.get('*', (req: any, res: any) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Start initialization and then listen
const startServer = async () => {
    console.log('--- SYSTEM STARTUP ---');
    // Start warming up the DB in the background so we don't block the WHOLE process if it takes 60s
    // but the endpoints will report 503 until it's ready.
    initializeDb();

    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
};

startServer();

