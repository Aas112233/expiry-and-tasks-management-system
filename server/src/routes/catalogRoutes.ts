import express from 'express';
import { getCatalogItemByBarcode, getAllCatalogItems, deleteCatalogItem } from '../controllers/catalogController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllCatalogItems);
router.get('/:barcode', getCatalogItemByBarcode);
router.delete('/:id', deleteCatalogItem);

export default router;
