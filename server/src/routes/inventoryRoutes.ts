import express from 'express';
import { getAllItems, createItem, updateItem, deleteItem } from '../controllers/inventoryController';
import { authenticateToken, authorizePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizePermission('Inventory', 'read'), getAllItems);
router.post('/', authorizePermission('Inventory', 'write'), createItem);
router.put('/:id', authorizePermission('Inventory', 'write'), updateItem);
router.delete('/:id', authorizePermission('Inventory', 'write'), deleteItem);

export default router;
