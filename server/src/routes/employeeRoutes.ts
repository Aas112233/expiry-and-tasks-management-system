import { Router } from 'express';
import { getAllEmployees, createEmployee, updateEmployee, deleteEmployee, resetPassword } from '../controllers/employeeController';
import { authenticateToken, authorizeRole, authorizePermission } from '../middleware/authMiddleware';

const router = Router();

router.use(authenticateToken);

router.get('/', getAllEmployees);
router.post('/', authorizePermission('Employees', 'write'), createEmployee);
router.put('/:id', authorizePermission('Employees', 'write'), updateEmployee);
router.delete('/:id', authorizePermission('Employees', 'write'), deleteEmployee);
router.post('/:id/reset-password', authorizePermission('Employees', 'write'), resetPassword);

export default router;
