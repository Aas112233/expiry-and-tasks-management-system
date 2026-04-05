import express from 'express';
import {
    register,
    login,
    verifyUser,
    logout,
    refreshSession,
} from '../controllers/authController';

import { authenticateToken } from '../middleware/authMiddleware';
import { authLimiter } from '../middleware/rateLimiter';

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refreshSession);
router.get('/me', authenticateToken, verifyUser);
router.post('/logout', authenticateToken, logout);

export default router;
