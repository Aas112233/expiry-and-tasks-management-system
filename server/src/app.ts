import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import taskRoutes from './routes/taskRoutes';
import employeeRoutes from './routes/employeeRoutes';
import branchRoutes from './routes/branchRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import backupRoutes from './routes/backupRoutes';
import catalogRoutes from './routes/catalogRoutes';
import prisma, { withTransactionRetry, initializeDb, dbStatus } from './prisma';

const app = express();

const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set([
    'https://etms.gt.tc',
    'http://localhost:5173',
    'http://localhost:3000',
    ...configuredOrigins,
]);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }

        if (
            allowedOrigins.has(origin) ||
            origin.endsWith('.onrender.com') ||
            origin.endsWith('.vercel.app')
        ) {
            callback(null, true);
            return;
        }

        callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/branches', branchRoutes);

app.get('/api/health', async (req: any, res: any) => {
    try {
        if (dbStatus.isConnected) {
            await withTransactionRetry(() => prisma.inventoryItem.count());
            res.status(200).json({
                status: 'ok',
                database: 'connected',
                timestamp: new Date()
            });
            return;
        }

        if (dbStatus.isInitializing) {
            res.status(503).json({
                status: 'initializing',
                database: 'connecting',
                message: 'Database is still warming up. Please wait.',
                timestamp: new Date()
            });
            return;
        }

        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            error: dbStatus.error,
            timestamp: new Date()
        });
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

void initializeDb();

export default app;
