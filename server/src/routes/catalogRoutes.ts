import express from 'express';
import { getCatalogItemByBarcode, getAllCatalogItems, deleteCatalogItem, syncCatalogWithInventory } from '../controllers/catalogController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllCatalogItems);
router.post('/sync-inventory', syncCatalogWithInventory);
router.get('/:barcode', getCatalogItemByBarcode);
router.delete('/:id', deleteCatalogItem);

export default router;
