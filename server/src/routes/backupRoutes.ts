
import express from 'express';
import multer from 'multer';
import { restoreBackup, restoreBatch, exportBackup } from '../controllers/backupController';
import { authenticateToken, authorizeRole, authorizePermission } from '../middleware/authMiddleware';
import { backupLimiter } from '../middleware/rateLimiter';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// Export backup (Admin only)
router.get('/export', authenticateToken, authorizeRole(['Admin']), exportBackup);

// Full file restore (Require authentication and write permission)
router.post('/restore', authenticateToken, authorizePermission('Settings', 'write'), upload.single('backupFile'), backupLimiter, restoreBackup);

// Batch restore (JSON payload) - Used for progress bar restoration
router.post('/restore-batch', authenticateToken, authorizePermission('Settings', 'write'), backupLimiter, restoreBatch);

export default router;
