import express from 'express';
import { authenticateToken, authorizePermission } from '../middleware/authMiddleware';
import {
    syncInventory,
    syncTasks,
    getSyncMetadata,
    registerDevice,
    bulkUpdateInventory
} from '../controllers/mobileSyncController';
import { mobileHeaders } from '../lib/apiResponse';

const router = express.Router();

// All mobile routes require authentication
router.use(authenticateToken);
router.use(mobileHeaders);

// Sync endpoints
router.post('/sync/inventory', authorizePermission('Inventory', 'read'), syncInventory);
router.post('/sync/tasks', authorizePermission('Tasks', 'read'), syncTasks);
router.get('/sync/metadata', getSyncMetadata);

// Device management
router.post('/device/register', registerDevice);

// Bulk operations
router.post('/inventory/bulk', authorizePermission('Inventory', 'write'), bulkUpdateInventory);

export default router;
