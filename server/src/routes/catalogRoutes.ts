import express from 'express';
import { getCatalogItemByBarcode } from '../controllers/catalogController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/:barcode', getCatalogItemByBarcode);

export default router;
