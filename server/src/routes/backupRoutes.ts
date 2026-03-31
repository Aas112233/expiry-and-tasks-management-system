
import express from 'express';
import multer from 'multer';
import { restoreBackup, restoreBatch } from '../controllers/backupController';

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    }
});

// Full file restore
router.post('/restore', upload.single('backupFile'), restoreBackup);

// Batch restore (JSON payload) - Used for progress bar restoration
router.post('/restore-batch', restoreBatch);

export default router;
