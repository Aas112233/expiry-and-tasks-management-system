import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { randomUUID } from 'crypto';
import authRoutes from './routes/authRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import taskRoutes from './routes/taskRoutes';
import employeeRoutes from './routes/employeeRoutes';
import branchRoutes from './routes/branchRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import backupRoutes from './routes/backupRoutes';
import catalogRoutes from './routes/catalogRoutes';
import mobileRoutes from './routes/mobileRoutes';
import { generalLimiter } from './middleware/rateLimiter';
import { mobileHeaders } from './lib/apiResponse';
import prisma, {
    DatabaseUnavailableError,
    withTransactionRetry,
    initializeDb,
    dbStatus
} from './prisma';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

const configuredOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const allowedOrigins = new Set([
    'https://etms.gt.tc',
    'https://expiry-and-tasks-management-system.vercel.app',
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

        callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use((req: any, res, next) => {
    const requestId = req.headers['x-request-id']?.toString() || randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
});

app.use(morgan(process.env.NODE_ENV === 'production'
    ? ':method :url :status :response-time ms req_id=:req[x-request-id]'
    : 'dev'));

// Apply general rate limiter
app.use('/api/', generalLimiter);

// Add mobile-compatible security headers
app.use('/api/', mobileHeaders);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use('/api', async (req: any, res: any, next: any) => {
    if (req.path === '/health') {
        next();
        return;
    }

    const ready = await initializeDb();
    if (ready) {
        next();
        return;
    }

    res.status(503).json({
        message: 'Database is unavailable. Please try again shortly.',
        database: dbStatus.isInitializing ? 'connecting' : 'disconnected',
        error: dbStatus.error
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/mobile', mobileRoutes);

app.get('/api/health', async (req: any, res: any) => {
    try {
        const ready = await initializeDb();

        if (ready) {
            await withTransactionRetry(() => prisma.inventoryItem.count());
            res.status(200).json({
                status: 'ok',
                database: 'connected',
                timestamp: new Date()
            });
            return;
        }

        res.status(503).json({
            status: 'error',
            database: dbStatus.isInitializing ? 'connecting' : 'disconnected',
            error: dbStatus.error,
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Health check failed:', error);
        res.status(error instanceof DatabaseUnavailableError ? 503 : 503).json({
            status: 'error',
            database: 'disconnected',
            timestamp: new Date(),
            error: (error as any).message
        });
    }
});

app.get('/', (_req, res) => {
    res.status(200).json({
        name: 'Expiry System Backend',
        status: 'online',
        health: '/api/health'
    });
});

app.get(['/favicon.ico', '/favicon.png'], (_req, res) => {
    res.status(204).end();
});

if (process.env.VERCEL !== '1') {
    void initializeDb();
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
