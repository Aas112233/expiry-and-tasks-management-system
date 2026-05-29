import express from 'express';
import multer from 'multer';
import {
    getCatalogItemByBarcode,
    getAllCatalogItems,
    deleteCatalogItem,
    syncCatalogWithInventory,
    createCatalogItem,
    manualUpdateCatalogItem
} from '../controllers/catalogController';
import { importExcelCatalog } from '../controllers/catalogImportController';
import { authenticateToken } from '../middleware/authMiddleware';

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024 // 20MB limit for Excel files
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel',
            'application/octet-stream'
        ];
        if (allowedMimes.includes(file.mimetype) || file.originalname.endsWith('.xlsx') || file.originalname.endsWith('.xls')) {
            cb(null, true);
        } else {
            cb(new Error('Only .xlsx and .xls files are allowed'));
        }
    }
});

router.use(authenticateToken);

router.get('/', getAllCatalogItems);
router.post('/', createCatalogItem);
router.put('/:id', manualUpdateCatalogItem);
router.post('/sync-inventory', syncCatalogWithInventory);
router.post('/import-excel', upload.single('file'), importExcelCatalog);
router.get('/:barcode', getCatalogItemByBarcode);
router.delete('/:id', deleteCatalogItem);

export default router;
