import express from 'express';
import {
    register,
    login,
    verifyUser,
    logout,
    refreshSession,
} from '../controllers/authController';

import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshSession);
router.get('/me', authenticateToken, verifyUser);
router.post('/logout', authenticateToken, logout);

export default router;
