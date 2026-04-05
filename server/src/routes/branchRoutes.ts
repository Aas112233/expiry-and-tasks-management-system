
import express from 'express';
import {
    getAllBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    syncBranches
} from '../controllers/branchController';
import { authenticateToken, authorizePermission } from '../middleware/authMiddleware';

const router = express.Router();

// All branch routes require authentication
router.use(authenticateToken);

// Read routes
router.get('/', authorizePermission('Branches', 'read'), getAllBranches);

// Write routes
router.post('/', authorizePermission('Branches', 'write'), createBranch);
router.post('/sync', authorizePermission('Branches', 'write'), syncBranches);
router.put('/:id', authorizePermission('Branches', 'write'), updateBranch);
router.delete('/:id', authorizePermission('Branches', 'write'), deleteBranch);

export default router;
