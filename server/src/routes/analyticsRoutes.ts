import express from 'express';
import { getDashboardStats, getExpiryTrends, getBranchDistribution } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

// Apply auth middleware to all analytics routes
router.use(authenticateToken);

router.get('/overview', getDashboardStats);
router.get('/trends', getExpiryTrends);
router.get('/branch-distribution', getBranchDistribution);

export default router;
