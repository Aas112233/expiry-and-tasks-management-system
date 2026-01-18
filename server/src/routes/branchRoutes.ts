
import express from 'express';
import {
    getAllBranches,
    createBranch,
    updateBranch,
    deleteBranch,
    syncBranches
} from '../controllers/branchController';

const router = express.Router();

router.get('/', getAllBranches);
router.post('/', createBranch);
router.post('/sync', syncBranches); // New sync endpoint
router.put('/:id', updateBranch);
router.delete('/:id', deleteBranch);

export default router;
