import express from 'express';
import {
    getCatalogItemByBarcode,
    getAllCatalogItems,
    deleteCatalogItem,
    syncCatalogWithInventory,
    createCatalogItem,
    manualUpdateCatalogItem
} from '../controllers/catalogController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllCatalogItems);
router.post('/', createCatalogItem);
router.put('/:id', manualUpdateCatalogItem);
router.post('/sync-inventory', syncCatalogWithInventory);
router.get('/:barcode', getCatalogItemByBarcode);
router.delete('/:id', deleteCatalogItem);

export default router;
