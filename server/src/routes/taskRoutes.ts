import express from 'express';
import { getAllTasks, createTask, updateTask, deleteTask } from '../controllers/taskController';
import { authenticateToken, authorizePermission } from '../middleware/authMiddleware';

const router = express.Router();

router.use(authenticateToken);

router.get('/', authorizePermission('Tasks', 'read'), getAllTasks);
router.post('/', authorizePermission('Tasks', 'write'), createTask);
router.put('/:id', authorizePermission('Tasks', 'write'), updateTask);
router.delete('/:id', authorizePermission('Tasks', 'write'), deleteTask);

export default router;
